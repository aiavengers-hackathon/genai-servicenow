/**
 * INCIDENT ORCHESTRATOR
 * 
 * End-to-end incident management orchestration:
 * - Receive issue
 * - Triage and classify
 * - Self-heal if possible
 * - Create incident if needed
 * - Assign to group
 * - Notify stakeholders
 * - Track resolution
 */

const TriageEngine = require("./triageEngine");
const WorkflowEngine = require("./workflowEngine");
const IncidentService = require("../services/servicenow/incident.service");
const NotificationEngine = require("./notificationEngine");
const SessionStore = require("../memory/sessionStore");
const logger = require("../utils/logger");

class IncidentOrchestrator {
  /**
   * ORCHESTRATE ENTIRE INCIDENT LIFECYCLE
   */
  async orchestrateIncident(userMessage, user) {
    try {
      logger.info("Starting incident orchestration", { userId: user.id });

      // Get or create session
      const session = SessionStore.getSession(user.id);
      SessionStore.addMessage(user.id, userMessage, "user");

      // Step 1: Triage
      const triageResult = await TriageEngine.process(userMessage, user);

      logger.debug("Triage completed", { type: triageResult.type });

      // Step 2: Handle based on triage result
      let orchestrationResponse;

      switch (triageResult.type) {
        case "SELF_HEAL":
          orchestrationResponse = await this._handleSelfHeal(triageResult, user);
          break;

        case "KB_QUERY":
          orchestrationResponse = await this._handleKBResponse(triageResult, user);
          break;

        case "ACCESS_REQUEST":
        case "SERVICE_REQUEST":
          orchestrationResponse = await this._handleServiceRequest(triageResult, user);
          break;

        case "KNOWN_OUTAGE":
          orchestrationResponse = await this._handleKnownOutage(triageResult, user);
          break;

        case "READY_TO_CREATE_INCIDENT":
          orchestrationResponse = await this._handleIncidentCreation(triageResult, user);
          break;

        default:
          orchestrationResponse = triageResult;
      }

      // Store in session
      SessionStore.addMessage(user.id, JSON.stringify(orchestrationResponse), "assistant");
      SessionStore.updateContext(user.id, {
        lastTriageResult: triageResult,
        lastOrchestrationResponse: orchestrationResponse,
      });

      logger.info("Orchestration completed", { type: orchestrationResponse.type });

      return orchestrationResponse;
    } catch (error) {
      logger.error("Orchestration error", { error: error.message, userId: user.id });

      // Send error response but don't crash
      return {
        type: "ERROR",
        message:
          "An error occurred processing your request. A support team member has been notified.",
        errorId: logger.generateErrorId(),
      };
    }
  }

  /**
   * HANDLE SELF-HEAL (KB SOLUTION FOUND)
   */
  async _handleSelfHeal(triageResult, user) {
    logger.info("Self-heal response triggered", { userId: user.id });

    // Track that we offered KB solutions
    SessionStore.setAwaitingConfirmation(
      user.id,
      "Did these solutions help resolve your issue?"
    );

    return {
      type: "SELF_HEAL_OFFERED",
      escalationPrompt: "Still not working?",
      articles: triageResult.solutions,
      message: triageResult.message,
      offerEscalation: true,
    };
  }

  /**
   * HANDLE KB RESPONSE
   */
  async _handleKBResponse(triageResult, user) {
    logger.debug("KB response", { userId: user.id });

    SessionStore.trackApplication(user.id, triageResult.articles[0]?.title || "Unknown");

    return {
      type: "KB_ARTICLES",
      articles: triageResult.articles,
      message: triageResult.message,
    };
  }

  /**
   * HANDLE SERVICE REQUEST
   */
  async _handleServiceRequest(triageResult, user) {
    logger.debug("Service request handling", { userId: user.id });

    SessionStore.setWorkflow(user.id, {
      type: "SERVICE_REQUEST",
      items: triageResult.catalogItems,
    });

    return {
      type: "SERVICE_REQUEST_OPTIONS",
      catalogItems: triageResult.catalogItems,
      message: triageResult.message,
      requestSelection: true,
    };
  }

  /**
   * HANDLE KNOWN OUTAGE
   */
  async _handleKnownOutage(triageResult, user) {
    logger.info("Known outage detected", { userId: user.id });

    // Notify incident commander
    await NotificationEngine.notifyIncidentCommander({
      type: "KNOWN_OUTAGE_REPORTED",
      incidents: triageResult.incidents,
      reportedBy: user.id,
    });

    return {
      type: "KNOWN_OUTAGE",
      incidents: triageResult.incidents,
      message: triageResult.message,
      tracking: {
        incidentNumbers: triageResult.incidents.map((i) => i.number),
      },
    };
  }

  /**
   * HANDLE INCIDENT CREATION
   */
  async _handleIncidentCreation(triageResult, user) {
    logger.info("Ready to create incident", { userId: user.id });

    // Ask for confirmation
    SessionStore.setAwaitingConfirmation(user.id, "Should I create this incident?");

    return {
      type: "INCIDENT_CONFIRMATION",
      incident: triageResult.incident,
      priority: triageResult.priority,
      message: triageResult.message,
      confirmationNeeded: true,
      createButton: {
        label: "Create Incident",
        action: "CREATE_INCIDENT",
        data: triageResult.incident,
      },
      cancelButton: {
        label: "Cancel",
        action: "CANCEL",
      },
    };
  }

  /**
   * CREATE INCIDENT (AFTER CONFIRMATION)
   */
  async createConfirmedIncident(incidentData, user) {
    try {
      logger.info("Creating confirmed incident", { userId: user.id });

      // Start workflow
      const workflowResult = await WorkflowEngine.startIncidentWorkflow({
        message: incidentData.title,
        priority: incidentData.priority,
        application: incidentData.application,
        impactScope: incidentData.impact,
        assignmentGroup: incidentData.assignmentGroup,
        user,
      });

      if (!workflowResult.success) {
        throw new Error("Workflow failed");
      }

      // Send confirmation to user
      await NotificationEngine.notifyUser({
        userId: user.id,
        type: "INCIDENT_CREATED",
        incident: workflowResult.incident,
      });

      SessionStore.clearWorkflow(user.id);

      return {
        type: "INCIDENT_CREATED",
        incident: workflowResult.incident,
        message: `Incident ${workflowResult.incident.number} has been created and assigned to ${incidentData.assignmentGroup}.`,
        tracking: {
          incidentNumber: workflowResult.incident.number,
          priority: incidentData.priority,
          url: workflowResult.incident.url,
        },
      };
    } catch (error) {
      logger.error("Failed to create confirmed incident", { error: error.message });
      throw error;
    }
  }

  /**
   * HANDLE INCIDENT FEEDBACK
   */
  async handleFeedback(userId, feedback, sentiment) {
    try {
      logger.info("Handling feedback", { userId, sentiment });

      const profile = SessionStore.getUserProfile(userId);
      profile.engagement.helpfulness = sentiment === "positive" ? 5 : 1;

      return {
        type: "FEEDBACK_RECEIVED",
        message: "Thank you for your feedback. We'll use this to improve.",
      };
    } catch (error) {
      logger.error("Feedback handling error", { error: error.message });
    }
  }
}

module.exports = new IncidentOrchestrator();
