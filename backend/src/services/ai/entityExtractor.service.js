/**
 * ENTITY EXTRACTOR
 */

class EntityExtractorService {

  async extract(message) {

    const text =
      String(message || "");

    const lower =
      text.toLowerCase();

    /**
     * APPLICATION DETECTION
     */
    const applications = [];

    const knownApps = [

      "sap",
      "vpn",
      "servicenow",
      "outlook",
      "azure",
      "aws",
      "jira",
      "confluence",
      "baamr",
      "oracle",
      "workday",
      "salesforce",
      "teams",
      "citrix",
    ];

    knownApps.forEach((app) => {

      if (
        lower.includes(app)
      ) {

        applications.push({
          name: app.toUpperCase(),
        });
      }
    });

    /**
     * FALLBACK APP DETECTION
     */
    if (
      applications.length === 0
    ) {

      const patterns = [

        /access to ([a-zA-Z0-9-_]+)/i,
        /issue with ([a-zA-Z0-9-_]+)/i,
        /problem with ([a-zA-Z0-9-_]+)/i,
        /unable to access ([a-zA-Z0-9-_]+)/i,
        /cannot access ([a-zA-Z0-9-_]+)/i,
        /([a-zA-Z0-9-_]+) not working/i,
      ];

      for (const pattern of patterns) {

        const match =
          text.match(pattern);

        if (match?.[1]) {

          applications.push({
            name: match[1],
          });

          break;
        }
      }
    }

    /**
     * URGENCY
     */
    let urgency =
      "MEDIUM";

    if (
      lower.includes("critical") ||
      lower.includes("urgent")
    ) {

      urgency = "HIGH";
    }

    if (
      lower.includes("low")
    ) {

      urgency = "LOW";
    }

    return {

      applications,

      urgency,
    };
  }
}

module.exports =
  new EntityExtractorService();