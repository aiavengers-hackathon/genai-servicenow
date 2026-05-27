const IntentClassifier = require("../services/ai/intentClassifier.service");
const EntityExtractor = require("../services/ai/entityExtractor.service");
const requestService = require("../services/servicenow/request.service");
const logger = require("../utils/logger");

class TriageEngine {

  /**
   * MAIN AI PROCESSOR
   */
  async process(message, session = {}) {

    try {

      const lower =
        message.toLowerCase();

      /**
       * GREETING
       */
      if (
        lower.includes("hello") ||
        lower.includes("hi") ||
        lower.includes("hey")
      ) {

        return {
          type: "GREETING",

          reply:
            "Hello! I'm your AI Service Desk assistant. I can help with incidents, access requests, password resets, request tracking, and KB guidance.",
        };
      }

      /**
       * INTENT CLASSIFICATION
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

          reasoning:
            classification.reasoning,
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
       * REQUEST STATUS
       */
      if (
        classification.intent ===
        "REQUEST_STATUS"
      ) {

        return {
          type: "REQUEST_STATUS",

          reply:
            "Sure, I can help check your request status. Please provide your request number.",
        };
      }

      /**
       * INCIDENT STATUS
       */
      if (
        /incident\s+status/i.test(lower) ||
        /status\s+of\s+incident/i.test(lower) ||
        /check\s+incident/i.test(lower) ||
        /track\s+incident/i.test(lower)
      ) {

        return {
          type: "INCIDENT_STATUS",

          reply:
            "Sure, I can help check your incident status. Please provide the incident number.",
        };
      }

      /**
       * PASSWORD RESET
       */
      if (
        classification.intent ===
        "PASSWORD_RESET"
      ) {

        return {
          type: "PASSWORD_RESET",

          reply:
            "You can reset your password using the self-service password portal. If MFA is locked, please contact IAM support.",
        };
      }

      /**
       * KNOWLEDGE BASE QUERY
       */
      if (
        classification.intent ===
        "KB_QUERY"
      ) {

        const application =
          entities.applications?.[0]
            ?.name ||
          "Application";

        try {

          const kbArticle =
            await requestService.searchKnowledgeBase(
              application,
              message
            );

          if (kbArticle) {

            return {
              type: "KB_RESPONSE",

              kbArticle,

              reply: `I found a knowledge article that may help.

Title: ${kbArticle.title}

Summary:
${kbArticle.summary}

Please try the documented steps before creating a ticket.`,
            };
          }

        } catch (error) {

          logger.error(
            "KB lookup failed",
            {
              error:
                error.message,
            }
          );
        }

        return {
          type: "KB_RESPONSE",

          reply:
            "I could not find a matching KB article. Would you like me to create an incident instead?",
        };
      }

      /**
       * ACCESS REQUEST
       */
      if (
        classification.intent ===
        "ACCESS_REQUEST"
      ) {

        const application =
          entities.applications?.[0]
            ?.name ||
          classification.entities
            ?.application ||
          extractApplicationName(
            message
          ) ||
          "UNKNOWN_APPLICATION";

        logger.info(
          "Access request detected",
          { application }
        );

        /**
         * OPTIONAL VALIDATION
         */
        let validatedApplication =
          application;

        try {

          const appExists =
            await requestService.validateApplication(
              application
            );

          if (!appExists) {

            logger.warn(
              "Application not found in ServiceNow",
              { application }
            );

            /**
             * Continue anyway
             * for demo/hackathon
             */
            validatedApplication =
              application;
          }

        } catch (error) {

          logger.error(
            "Application validation failed",
            {
              error:
                error.message,
            }
          );
        }

        return {
          type: "ACCESS_REQUEST",

          accessRequest: {

            application:
              validatedApplication,

            assignmentGroup:
              "IAM Support",

            configurationItem:
              validatedApplication,

            catalogItem:
              "Application Access",
          },

          reply: `
I detected an access request for ${validatedApplication}.

Please provide your username.
`,
        };
      }

      /**
       * MAJOR OUTAGE
       */
      if (
        classification.intent ===
        "OUTAGE"
      ) {

        const application =
          entities.applications?.[0]
            ?.name ||
          "Enterprise Service";

        return {
          type: "MAJOR_INCIDENT",

          incident: {

            title:
              `Major outage reported for ${application}`,

            description:
              message,

            application,

            assignmentGroup:
              "Major Incident Team",

            severity:
              "CRITICAL",
          },

          reply: `
This appears to be a major outage impacting multiple users.

I will create a high-priority incident for ${application}.
`,
        };
      }

      /**
       * INCIDENT
       */
      if (
        classification.intent ===
        "INCIDENT"
      ) {

        const application =
          entities.applications?.[0]
            ?.name ||
          classification.entities
            ?.application ||
          "General Application";

        const urgency =
          entities.urgency ||
          "MEDIUM";

        return {
          type:
            "READY_TO_CREATE_INCIDENT",

          incident: {

            title:
              message.substring(
                0,
                120
              ),

            description:
              message,

            application,

            assignmentGroup:
              this._resolveAssignmentGroup(
                application
              ),

            urgency,
          },

          reply: `
I detected an incident related to ${application}.

Please provide additional details such as screenshots, exact errors, or business impact.
`,
        };
      }

      /**
       * SERVICE REQUEST
       */
      if (
        classification.intent ===
        "SERVICE_REQUEST"
      ) {

        return {
          type:
            "SERVICE_REQUEST",

          reply:
            "I detected a service request. Please provide the required software, hardware, or service details.",
        };
      }

      /**
       * FALLBACK
       */
      return {
        type: "UNKNOWN",

        reply:
          "I could not fully understand your request. Please provide more details.",
      };

    } catch (error) {

      logger.error(
        "Triage engine failed",
        {
          error:
            error.message,

          stack:
            error.stack,
        }
      );

      return {
        type: "ERROR",

        reply:
          "Something went wrong while processing your request. Please try again.",
      };
    }
  }

  /**
   * ASSIGNMENT GROUP ROUTING
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
      app.includes("vpn") ||
      app.includes("cisco")
    ) {
      return "Network Support";
    }

    if (
      app.includes("azure") ||
      app.includes("aws")
    ) {
      return "Cloud Operations";
    }

    if (
      app.includes("servicenow")
    ) {
      return "ServiceNow Support";
    }

    if (
      app.includes(
        "active directory"
      ) ||
      app === "ad"
    ) {
      return "IAM Support";
    }

    return "Service Desk";
  }
}

/**
 * EXTRACT APPLICATION NAME
 */
function extractApplicationName(
  text = ""
) {

  const lower =
    text.toLowerCase();

  const patterns = [

    /access\s+(?:to|for|on)\s+([a-zA-Z0-9_-]+)/i,

    /need\s+access\s+(?:to|for|on)?\s*([a-zA-Z0-9_-]+)/i,

    /request\s+access\s+(?:to|for|on)?\s*([a-zA-Z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {

    const match =
      lower.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

module.exports =
  new TriageEngine();