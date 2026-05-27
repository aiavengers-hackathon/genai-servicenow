/**
 * INTENT CLASSIFIER SERVICE
 */

const logger = require("../../utils/logger");

class IntentClassifierService {

  /**
   * CLASSIFY USER MESSAGE
   */
  async classify(message) {

    try {

      if (!message) {
        return {
          intent: "UNKNOWN",
          confidence: 0,
        };
      }

      const text = String(message).toLowerCase();

      logger.info("Classifying intent", {
        message: text,
      });

      /**
       * ACCESS REQUEST
       */
      if (
        text.includes("access") ||
        text.includes("give access") ||
        text.includes("request access") ||
        text.includes("application access")
      ) {

        return {
          intent: "ACCESS_REQUEST",
          confidence: 0.95,
          reasoning: "Detected access request keywords",
          entities: {},
        };
      }

      /**
       * INCIDENT
       */
      if (
        text.includes("not working") ||
        text.includes("issue") ||
        text.includes("error") ||
        text.includes("failed") ||
        text.includes("problem") ||
        text.includes("unable") ||
        text.includes("down")
      ) {

        return {
          intent: "INCIDENT",
          confidence: 0.90,
          reasoning: "Detected incident/problem keywords",
          entities: {},
        };
      }

      /**
       * PASSWORD RESET
       */
      if (
        text.includes("password") ||
        text.includes("reset password") ||
        text.includes("forgot password")
      ) {

        return {
          intent: "PASSWORD_RESET",
          confidence: 0.96,
          reasoning: "Detected password reset request",
          entities: {},
        };
      }

      /**
       * REQUEST STATUS
       */
      if (
        text.includes("request status") ||
        text.includes("track request") ||
        text.includes("request update")
      ) {

        return {
          intent: "REQUEST_STATUS",
          confidence: 0.92,
          reasoning: "Detected request status query",
          entities: {},
        };
      }

      /**
       * INCIDENT STATUS
       */
      if (
        text.includes("incident status") ||
        text.includes("track incident") ||
        text.includes("check incident")
      ) {

        return {
          intent: "INCIDENT_STATUS",
          confidence: 0.92,
          reasoning: "Detected incident status query",
          entities: {},
        };
      }

      /**
       * KNOWLEDGE BASE QUERY
       */
      if (
        text.includes("how to") ||
        text.includes("guide") ||
        text.includes("help") ||
        text.includes("steps")
      ) {

        return {
          intent: "KB_QUERY",
          confidence: 0.85,
          reasoning: "Detected knowledge/help query",
          entities: {},
        };
      }

      /**
       * OUTAGE
       */
      if (
        text.includes("outage") ||
        text.includes("system down") ||
        text.includes("production down") ||
        text.includes("multiple users")
      ) {

        return {
          intent: "OUTAGE",
          confidence: 0.97,
          reasoning: "Detected outage/major incident",
          entities: {},
        };
      }

      /**
       * SERVICE REQUEST
       */
      if (
        text.includes("laptop") ||
        text.includes("software install") ||
        text.includes("new monitor") ||
        text.includes("request software")
      ) {

        return {
          intent: "SERVICE_REQUEST",
          confidence: 0.88,
          reasoning: "Detected service request",
          entities: {},
        };
      }

      /**
       * UNKNOWN
       */
      return {
        intent: "UNKNOWN",
        confidence: 0.30,
        reasoning: "No matching intent found",
        entities: {},
      };

    } catch (error) {

      logger.error("Intent classification failed", {
        error: error.message,
      });

      return {
        intent: "UNKNOWN",
        confidence: 0,
        reasoning: "Classifier exception",
        entities: {},
      };
    }
  }
}

module.exports = new IntentClassifierService();