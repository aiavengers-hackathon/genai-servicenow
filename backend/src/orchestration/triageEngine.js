const IntentClassifier =
require("../services/ai/intentClassifier.service");

const EntityExtractor =
require("../services/ai/entityExtractor.service");

class TriageEngine {

  async process(message) {

    const lower =
      message.toLowerCase();

    /**
     * GREETINGS
     */
    if (
      lower.includes("hello") ||
      lower.includes("hi") ||
      lower.includes("hey")
    ) {

      return {
        type: "GREETING",

        reply:
          "Hello! I'm your AI Service Desk assistant. I can help create incidents, access requests, password resets, and service requests.",
      };
    }

    /**
     * REQUEST STATUS
     * NEW: Check for status queries BEFORE access/incident
     */
    if (
      /status\s+of\s+(?:my\s+)?request/i.test(lower) ||
      /check\s+(?:my\s+)?request/i.test(lower) ||
      /where\s+is\s+my\s+request/i.test(lower) ||
      /open\s+requests/i.test(lower) ||
      /my\s+tickets/i.test(lower) ||
      /track\s+(?:my\s+)?request/i.test(lower) ||
      /need\s+status/i.test(lower)
    ) {

      return {
        type: "REQUEST_STATUS",
        reply: "Fetching your requests...",
      };
    }

    /**
     * ACCESS REQUEST
     */
    if (
      /need\s+access\s+(?:to|for)/i.test(lower) ||
      /request\s+access\s+(?:to|for)/i.test(lower) ||
      /grant\s+me\s+access/i.test(lower) ||
      lower.includes("vpn") ||
      lower.includes("permission")
    ) {

      const entities =
        await EntityExtractor.extract(
          message
        );

      const app =
        entities.applications?.[0]?.name ||
        "BAAMR";

      return {

        type: "ACCESS_REQUEST",

        application: app,

        assignmentGroup:
          "IAM Support",

        configurationItem:
          app,

        catalogItem:
          "Application Access",

        reply:
`I detected an access request for ${app}.

Please provide your username.`,
      };
    }

    /**
     * PASSWORD RESET
     */
    if (
      lower.includes("password")
    ) {

      return {
        type: "PASSWORD_RESET",

        reply:
          "You can reset your password using the self-service portal.",
      };
    }

    /**
     * INCIDENT
     */
    return {

      type:
        "READY_TO_CREATE_INCIDENT",

      incident: {

        title:
          message.substring(0, 100),

        description:
          message,

        application:
          "General Application",

        assignmentGroup:
          "Service Desk",
      },

      reply:
`I detected a possible incident.

Please provide more details about the issue.`,
    };
  }
}

module.exports =
  new TriageEngine();