/**
 * WORKFLOW ENGINE
 * 
 * Orchestrates complex workflows:
 * - Incident creation workflow
 * - Request approval workflow
 * - Multi-step data collection
 * - State management
 * - Workflow tracking
 */

const logger = require("../utils/logger");
const IncidentService = require("../services/servicenow/incident.service");
const RequestService = require("../services/servicenow/request.service");

class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
  }

  /**
   * START INCIDENT CREATION WORKFLOW
   */
  async startIncidentWorkflow(data) {
    try {
      const {
        message,
        priority,
        application,
        impactScope,
        assignmentGroup,
        user,
      } = data;

      logger.debug("Starting incident workflow");

      const workflowId = this._generateWorkflowId();

      const workflow = {
        id: workflowId,
        type: "INCIDENT_CREATION",
        status: "IN_PROGRESS",
        startTime: new Date(),
        data: {
          shortDescription: message.substring(0, 100),
          description: message,
          priority,
          application,
          impactScope,
          assignmentGroup,
          requestedBy: user.id,
        },
        steps: [
          { step: 1, name: "COLLECT_INFO", completed: true },
          { step: 2, name: "VALIDATE", status: "IN_PROGRESS" },
          { step: 3, name: "ASSIGN", status: "PENDING" },
          { step: 4, name: "NOTIFY", status: "PENDING" },
          { step: 5, name: "TRACK", status: "PENDING" },
        ],
      };

      // Validate data
      const validation = await this._validateIncidentData(workflow.data);
      if (!validation.valid) {
        workflow.steps[1].status = "FAILED";
        workflow.status = "FAILED";
        return { workflow, errors: validation.errors };
      }

      workflow.steps[1].status = "COMPLETED";

      // Create incident in ServiceNow
      const incident = await IncidentService.createIncident({
        short_description: workflow.data.shortDescription,
        description: workflow.data.description,
        priority: workflow.data.priority,
        assignment_group: workflow.data.assignmentGroup,
        configuration_item: workflow.data.application,
        category: "IT Service Management",
        subcategory: "Application",
      });

      workflow.data.incidentNumber = incident.number;
      workflow.data.incidentSysId = incident.sys_id;
      workflow.steps[2].status = "COMPLETED";
      workflow.steps[3].status = "COMPLETED";

      // Send notifications
      await this._sendNotifications({
        type: "INCIDENT_CREATED",
        incident,
        assignmentGroup: workflow.data.assignmentGroup,
      });

      workflow.steps[4].status = "COMPLETED";

      // Store workflow for tracking
      this.workflows.set(workflowId, workflow);
      workflow.status = "COMPLETED";

      logger.info("Incident workflow completed", { workflowId, incidentNumber: incident.number });

      return {
        workflow,
        incident,
        success: true,
      };
    } catch (error) {
      logger.error("Incident workflow error", { error: error.message });
      throw error;
    }
  }

  /**
   * START REQUEST WORKFLOW
   */
  async startRequestWorkflow(data) {
    try {
      const { catalogItemId, user, variables = {} } = data;

      logger.debug("Starting request workflow", { catalogItemId });

      const workflowId = this._generateWorkflowId();

      const workflow = {
        id: workflowId,
        type: "REQUEST_CREATION",
        status: "IN_PROGRESS",
        startTime: new Date(),
        data: {
          catalogItemId,
          requestedBy: user.id,
          requestedFor: user.id,
          variables,
        },
        steps: [
          { step: 1, name: "VALIDATE_ITEM", status: "IN_PROGRESS" },
          { step: 2, name: "COLLECT_VARIABLES", status: "PENDING" },
          { step: 3, name: "SUBMIT_REQUEST", status: "PENDING" },
          { step: 4, name: "ROUTE_APPROVAL", status: "PENDING" },
          { step: 5, name: "NOTIFY_USER", status: "PENDING" },
        ],
      };

      // Validate catalog item
      try {
        const catalogItem = await RequestService.getCatalogItem(catalogItemId);
        workflow.data.catalogItem = catalogItem;
        workflow.steps[0].status = "COMPLETED";
      } catch (error) {
        workflow.steps[0].status = "FAILED";
        workflow.status = "FAILED";
        return { workflow, error: "Catalog item not found" };
      }

      // Collect variables if needed
      workflow.steps[1].status = "COMPLETED";

      // Submit request
      const request = await RequestService.submitRequest({
        requestedFor: workflow.data.requestedFor,
        shortDescription: `Request for ${workflow.data.catalogItem.name}`,
        description: `Submitted via AI Agent`,
        catalogItems: [
          {
            catalogItemId,
            quantity: 1,
            variables: workflow.data.variables,
          },
        ],
      });

      workflow.data.requestNumber = request.number;
      workflow.data.requestSysId = request.sys_id;
      workflow.steps[2].status = "COMPLETED";

      // Route for approval if needed
      workflow.steps[3].status = "COMPLETED";

      // Notify user
      await this._sendNotifications({
        type: "REQUEST_CREATED",
        request,
        user,
      });

      workflow.steps[4].status = "COMPLETED";

      this.workflows.set(workflowId, workflow);
      workflow.status = "COMPLETED";

      logger.info("Request workflow completed", {
        workflowId,
        requestNumber: request.number,
      });

      return {
        workflow,
        request,
        success: true,
      };
    } catch (error) {
      logger.error("Request workflow error", { error: error.message });
      throw error;
    }
  }

  /**
   * VALIDATE INCIDENT DATA
   */
  async _validateIncidentData(data) {
    const errors = [];

    if (!data.shortDescription || data.shortDescription.length < 10) {
      errors.push("Description must be at least 10 characters");
    }

    if (!data.priority || ![1, 2, 3, 4, 5].includes(parseInt(data.priority))) {
      errors.push("Invalid priority");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * SEND NOTIFICATIONS
   */
  async _sendNotifications(data) {
    try {
      logger.debug("Sending notifications", { type: data.type });

      // In production, integrate with email, Teams, Slack, etc.
      // For now, just log

      logger.info("Notification sent", data);
    } catch (error) {
      logger.warn("Failed to send notification", { error: error.message });
    }
  }

  /**
   * GET WORKFLOW STATUS
   */
  getWorkflowStatus(workflowId) {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * GENERATE UNIQUE WORKFLOW ID
   */
  _generateWorkflowId() {
    return `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = new WorkflowEngine();
