/**
 * SMART INTENT CLASSIFIER
 */

const logger =
  require("../../utils/logger");

class IntentClassifierService {

  contains(text, keywords = []) {

    return keywords.some(
      (k) => text.includes(k)
    );
  }

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
       * INCIDENT STATUS
       */
      if (
        text.includes("incident status") ||
        text.includes("status of incident") ||
        text.includes("check incident") ||
        text.match(/inc\d+/i)
      ) {

        return {
          intent: "INCIDENT_STATUS",
          confidence: 0.98,
          reasoning:
            "Incident status request",
          entities: {},
        };
      }

      /**
       * REQUEST STATUS
       */
      if (
        text.includes("request status") ||
        text.includes("status of request") ||
        text.includes("track request") ||
        text.match(/req\d+/i)
      ) {

        return {
          intent: "REQUEST_STATUS",
          confidence: 0.98,
          reasoning:
            "Request status request",
          entities: {},
        };
      }

      /**
       * MY REQUESTS
       */
      if (
        text.includes("my requests") ||
        text.includes("show requests") ||
        text.includes("list requests") ||
        text.includes("open requests")
      ) {

        return {
          intent: "MY_REQUESTS",
          confidence: 0.95,
          reasoning:
            "User requests list",
          entities: {},
        };
      }

      /**
       * MY INCIDENTS
       */
      if (
        text.includes("my incidents") ||
        text.includes("show incidents") ||
        text.includes("list incidents") ||
        text.includes("open incidents")
      ) {

        return {
          intent: "MY_INCIDENTS",
          confidence: 0.95,
          reasoning:
            "User incidents list",
          entities: {},
        };
      }

      /**
       * COMMENT INCIDENT
       */
      if (
        text.includes("add comment") ||
        text.includes("work note") ||
        text.includes("update incident")
      ) {

        return {
          intent: "COMMENT_INCIDENT",
          confidence: 0.95,
          reasoning:
            "Incident update",
          entities: {},
        };
      }

      /**
       * RESOLVE INCIDENT
       */
      if (
        text.includes("resolve incident") ||
        text.includes("mark resolved")
      ) {

        return {
          intent: "RESOLVE_INCIDENT",
          confidence: 0.95,
          reasoning:
            "Resolve incident",
          entities: {},
        };
      }

      /**
       * CLOSE INCIDENT
       */
      if (
        text.includes("close incident")
      ) {

        return {
          intent: "CLOSE_INCIDENT",
          confidence: 0.95,
          reasoning:
            "Close incident",
          entities: {},
        };
      }

      /**
       * OUTAGE
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
       * ACCESS REQUEST
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
            "Access request",
          entities: {},
        };
      }

      /**
       * INCIDENT
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
        "blocked",
        "bug",
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
            "Incident detected",
          entities: {},
        };
      }

      /**
       * PASSWORD RESET
       */
      if (
        text.includes("password reset") ||
        text.includes("forgot password") ||
        text.includes("unlock account")
      ) {

        return {
          intent:
            "PASSWORD_RESET",
          confidence: 0.95,
          reasoning:
            "Password reset",
          entities: {},
        };
      }

      /**
       * KB QUERY
       */
      if (
        text.includes("how to") ||
        text.includes("guide") ||
        text.includes("steps") ||
        text.includes("documentation")
      ) {

        return {
          intent: "KB_QUERY",
          confidence: 0.85,
          reasoning:
            "Knowledge query",
          entities: {},
        };
      }

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
      };
    }
  }
}

module.exports =
  new IntentClassifierService();