const express = require("express");

const router = express.Router();

const {
  processMessage,
} = require("../../services/workflowService");

const {
  createIncident,
  createAccessRequest,
} = require("../../services/servicenowService");

const {
  getSession,
  clearSession,
} = require("../../memory/sessionStore");

const incidentService =
  require("../../services/servicenow/incident.service");

// Enterprise-grade utilities
const logger = require("../../utils/logger");
const ValidationService = require("../../utils/validation");
const PIIProtection = require("../../utils/piiProtection");
const AuditLogger = require("../../utils/auditLogger");
const metricsCollector = require("../../utils/metricsCollector");
const DuplicateDetectionService = require("../../services/duplicateDetection.service");

/**
 * PRIORITY LABELS
 */
const PRIORITY_LABELS = {
  "1": "Critical",
  "2": "High",
  "3": "Medium",
  "4": "Low",
};

/**
 * USER PRIORITY INPUT
 */
const PRIORITY_MAP = {
  critical: "1",
  high: "2",
  medium: "3",
  low: "4",
};

/**
 * INCIDENT PRIORITY SUGGESTION
 */
function analyzePriority(text = "") {

  const msg =
    text.toLowerCase();

  /**
   * CRITICAL
   */
  if (
    msg.includes("critical") ||
    msg.includes("production down") ||
    msg.includes("system down") ||
    msg.includes("outage") ||
    msg.includes("urgent")
  ) {

    return {
      severity: "CRITICAL",
      priority: "1",
      label: "Critical",
    };
  }

  /**
   * HIGH
   */
  if (
    msg.includes("unable to login") ||
    msg.includes("blocked") ||
    msg.includes("cannot access") ||
    msg.includes("failed") ||
    msg.includes("error") ||
    msg.includes("issue")
  ) {

    return {
      severity: "HIGH",
      priority: "2",
      label: "High",
    };
  }

  /**
   * LOW
   */
  if (
    msg.includes("minor") ||
    msg.includes("cosmetic")
  ) {

    return {
      severity: "LOW",
      priority: "4",
      label: "Low",
    };
  }

  /**
   * DEFAULT
   */
  return {
    severity: "MEDIUM",
    priority: "3",
    label: "Medium",
  };
}

/**
 * MAIN CHAT ROUTE
 */
