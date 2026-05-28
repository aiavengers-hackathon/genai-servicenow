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

  if (
    msg.includes("critical") ||
    msg.includes("production down") ||
    msg.includes("system down") ||
    msg.includes("urgent")
  ) {
    return {
      severity: "CRITICAL",
      priority: "1",
      label: "Critical",
    };
  }

  if (
    msg.includes("high") ||
    msg.includes("unable to login") ||
    msg.includes("blocked")
  ) {
    return {
      severity: "HIGH",
      priority: "2",
      label: "High",
    };
  }

  if (
    msg.includes("low") ||
    msg.includes("minor")
  ) {
    return {
      severity: "LOW",
      priority: "4",
      label: "Low",
    };
  }

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

    try {

      const {
        message,
        userId,
      } = req.body;

      if (!message || !userId) {

        return res.status(400).json({
          error:
            "message and userId required",
        });
      }

      const text =
        message.trim();

      const lower =
        text.toLowerCase();

      const session =
        getSession(userId);

      /**
       * CANCEL FLOW
       */
      if (lower === "cancel") {

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
       * STEP 1
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
          reply: `
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
       * STEP 2
       * ASK PRIORITY
       */
      if (
        session.workflow === "access_request" &&
        session.awaitingField === "priority"
      ) {

        const priority =
          PRIORITY_MAP[lower];

        if (!priority) {

          return res.json({
            reply: `
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
          reply: `
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
          reply: `
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

        if (lower !== "confirm") {

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

          const incident =
            await createIncident({
              ...session.collectedData,
              userId,
            });

          clearSession(userId);

          return res.json({
            reply: `
Incident created successfully.

Incident Number:
${incident.number}

Priority:
${PRIORITY_LABELS[
  incident.priority
] || incident.priority}

Status:
${incident.stateLabel}
`,
          });
        }

        /**
         * CREATE ACCESS REQUEST
         */
        if (
          session.workflow === "access_request"
        ) {

          const result =
            await createAccessRequest({
              ...session.collectedData,
              userId,
            });

          clearSession(userId);

          /**
           * USER NOT FOUND
           */
          if (result.notSnowUser) {

            return res.json({
              reply: `
User ${result.username} not found in ServiceNow.
`,
            });
          }

          /**
           * DUPLICATE REQUEST
           */
          if (result.isDuplicate) {

            return res.json({
              reply: `
Duplicate access request already exists.

Request Number:
${result.existingRequest.number}
`,
            });
          }

          /**
           * SUCCESS
           */
          return res.json({
            reply: `
Access request created successfully.

Request Number:
${result.number}

Priority:
${PRIORITY_LABELS[
  result.priority
] || result.priority}

Status:
${result.status}
`,
          });
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
          reply: `
Application validated successfully.

Application:
${response.application}

Please provide your username.
`,
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
          reply: `
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

      return res.status(500).json({
        error:
          err.message,
      });
    }
  }
);

module.exports = router;