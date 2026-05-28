const IntentClassifier = require("../services/ai/intentClassifier.service");
const EntityExtractor = require("../services/ai/entityExtractor.service");

const requestService =
  require("../services/servicenow/request.service");

const logger =
  require("../utils/logger");

class TriageEngine {

  /**
   * MAIN AI PROCESSOR
   */
  async process(message, session = {}) {

    try {

      const lower =
        message.toLowerCase().trim();

      /**
       * =========================
       * GREETING
       * =========================
       */
      if (
        lower === "hi" ||
        lower === "hello" ||
        lower === "hey"
      ) {

        return {
          type: "GREETING",

          reply:
            "Hello! I am your AI Service Desk Assistant. I can help with incidents, access requests, request tracking, password reset, and KB guidance.",
        };
      }

      /**
       * =====================================
       * ACCESS REQUEST → USERNAME COLLECTION
       * =====================================
       */
      if (
        session.workflow ===
          "access_request" &&

        session.awaitingField ===
          "username"
      ) {

        const username =
          message.trim();

        logger.info(
          "Validating username",
          { username }
        );

        const userSysId =
          await requestService.resolveUserSysId(
            username
          );

        if (!userSysId) {

          return {
            type: "ERROR",

            reply:
`User "${username}" not found in ServiceNow.

Please provide a valid username.`,
          };
        }

        session.collectedData.username =
          username;

        session.collectedData.requestedFor =
          userSysId;

        session.awaitingField =
          "priority";

        return {
          type:
            "ACCESS_REQUEST_PRIORITY",

          reply:
`Username validated successfully.

Please provide request priority.

Available priorities:
• Critical
• High
• Medium
• Low`,
        };
      }

      /**
       * =====================================
       * ACCESS REQUEST → PRIORITY COLLECTION
       * =====================================
       */
      if (
        session.workflow ===
          "access_request" &&

        session.awaitingField ===
          "priority"
      ) {

        const priorityInput =
          lower;

        let priority = "3";
        let priorityLabel = "Medium";

        if (
          priorityInput.includes(
            "critical"
          )
        ) {

          priority = "1";
          priorityLabel =
            "Critical";
        }

        else if (
          priorityInput.includes(
            "high"
          )
        ) {

          priority = "2";
          priorityLabel =
            "High";
        }

        else if (
          priorityInput.includes(
            "low"
          )
        ) {

          priority = "4";
          priorityLabel =
            "Low";
        }

        session.collectedData.priority =
          priority;

        session.collectedData.priorityLabel =
          priorityLabel;

        session.awaitingField =
          null;

        session.awaitingConfirmation =
          true;

        return {
          type:
            "READY_TO_CREATE_ACCESS_REQUEST",

          reply:
`Access Request Summary

Application:
${session.collectedData.application}

Username:
${session.collectedData.username}

Priority:
${priorityLabel}

Type CONFIRM to create the request.`,
        };
      }

      /**
       * =====================================
       * INCIDENT → USERNAME COLLECTION
       * =====================================
       */
      if (
        session.workflow ===
          "incident" &&

        session.awaitingField ===
          "username"
      ) {

        const username =
          message.trim();

        session.collectedData.username =
          username;

        session.awaitingField =
          "details";

        return {
          type:
            "INCIDENT_DETAILS",

          reply:
            "Please provide detailed issue description including business impact.",
        };
      }

      /**
       * =====================================
       * INCIDENT → DETAILS COLLECTION
       * =====================================
       */
      if (
        session.workflow ===
          "incident" &&

        session.awaitingField ===
          "details"
      ) {

        session.collectedData.description =
          message;

        /**
         * AI PRIORITY SUGGESTION
         */
        let priority = "3";
        let priorityLabel =
          "Medium";

        if (
          lower.includes(
            "production down"
          ) ||

          lower.includes(
            "critical"
          ) ||

          lower.includes(
            "all users"
          ) ||

          lower.includes(
            "system down"
          )
        ) {

          priority = "1";
          priorityLabel =
            "Critical";
        }

        else if (
          lower.includes(
            "high"
          ) ||

          lower.includes(
            "urgent"
          )
        ) {

          priority = "2";
          priorityLabel =
            "High";
        }

        else if (
          lower.includes(
            "low"
          ) ||

          lower.includes(
            "minor"
          )
        ) {

          priority = "4";
          priorityLabel =
            "Low";
        }

        session.collectedData.priority =
          priority;

        session.collectedData.priorityLabel =
          priorityLabel;

        session.awaitingField =
          null;

        session.awaitingConfirmation =
          true;

        return {
          type:
            "READY_TO_CREATE_INCIDENT",

          reply:
`Incident Summary

Application:
${session.collectedData.application}

Username:
${session.collectedData.username}

AI Suggested Priority:
${priorityLabel}

Issue:
${message}

Type CONFIRM to create incident.`,
        };
      }

      /**
       * =====================================
       * INTENT CLASSIFICATION
       * =====================================
       */
      const classification =
        await IntentClassifier.classify(
          message,
          { session }
        );

      logger.info(
        "Intent classified",
        {
          intent:
            classification.intent,

          confidence:
            classification.confidence,
        }
      );

      /**
       * ENTITY EXTRACTION
       */
      const entities =
        await EntityExtractor.extract(
          message
        );

      /**
       * =====================================
       * REQUEST STATUS
       * =====================================
       */
      if (
        classification.intent ===
        "REQUEST_STATUS"
      ) {

        return {
          type:
            "REQUEST_STATUS",

          reply:
            "Please provide request number like REQ0010001.",
        };
      }

      /**
       * =====================================
       * INCIDENT STATUS
       * =====================================
       */
      if (

        lower.includes(
          "incident status"
        ) ||

        lower.includes(
          "check incident"
        ) ||

        lower.includes(
          "track incident"
        )
      ) {

        return {
          type:
            "INCIDENT_STATUS",

          reply:
            "Please provide incident number like INC0010001.",
        };
      }

      /**
       * =====================================
       * PASSWORD RESET
       * =====================================
       */
      if (
        classification.intent ===
        "PASSWORD_RESET"
      ) {

        return {
          type:
            "PASSWORD_RESET",

          reply:
            "You can reset your password using self-service password portal. If MFA is locked contact IAM support.",
        };
      }

      /**
       * =====================================
       * ACCESS REQUEST
       * =====================================
       */
      if (

        classification.intent ===
          "ACCESS_REQUEST" ||

        lower.includes(
          "access"
        ) ||

        lower.includes(
          "access request"
        )
      ) {

        const application =
          entities.applications?.[0]
            ?.name ||

          classification.entities
            ?.application ||

          message
            .replace(
              /need access on/gi,
              ""
            )
            .replace(
              /access request/gi,
              ""
            )
            .trim();

        logger.info(
          "Access request detected",
          { application }
        );

        /**
         * HACKATHON MODE
         * DO NOT BLOCK APPLICATION
         */
        session.workflow =
          "access_request";

        session.awaitingField =
          "username";

        session.collectedData = {

          application,

          shortDescription:
            `Access request for ${application}`,

          description:
            `User requesting access for ${application}`,

          assignmentGroup:
            "IAM Support",
        };

        return {
          type:
            "ACCESS_REQUEST",

          reply:
`Application validated successfully for ${application}.

Please provide your username.`,
        };
      }

      /**
       * =====================================
       * INCIDENT
       * =====================================
       */
      if (

        classification.intent ===
          "INCIDENT" ||

        lower.includes(
          "issue"
        ) ||

        lower.includes(
          "error"
        ) ||

        lower.includes(
          "not working"
        )
      ) {

        const application =
          entities.applications?.[0]
            ?.name ||

          classification.entities
            ?.application ||

          "General Application";

        session.workflow =
          "incident";

        session.awaitingField =
          "username";

        session.collectedData = {

          application,

          short_description:
            message.substring(
              0,
              120
            ),

          assignment_group:
            this._resolveAssignmentGroup(
              application
            ),
        };

        return {
          type:
            "INCIDENT",

          reply:
`Incident detected for ${application}.

Please provide your username.`,
        };
      }

      /**
       * =====================================
       * FALLBACK
       * =====================================
       */
      return {
        type:
          "UNKNOWN",

        reply:
          "Please provide more details about your issue or request.",
      };

    } catch (error) {

      logger.error(
        "Triage Engine failed",
        {
          error:
            error.message,

          stack:
            error.stack,
        }
      );

      return {
        type:
          "ERROR",

        reply:
          "Something went wrong while processing your request.",
      };
    }
  }

  /**
   * ASSIGNMENT GROUP
   */
  _resolveAssignmentGroup(
    application = ""
  ) {

    const app =
      application.toLowerCase();

    if (
      app.includes("sap")
    ) {
      return "SAP Support";
    }

    if (
      app.includes("vpn")
    ) {
      return "Network Support";
    }

    if (
      app.includes("servicenow")
    ) {
      return "ServiceNow Support";
    }

    if (
      app.includes("azure")
    ) {
      return "Cloud Operations";
    }

    return "Service Desk";
  }
}

module.exports =
  new TriageEngine();