router.post(
  "/message",
  async (req, res) => {

    const startTime = Date.now();

    try {

      const {
        message,
        userId,
      } = req.body;

      /**
       * VALIDATION
       */
      if (!message || !userId) {
        logger.warn("Missing required fields", { message: !!message, userId: !!userId });
        return res.status(400).json({
          success: false,
          error: "message and userId required",
        });
      }

      // Validate message
      const msgValidation = ValidationService.validateMessage(message);
      if (!msgValidation.valid) {
        return res.status(400).json({
          success: false,
          error: msgValidation.error,
        });
      }

      // Sanitize input
      const text = ValidationService.sanitizeSearchQuery(String(message).trim());
      const lower = text.toLowerCase();

      // Log with PII protection
      PIIProtection.safeLog("Chat message received", { userId, messageLength: text.length });

      // Record metric
      metricsCollector.recordChatMessage();

      /**
       * SESSION
       */
      const session =
        getSession(userId);

      /**
       * CANCEL FLOW
       */
      if (
        lower === "cancel"
      ) {

        clearSession(userId);

        return res.json({
          reply:
            "Request cancelled successfully.",
        });
      }

      /**
       * =====================================================
       * ACCESS REQUEST FLOW
       * =====================================================
       */

      /**
       * ASK APPLICATION
       */
      if (
        session.workflow === "access_request" &&
        session.awaitingField === "application"
      ) {

        session.collectedData.application =
          text;

        session.collectedData.shortDescription =
          `Access request for ${text}`;

        session.awaitingField =
          "username";

        return res.json({
          reply:
`
Application validated successfully.

Application:
${text}

Please provide your username / ISID.
`,
        });
      }

      /**
       * ASK USERNAME
       */
      if (
        session.workflow === "access_request" &&
        session.awaitingField === "username"
      ) {

        session.collectedData.username =
          text;

        session.awaitingField =
          "priority";

        return res.json({
          reply:
`
Please provide request priority.

Available priorities:
• Low
• Medium
• High
• Critical
`,
        });
      }

      /**
       * ASK PRIORITY
       */
      if (
        session.workflow === "access_request" &&
        session.awaitingField === "priority"
      ) {

        const priority =
          PRIORITY_MAP[lower];

        /**
         * INVALID PRIORITY
         */
        if (!priority) {

          return res.json({
            reply:
`
Invalid priority.

Please enter:
• Low
• Medium
• High
• Critical
`,
          });
        }

        session.collectedData.priority =
          priority;

        session.awaitingField =
          null;

        session.awaitingConfirmation =
          true;

        return res.json({
          reply:
`
Access Request Summary

Application:
${session.collectedData.application}

Username:
${session.collectedData.username}

Priority:
${PRIORITY_LABELS[priority]}

Type CONFIRM to create access request.
`,
        });
      }

      /**
       * =====================================================
       * INCIDENT FLOW
       * =====================================================
       */

      /**
       * ASK APPLICATION FOR INCIDENT
       */
      if (
        session.workflow === "incident" &&
        session.awaitingField === "application"
      ) {

        session.collectedData.application =
          text;

        session.awaitingField =
          "details";

        return res.json({
          reply:
`
Application captured:
${text}

Please provide complete issue details.
`,
        });
      }

      /**
       * INCIDENT DETAILS
       */
      if (
        session.workflow === "incident" &&
        session.awaitingField === "details"
      ) {

        const analysis =
          analyzePriority(text);

        const calculated =
          incidentService.calculatePriority(
            analysis.severity,
            false
          );

        session.collectedData.description =
          text;

        session.collectedData.priority =
          calculated.priority;

        session.collectedData.urgency =
          calculated.urgency;

        session.collectedData.impact =
          calculated.impact;

        session.awaitingField =
          null;

        session.awaitingConfirmation =
          true;

        return res.json({
          reply:
`
Incident Summary

Application:
${session.collectedData.application}

Suggested Priority:
${analysis.label}

Issue Details:
${text}

Type CONFIRM to create incident.
`,
        });
      }

      /**
       * =====================================================
       * CONFIRMATION FLOW
       * =====================================================
       */

      if (
        session.awaitingConfirmation
      ) {

        /**
         * INVALID CONFIRMATION
         */
        if (
          lower !== "confirm"
        ) {

          return res.json({
            reply:
              "Please type CONFIRM or CANCEL.",
          });
        }

        /**
         * CREATE INCIDENT
         */
        if (
          session.workflow === "incident"
        ) {

          try {
            // Check for duplicates
            const duplicateCheck = await DuplicateDetectionService.findDuplicates({
              short_description: session.collectedData.description || session.collectedData.short_description,
              cmdb_ci: session.collectedData.application,
            });

            if (duplicateCheck.isDuplicate && duplicateCheck.type === "EXACT_MATCH") {
              metricsCollector.recordDuplicateDetected();
              return res.json({
                reply: `Duplicate incident detected!\n\n${duplicateCheck.incidents.map(inc => 
                  `Incident ${inc.number}: ${inc.description}`
                ).join('\n')}\n\n${duplicateCheck.recommendation}`,
              });
            }

            const incident =
              await createIncident({
                ...session.collectedData,
                userId,
              });

            // Audit log
            await AuditLogger.logIncidentCreation(userId, session.collectedData, incident);
            const duration = Date.now() - startTime;
            metricsCollector.recordIncidentCreated(duration);

            clearSession(userId);

            return res.json({
              success: true,
              reply:
`
Incident created successfully.

Incident Number:
${incident.number}

Priority:
${incident.priorityLabel || PRIORITY_LABELS[incident.priority]}

Status:
${incident.stateLabel}

Ticket Link:
${process.env.SN_INSTANCE}/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}
`,
            });
          } catch (error) {
            await AuditLogger.logIncidentCreationFailure(userId, session.collectedData, error);
            metricsCollector.recordIncidentCreationFailed();
            logger.error("Incident creation failed", { error: error.message });

            return res.json({
              success: false,
              reply: `Failed to create incident: ${error.message}`,
            });
          }
        }

        /**
         * CREATE ACCESS REQUEST
         */
        if (
          session.workflow === "access_request"
        ) {

          try {
            const result =
              await createAccessRequest({
                ...session.collectedData,
                userId,
              });

            clearSession(userId);

            /**
             * USER NOT FOUND
             */
            if (
              result.notSnowUser
            ) {

              return res.json({
                reply:
`
User ${result.username} not found in ServiceNow.
`,
              });
            }

            /**
             * DUPLICATE REQUEST
             */
            if (
              result.isDuplicate
            ) {

              metricsCollector.recordDuplicateDetected();
              return res.json({
                reply:
`
Duplicate access request already exists.

Request Number:
${result.existingRequest.number}
`,
              });
            }

            // Audit log
            await AuditLogger.logRequestCreation(userId, session.collectedData, result);
            metricsCollector.recordRequestCreated(Date.now() - startTime);

            /**
             * SUCCESS
             */
            return res.json({
              success: true,
              reply:
`
Access request created successfully.

Request Number:
${result.number}

Priority:
${PRIORITY_LABELS[result.priority] || result.priority}

Status:
${result.status}
`,
            });
          } catch (error) {
            metricsCollector.recordRequestCreationFailed();
            await AuditLogger.logAPIError('/chat/message', error, userId);
            logger.error("Access request creation failed", { error: error.message });

            return res.json({
              success: false,
              reply: `Failed to create access request: ${error.message}`,
            });
          }
        }
      }

      /**
       * =====================================================
       * AI PROCESSING
       * =====================================================
       */

      const response =
        await processMessage(
          session,
          text
        );

      /**
       * GREETING
       */
      if (
        response.type === "GREETING"
      ) {

        return res.json({
          reply:
            response.reply,
        });
      }

      /**
       * ASK APPLICATION
       */
      if (
        response.type === "ASK_APPLICATION"
      ) {

        session.workflow =
          "access_request";

        session.awaitingField =
          "application";

        session.collectedData =
          {};

        return res.json({
          reply:
            response.reply,
        });
      }

      /**
       * ACCESS REQUEST START
       */
      if (
        response.type ===
        "READY_TO_CREATE_ACCESS_REQUEST"
      ) {

        session.workflow =
          "access_request";

        session.awaitingField =
          "username";

        session.collectedData = {

          application:
            response.application,

          shortDescription:
            `Access request for ${response.application}`,
        };

        return res.json({
          reply:
`
Application validated successfully.

Application:
${response.application}

Please provide your username / ISID.
`,
        });
      }

      /**
       * ASK APPLICATION FOR INCIDENT
       */
      if (
        response.type ===
        "ASK_APPLICATION_FOR_INCIDENT"
      ) {

        session.workflow =
          "incident";

        session.awaitingField =
          "application";

        session.collectedData =
          {};

        return res.json({
          reply:
            response.reply,
        });
      }

      /**
       * INCIDENT START
       */
      if (
        response.type ===
        "READY_TO_CREATE_INCIDENT"
      ) {

        session.workflow =
          "incident";

        session.awaitingField =
          "details";

        session.collectedData = {

          short_description:
            response.incident.title,

          application:
            response.incident.application,

          assignment_group:
            response.incident.assignmentGroup,
        };

        return res.json({
          reply:
`
Incident detected for:
${response.incident.application}

Please provide complete issue details.
`,
        });
      }

      /**
       * DEFAULT RESPONSE
       */
      return res.json({
        reply:
          response.reply ||
          response.message ||
          "I could not understand your request.",
      });

    } catch (err) {

      console.error(
        "CHAT ERROR:",
        err
      );

      logger.error('Chat message processing failed', { 
        error: err.message,
        stack: err.stack,
        userId: req.body?.userId 
      });

      await AuditLogger.logAPIError('/chat/message', err, req.body?.userId);

      return res.status(500).json({
        success: false,
        error:
          err.message || "An error occurred processing your request",
      });
    }
  }
);

/**
 * GET METRICS ENDPOINT
 */
router.get("/metrics", (req, res) => {
  return res.json({
    success: true,
    metrics: metricsCollector.getMetrics(),
  });
});

module.exports =
  router;