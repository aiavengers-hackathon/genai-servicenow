/**
 * ENTITY EXTRACTOR SERVICE
 */

const logger = require("../../utils/logger");

class EntityExtractorService {
  /**
   * EXTRACT ENTITIES
   */
  async extract(message) {
    try {
      const text = message.toLowerCase();

      const entities = {
        applications: [],
        urgency: null,
      };

      /**
       * APPLICATION DETECTION
       */
      const knownApps = [
        "sap",
        "servicenow",
        "vpn",
        "oracle",
        "workday",
        "azure",
        "aws",
        "active directory",
        "outlook",
        "teams",
        "jira",
        "baamr",
        "cdrsrs",
        "gimas"
      ];

      knownApps.forEach((app) => {
        if (text.includes(app)) {
          entities.applications.push({
            name: app,
          });
        }
      });

      /**
       * URGENCY DETECTION
       */
      if (
        text.includes("critical") ||
        text.includes("urgent") ||
        text.includes("production down")
      ) {
        entities.urgency = "HIGH";
      } else if (
        text.includes("medium")
      ) {
        entities.urgency = "MEDIUM";
      } else {
        entities.urgency = "LOW";
      }

      logger.info("Entities extracted", entities);

      return entities;

    } catch (error) {

      logger.error("Entity extraction failed", {
        error: error.message,
      });

      return {
        applications: [],
        urgency: "LOW",
      };
    }
  }
}

module.exports = new EntityExtractorService();