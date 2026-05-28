const IntentClassifier = require("./intentClassifier.service");
const EntityExtractor = require("./entityExtractor.service");
const logger = require("../../utils/logger");

class TriageEngineService {
  /**
   * MAIN PROCESS METHOD
   */
  async process(message, session = {}) {
    try {
      if (!message) {
        return {
          type: "UNKNOWN",
          reply: "Empty message received.",
        };
      }

      const text = String(message).trim();
      const lower = text.toLowerCase();

      /**
       * GREETING HANDLER
       */
      if (
        lower === "hi" ||
        lower === "hello" ||
        lower === "hey" ||
        lower.includes("good morning") ||
        lower.includes("good evening")
      ) {
        return {
          type: "GREETING",
          reply: `Hello! I'm your AI Service Desk Assistant.

I can help you with:

• Incident creation
• Access requests
• Service requests
• Password reset support
• Incident status tracking
• Request status tracking

How can I assist you today?`,
        };
      }

      /**
       * INTENT CLASSIFICATION
       */
      const classification = await IntentClassifier.classify(text);

      /**
       * ENTITY EXTRACTION
       */
      const entities = await EntityExtractor.extract(text);

      logger.info("Intent classified", {
        intent: classification.intent,
        confidence: classification.confidence,
      });

      /**
       * =====================================
       * ACCESS REQUEST
       * =====================================
       */
      if (classification.intent === "ACCESS_REQUEST") {
        const application =
          entities.application ||
          entities.applications?.[0]?.name ||
          "Application";

        // If username is not provided yet
        if (!session.collectedData?.username) {
          return {
            type: "READY_TO_CREATE_ACCESS_REQUEST",
            application,
            reply: `Access request detected for ${application}.\nPlease provide your username.`,
          };
        }

        // If username is provided, ask for priority
        if (!session.collectedData?.priority) {
          return {
            type: "AWAITING_PRIORITY",
            application,
            reply: `Please provide request priority for ${application}.\nAvailable: Low, Medium, High, Critical.`,
          };
        }

        // Ready for confirmation if both username and priority are set
        return {
          type: "READY_TO_CONFIRM_ACCESS_REQUEST",
          application,
          reply: `Access request summary for ${application}:\nUsername: ${session.collectedData.username}\nPriority: ${session.collectedData.priority}\nType CONFIRM to create the request.`,
        };
      }

      /**
       * =====================================
       * INCIDENT
       * =====================================
       */
      if (classification.intent === "INCIDENT") {
        const application =
          entities.application ||
          entities.applications?.[0]?.name ||
          "General Application";

        // Initial incident detection
        if (!session.collectedData?.description) {
          return {
            type: "READY_TO_CREATE_INCIDENT",
            incident: {
              title: text.substring(0, 100),
              description: text,
              application,
              assignmentGroup: this.resolveAssignmentGroup(application),
            },
            reply: `Incident detected for ${application}.\nPlease provide complete issue details.`,
          };
        }

        // Priority suggestion if details are provided
        if (!session.collectedData?.priority) {
          return {
            type: "AWAITING_INCIDENT_PRIORITY",
            incident: session.collectedData,
            reply: `Please specify priority for the incident (Low, Medium, High, Critical).`,
          };
        }

        // Ready to confirm incident creation
        return {
          type: "READY_TO_CONFIRM_INCIDENT",
          incident: session.collectedData,
          reply: `Incident summary for ${application}:\nIssue: ${session.collectedData.description}\nPriority: ${session.collectedData.priority}\nType CONFIRM to create the incident.`,
        };
      }

      /**
       * =====================================
       * PASSWORD RESET
       * =====================================
       */
      if (classification.intent === "PASSWORD_RESET") {
        return {
          type: "PASSWORD_RESET",
          reply: "You can reset your password using the self-service password portal.",
        };
      }

      /**
       * =====================================
       * REQUEST STATUS
       * =====================================
       */
      if (classification.intent === "REQUEST_STATUS") {
        return {
          type: "REQUEST_STATUS",
          reply: "Please provide your request number to check status.",
        };
      }

      /**
       * =====================================
       * INCIDENT STATUS
       * =====================================
       */
      if (classification.intent === "INCIDENT_STATUS") {
        return {
          type: "INCIDENT_STATUS",
          reply: "Please provide the incident number to check status.",
        };
      }

      /**
       * =====================================
       * SERVICE REQUEST
       * =====================================
       */
      if (classification.intent === "SERVICE_REQUEST") {
        return {
          type: "SERVICE_REQUEST",
          reply: "Service request detected. Please provide required details.",
        };
      }

      /**
       * UNKNOWN
       */
      return {
        type: "UNKNOWN",
        reply: "I could not fully understand your request. Please provide more details.",
      };
    } catch (error) {
      logger.error("Triage Engine Error", { error: error.message });
      return {
        type: "ERROR",
        reply: "Something went wrong while processing your request.",
      };
    }
  }

  /**
   * ASSIGNMENT GROUP ROUTING
   */
  resolveAssignmentGroup(application = "") {
    const app = application.toLowerCase();
    if (app.includes("sap")) return "SAP Support";
    if (app.includes("vpn")) return "Network Support";
    if (app.includes("servicenow")) return "ServiceNow Support";
    if (app.includes("azure")) return "Cloud Operations";
    return "Service Desk";
  }
}

module.exports = new TriageEngineService();