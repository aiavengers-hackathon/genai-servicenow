const IntentClassifier =
  require("../services/ai/intentClassifier.service");

const EntityExtractor =
  require("../services/ai/entityExtractor.service");

const requestService =
  require("../services/servicenow/request.service");

const incidentService =
  require("../services/servicenow/incident.service");

const logger =
  require("../utils/logger");

class TriageEngine {

  /**
   * MAIN AI PROCESSOR
   */
  async process(message, session = {}) {

    try {

      const text =
        String(message || "").trim();

      const lower =
        text.toLowerCase();

      /**
       * =========================================
       * GREETING
       * =========================================
       */
      if (
        [
          "hi",
          "hello",
          "hey",
          "good morning",
          "good afternoon",
          "good evening",
        ].includes(lower)
      ) {

        return {
          type: "GREETING",

          reply:
            "Hello! I am your AI Service Desk Assistant. I can help you with incidents, access requests, password resets, request tracking, and knowledge articles.",
        };
      }

      /**
       * =========================================
       * INTENT CLASSIFICATION
       * =========================================
       */
      const classification =
        await IntentClassifier.classify(
          text,
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
       * =========================================
       * ENTITY EXTRACTION
       * =========================================
       */
      const entities =
        await EntityExtractor.extract(
          text
        );

      logger.info(
        "Entities extracted",
        entities
      );

      const incidentNumber = entities?.incidentNumber;
      const requestNumber = entities?.requestNumber;

      /**
       * =========================================
       * APPLICATION DETECTION
       * =========================================
       */
      const application =
        entities?.application ||

        entities?.applications?.[0]
          ?.name ||

        classification?.entities
          ?.application ||

        this._extractApplication(
          text
        );

/**
 * =========================================
 * REQUEST STATUS
 * =========================================
 */
if (
  classification.intent ===
  "REQUEST_STATUS"
) {

  return {
    type: "REQUEST_STATUS",

    reply:
`I'd be happy to help.

Please provide either:

• Request Number (REQxxxxxxx)

OR

• Your ISID`
  };
}

/**
 * =========================================
 * INCIDENT STATUS
 * =========================================
 */
if (
  classification.intent ===
  "INCIDENT_STATUS"
) {

  return {
    type: "INCIDENT_STATUS",

    reply:
`I'd be happy to help.

Please provide either:

• Incident Number (INCxxxxxxx)

OR

• Your ISID`
  };
}

/**
 * =========================================
 * GENERIC STATUS QUERY
 * =========================================
 */
if (
  classification.intent ===
  "STATUS_QUERY"
) {

  return {
    type: "STATUS_QUERY",

    reply:
`Please provide one of the following:

• User ID (ISID)

OR

• Incident Number (INCxxxxxxx)

OR

• Request Number (REQxxxxxxx)`
  };
}

      /**
       * =========================================
       * PASSWORD RESET
       * =========================================
       */
      if (
        classification.intent ===
        "PASSWORD_RESET"
      ) {

        return {
          type:
            "PASSWORD_RESET",

          reply:
            "You can reset your password using the self-service password reset portal. If your account is locked, please contact IAM Support.",
        };
      }

      /**
       * =========================================
       * KNOWLEDGE BASE QUERY
       * =========================================
       */
      if (
        classification.intent ===
        "KB_QUERY"
      ) {

        try {

          if (application) {

            const kbArticle =
              await requestService.searchKnowledgeBase(
                application,
                text
              );

            if (kbArticle) {

              return {
                type:
                  "KB_RESPONSE",

                kbArticle,

                reply:
`I found a knowledge article that may help.

Title:
${kbArticle.title}

Summary:
${kbArticle.summary}

Please try these steps before creating a ticket.`,
              };
            }
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
          type:
            "KB_RESPONSE",

          reply:
            "I could not find a matching knowledge article. Would you like me to create an incident instead?",
        };
      }

      /**
       * =========================================
       * ACCESS REQUEST
       * =========================================
       */
      if (
        classification.intent ===
        "ACCESS_REQUEST"
      ) {

        logger.info(
          "Access request detected",
          { application }
        );

        /**
         * APPLICATION NOT PROVIDED
         */
        if (!application) {

          return {
            type:
              "ASK_APPLICATION",

            workflow:
              "access_request",

            reply:
`Please provide the application name for which you need access.

Examples:
• I need access for DDAS
• SAP access required
• Need VPN access`,
          };
        }

        /**
         * VALIDATE APPLICATION
         */
        let validation = null;

        try {

          validation =
            await requestService.validateApplication(
              application
            );

          logger.info(
            "Application validation result",
            validation
          );

        } catch (error) {

          logger.warn(
            "Application validation failed",
            {
              error:
                error.message,
            }
          );
        }

        return {
          type:
            "READY_TO_CREATE_ACCESS_REQUEST",

          application,

          request: {

            application,

            assignmentGroup:
              "IAM Support",

            configurationItem:
              application,

            catalogItem:
              "Application Access",
          },

          reply:
`Application validated successfully.

Application:
${application}

Please provide your username / ISID.`,
        };
      }

      /**
       * =========================================
       * OUTAGE / MAJOR INCIDENT
       * =========================================
       */
      if (
        classification.intent ===
        "OUTAGE"
      ) {

        return {
          type:
            "MAJOR_INCIDENT",

          incident: {

            title:
              `Major outage reported for ${application || "Application"}`,

            description:
              text,

            application:
              application || "Unknown",

            assignmentGroup:
              "Major Incident Team",

            severity:
              "CRITICAL",
          },

          reply:
`A major outage has been detected for ${application || "the application"}.

A high-priority incident can be created immediately.`,
        };
      }

      /**
       * =========================================
       * INCIDENT
       * =========================================
       */
      if (
        classification.intent ===
        "INCIDENT"
      ) {

        logger.info(
          "Incident detected",
          { application }
        );

        /**
         * INCIDENT WITHOUT APP
         */
        if (!application) {

          return {
            type:
              "ASK_APPLICATION_FOR_INCIDENT",

            workflow:
              "incident",

            reply:
`Please provide the application name affected by the issue.

Examples:
• BAAMR not working
• SAP login issue
• VPN connection failed`,
          };
        }

        return {
          type:
            "READY_TO_CREATE_INCIDENT",

          incident: {

            title:
              text.substring(
                0,
                120
              ),

            description:
              text,

            application,

            assignmentGroup:
              this._resolveAssignmentGroup(
                application
              ),
          },

          reply:
`Incident detected for ${application}.

Please provide complete issue details including exact error message, screenshots, or business impact.`,
        };
      }

      /**
       * =========================================
       * SERVICE REQUEST
       * =========================================
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
       * =========================================
       * FALLBACK
       * =========================================
       */
      return {
        type:
          "UNKNOWN",

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
        type:
          "ERROR",

        reply:
          "Something went wrong while processing your request. Please try again.",
      };
    }
  }

  /**
   * =========================================
   * APPLICATION EXTRACTION
   * =========================================
   */
  _extractApplication(text = "") {

    const lower =
      text.toLowerCase();

    const applications = [

      "sap",
      "servicenow",
      "vpn",
      "outlook",
      "teams",
      "jira",
      "confluence",
      "workday",
      "salesforce",
      "oracle",
      "aws",
      "azure",
      "baamr",
      "ddas",
      "active directory",
    ];

    for (const app of applications) {

      if (
        lower.includes(app)
      ) {

        return app.toUpperCase();
      }
    }

    return null;
  }

  /**
   * =========================================
   * ASSIGNMENT GROUP ROUTING
   * =========================================
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
      app.includes("active directory") ||
      app === "ad"
    ) {

      return "IAM Support";
    }

    if (
      app.includes("ddas")
    ) {

      return "DDAS Support";
    }

    if (
      app.includes("baamr")
    ) {

      return "BAAMR Support";
    }

    return "Service Desk";
  }
}

module.exports =
  new TriageEngine();