/**
 * SMART INTENT CLASSIFIER
 */

const logger =
  require("../../utils/logger");

class IntentClassifierService {

  /**
   * CHECK KEYWORDS
   */
  contains(text, keywords = []) {

    return keywords.some(
      (k) => text.includes(k)
    );
  }

  /**
   * CLASSIFY
   */
  async classify(message) {

    try {

      if (!message) {

        return {
          intent: "UNKNOWN",
          confidence: 0,
        };
      }

      const text =
        String(message)
          .toLowerCase()
          .trim();

      logger.info(
        "Classifying intent",
        { text }
      );

      /**
       * =====================================
       * MAJOR OUTAGE
       * =====================================
       */
      const outageKeywords = [

        "system down",
        "production down",
        "outage",
        "all users impacted",
        "multiple users",
        "server down",
        "site down",
        "critical outage",
      ];

      if (
        this.contains(
          text,
          outageKeywords
        )
      ) {

        return {
          intent: "OUTAGE",
          confidence: 0.99,
          reasoning:
            "Major outage detected",
          entities: {},
        };
      }

      /**
       * =====================================
       * INCIDENT
       * =====================================
       */
      const incidentKeywords = [

        "issue",
        "problem",
        "error",
        "failed",
        "failure",
        "unable",
        "cannot",
        "can't",
        "not working",
        "down",
        "slow",
        "bug",
        "blocked",
        "exception",
        "access issue",
        "unable to access",
        "cannot access",
        "login issue",
        "login failed",
        "vpn not working",
      ];

      if (
        this.contains(
          text,
          incidentKeywords
        )
      ) {

        return {
          intent: "INCIDENT",
          confidence: 0.95,
          reasoning:
            "Incident keywords detected",
          entities: {},
        };
      }

      /**
       * =====================================
       * ACCESS REQUEST
       * =====================================
       */
      const accessKeywords = [

        "request access",
        "need access",
        "provide access",
        "grant access",
        "application access",
        "vpn access",
        "shared folder access",
      ];

      if (
        this.contains(
          text,
          accessKeywords
        )
      ) {

        return {
          intent:
            "ACCESS_REQUEST",

          confidence: 0.95,

          reasoning:
            "Access request detected",

          entities: {},
        };
      }

      /**
       * =====================================
       * SERVICE REQUEST
       * =====================================
       */
      const serviceKeywords = [

        "new laptop",
        "laptop request",
        "software install",
        "install software",
        "new monitor",
        "mouse request",
        "keyboard request",
        "hardware request",
        "service request",
      ];

      if (
        this.contains(
          text,
          serviceKeywords
        )
      ) {

        return {
          intent:
            "SERVICE_REQUEST",

          confidence: 0.90,

          reasoning:
            "Service request detected",

          entities: {},
        };
      }

      /**
       * =====================================
       * PASSWORD RESET
       * =====================================
       */
      const passwordKeywords = [

        "password reset",
        "forgot password",
        "reset password",
        "unlock account",
      ];

      if (
        this.contains(
          text,
          passwordKeywords
        )
      ) {

        return {
          intent:
            "PASSWORD_RESET",

          confidence: 0.98,

          reasoning:
            "Password reset detected",

          entities: {},
        };
      }

      /**
       * =====================================
       * INCIDENT STATUS
       * =====================================
       */
      const incidentStatusKeywords = [

        "incident status",
        "check incident",
        "track incident",
      ];

      if (
        this.contains(
          text,
          incidentStatusKeywords
        )
      ) {

        return {
          intent:
            "INCIDENT_STATUS",

          confidence: 0.95,

          reasoning:
            "Incident status query",

          entities: {},
        };
      }

      /**
       * =====================================
       * REQUEST STATUS
       * =====================================
       */
      const requestStatusKeywords = [

        "request status",
        "track request",
        "request update",
      ];

      if (
        this.contains(
          text,
          requestStatusKeywords
        )
      ) {

        return {
          intent:
            "REQUEST_STATUS",

          confidence: 0.95,

          reasoning:
            "Request status query",

          entities: {},
        };
      }

      /**
       * =====================================
       * KB QUERY
       * =====================================
       */
      const kbKeywords = [

        "how to",
        "guide",
        "steps",
        "documentation",
        "help",
      ];

      if (
        this.contains(
          text,
          kbKeywords
        )
      ) {

        return {
          intent:
            "KB_QUERY",

          confidence: 0.80,

          reasoning:
            "Knowledge query detected",

          entities: {},
        };
      }

      /**
       * =====================================
       * UNKNOWN
       * =====================================
       */
      return {

        intent: "UNKNOWN",

        confidence: 0.30,

        reasoning:
          "No matching intent",

        entities: {},
      };

    } catch (error) {

      logger.error(
        "Intent classification failed",
        {
          error:
            error.message,
        }
      );

      return {

        intent: "UNKNOWN",

        confidence: 0,

        reasoning:
          "Classifier exception",

        entities: {},
      };
    }
  }
}

module.exports =
  new IntentClassifierService();