const express = require("express");
const router = express.Router();

const { processMessage } =
  require("../../services/workflowService");

const {
  createIncident,
  createAccessRequest,
} = require("../../services/servicenowService");

const {
  getSession,
  clearSession,
} = require("../../memory/sessionStore");

const requestService =
  require("../../services/servicenow/request.service");

const incidentService =
  require("../../services/servicenow/incident.service");

const logger =
  require("../../utils/logger");

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
 * EXTRACT INCIDENT NUMBERS
 */
function extractIncidentNumbers(text) {
  const matches =
    text.match(/INC\d+/gi);

  return matches
    ? [...new Set(matches.map((m) => m.toUpperCase()))]
    : [];
}

/**
 * EXTRACT REQUEST NUMBERS
 */
function extractRequestNumbers(text) {
  const matches =
    text.match(/REQ\d+/gi);

  return matches
    ? [...new Set(matches.map((m) => m.toUpperCase()))]
    : [];
}

/**
 * EXTRACT USERNAMES
 */
function extractUsernames(text) {
  return text
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        /^[a-zA-Z0-9._-]+$/.test(w)
    );
}

/**
 * SMART PRIORITY ANALYSIS
 */
function analyzePriority(text) {
  const msg = text.toLowerCase();

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
      suggestion:
        "This looks like a critical issue.",
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
      suggestion:
        "This looks like a high priority issue.",
    };
  }

  if (
    msg.includes("low") ||
    msg.includes("minor") ||
    msg.includes("small")
  ) {
    return {
      severity: "LOW",
      priority: "4",
      label: "Low",
      suggestion:
        "This looks like a low priority issue.",
    };
  }

  return {
    severity: "MEDIUM",
    priority: "3",
    label: "Medium",
    suggestion:
      "This looks like a medium priority issue.",
  };
}

/**
 * FETCH INCIDENT STATUS
 */
async function fetchIncidentStatus(
  incidentNumbers
) {
  const results = [];

  for (const inc of incidentNumbers) {
    try {
      const incident =
        await incidentService.getIncident(inc);

      results.push({
        number: incident.number,
        state: incident.stateLabel,
        priority:
          PRIORITY_LABELS[
            incident.priority
          ] || incident.priority,
      });
    } catch (err) {
      results.push({
        number: inc,
        error: "Incident not found",
      });
    }
  }

  return results;
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

      const session =
        getSession(userId);

      const text = message.trim();

      /**
       * CANCEL
       */
      if (
        text.toLowerCase() === "cancel"
      ) {
        clearSession(userId);

        return res.json({
          reply: "Request cancelled.",
        });
      }

      /**
       * CONFIRMATION FLOW
       */
      if (
        session.awaitingConfirmation
      ) {
        /**
         * CONFIRM
         */
        if (
          text.toLowerCase() ===
          "confirm"
        ) {
          /**
           * CREATE INCIDENT
           */
          if (
            session.workflow ===
            "incident"
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
${
  PRIORITY_LABELS[
    incident.priority
  ] || incident.priority
}

Status:
${incident.stateLabel}
`,
            });
          }

          /**
           * CREATE ACCESS REQUEST
           */
          if (
            session.workflow ===
            "access_request"
          ) {
            const result =
              await createAccessRequest({
                ...session.collectedData,
                userId,
              });

            clearSession(userId);

            if (
              result.notSnowUser
            ) {
              return res.json({
                reply: `
User ${result.username} not found in ServiceNow.
`,
              });
            }

            if (
              result.isDuplicate
            ) {
              return res.json({
                reply: `
Duplicate request already exists.

Request Number:
${result.existingRequest.number}
`,
              });
            }

            return res.json({
              reply: `
Access request created successfully.

Request Number:
${result.number}

Priority:
${
  PRIORITY_LABELS[
    result.priority
  ] || result.priority
}
`,
            });
          }
        }

        return res.json({
          reply:
            "Please type CONFIRM or CANCEL.",
        });
      }

      /**
       * INCIDENT STATUS CHECK
       */
      if (
        text.toLowerCase().includes(
          "incident status"
        )
      ) {
        session.workflow =
          "incident_status";

        session.awaitingField =
          "incident_number";

        return res.json({
          reply:
            "Please provide incident number.",
        });
      }

      /**
       * INCIDENT STATUS INPUT
       */
      if (
        session.workflow ===
          "incident_status" &&
        session.awaitingField ===
          "incident_number"
      ) {
        const incidents =
          extractIncidentNumbers(text);

        const results =
          await fetchIncidentStatus(
            incidents
          );

        clearSession(userId);

        let response = "";

        results.forEach((r) => {
          if (r.error) {
            response += `
${r.number}: ${r.error}
`;
          } else {
            response += `
Incident: ${r.number}
Status: ${r.state}
Priority: ${r.priority}

`;
          }
        });

        return res.json({
          reply: response,
        });
      }

      /**
       * PROCESS AI
       */
      const response =
        await processMessage(
          session,
          text
        );

      /**
       * INCIDENT FLOW
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
            "Please provide issue details.",
        });
      }

      /**
       * INCIDENT DETAILS
       */
      if (
        session.workflow ===
          "incident" &&
        session.awaitingField ===
          "details"
      ) {
        const priorityAnalysis =
          analyzePriority(text);

        const calculated =
          incidentService.calculatePriority(
            priorityAnalysis.severity,
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
${priorityAnalysis.suggestion}

Suggested Priority:
${priorityAnalysis.label}

Type CONFIRM to create incident.
`,
        });
      }

      /**
       * ACCESS REQUEST FLOW
       */
      if (
        response.type ===
        "READY_TO_CREATE_ACCESS_REQUEST"
      ) {
        session.workflow =
          "access_request";

        session.awaitingConfirmation =
          true;

        const priorityAnalysis =
          analyzePriority(text);

        session.collectedData = {
          application:
            response.application,

          username:
            response.username,

          shortDescription:
            `Access request for ${response.application}`,

          priority:
            priorityAnalysis.priority,
        };

        return res.json({
          reply: `
Application validated:
${response.application}

Suggested Priority:
${priorityAnalysis.label}

Type CONFIRM to create access request.
`,
        });
      }

      return res.json({
        reply:
          response.reply ||
          response.message,
      });
    } catch (err) {
      console.error(
        "CHAT ERROR:",
        err
      );

      return res.status(500).json({
        error: err.message,
      });
    }
  }
);

module.exports = router;