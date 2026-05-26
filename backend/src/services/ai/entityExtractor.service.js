/**
 * ENTITY EXTRACTOR SERVICE
 *
 * Extract structured entities from user messages:
 * - Applications/Services
 * - Users/Teams
 * - Dates/Times
 * - Symptom patterns
 * - Business terms
 */

const azureOpenAI = require("./azureOpenAI.service");
const logger = require("../../utils/logger");

// Known applications in enterprise environment
const KNOWN_APPLICATIONS = {
  SAP: ["sap", "sap ecc", "sap fiori", "sap gui"],
  Salesforce: ["salesforce", "sfdc", "crm"],
  Outlook: ["outlook", "email", "mail", "exchange"],
  Teams: ["teams", "microsoft teams", "teams chat"],
  VPN: ["vpn", "cisco vpn", "anyconnect", "vpn gateway"],
  Active_Directory: ["active directory", "ad", "domain", "ldap"],
  ServiceNow: ["servicenow", "snow"],
  Azure: ["azure", "az", "cloud", "azure portal"],
  AWS: ["aws", "amazon web services"],
  Jira: ["jira", "ticket tracking"],
  Slack: ["slack", "slack workspace"],
  Zoom: ["zoom", "video conferencing"],
  SharePoint: ["sharepoint", "share point", "sp"],
  OneDrive: ["onedrive", "one drive"],
  SQL_Server: ["sql server", "sql", "database"],
  Windows: ["windows", "windows server", "domain controller"],
};

class EntityExtractor {
  /**
   * EXTRACT ALL ENTITIES FROM MESSAGE
   * Returns: { applications, users, timeframes, symptoms, businessTerms, severity }
   */
  async extract(message) {
    try {
      logger.debug("Extracting entities", { messageLength: message.length });

      // Fast path: pattern-based extraction
      const entities = this._extractByPatterns(message);

      // Enhanced extraction if high complexity
      if (message.length > 200) {
        await this._enhanceWithAI(message, entities);
      }

      return entities;
    } catch (error) {
      logger.error("Entity extraction error", { error: error.message });
      return this._extractByPatterns(message);
    }
  }

  /**
   * PATTERN-BASED EXTRACTION (FAST PATH)
   */
  _extractByPatterns(message) {
    const lowerMessage = message.toLowerCase();

    return {
      applications: this._extractApplications(lowerMessage),
      symptoms: this._extractSymptoms(message),
      impact: this._extractImpact(lowerMessage),
      urgency: this._extractUrgency(lowerMessage),
      users: this._extractUsers(message),
      timeframes: this._extractTimeframes(message),
    };
  }

  /**
   * EXTRACT APPLICATION MENTIONS
   * - First checks known applications list
   * - Falls back to regex pattern to capture unknown app names (e.g. BAAMR, CRDSRS)
   */
  _extractApplications(lowerMessage) {
    const mentioned = [];

    // Check known applications
    for (const [appName, aliases] of Object.entries(KNOWN_APPLICATIONS)) {
      for (const alias of aliases) {
        if (lowerMessage.includes(alias)) {
          mentioned.push({
            name: appName,
            alias,
            confidence: 0.9,
          });
          break; // Avoid duplicates
        }
      }
    }

    // FIX: If no known app found, extract unknown app name from access request pattern
    // Handles messages like "I need access for BAAMR" or "request access to CRDSRS"
    if (mentioned.length === 0) {
      const accessPattern =
        /(?:access\s+(?:to\s+|for\s+)|access\s+)([A-Z0-9_-]{2,})/i;
      const match = lowerMessage.match(accessPattern);
      if (match) {
        mentioned.push({
          name: match[1].toUpperCase(),
          alias: match[1],
          confidence: 0.75,
          source: "pattern",
        });
      }
    }

    // Remove duplicates by application name
    return mentioned.reduce((unique, item) => {
      if (!unique.find((u) => u.name === item.name)) {
        unique.push(item);
      }
      return unique;
    }, []);
  }

  /**
   * EXTRACT SYMPTOMS/ISSUES
   */
  _extractSymptoms(message) {
    const symptoms = [];

    const symptomPatterns = {
      PERFORMANCE: [
        /slow/i,
        /lag/i,
        /timeout/i,
        /takes.*minutes/i,
        /hang/i,
      ],
      CONNECTIVITY: [
        /can't connect/i,
        /cannot access/i,
        /connection refused/i,
        /unreachable/i,
        /not reachable/i,
      ],
      AUTHENTICATION: [
        /login.*fail/i,
        /can't login/i,
        /authentication fail/i,
        /password.*wrong/i,
        /unauthorized/i,
      ],
      DATA_ISSUE: [
        /missing data/i,
        /data loss/i,
        /records missing/i,
        /deleted/i,
      ],
      ERROR: [
        /error/i,
        /exception/i,
        /crash/i,
        /failed/i,
        /broken/i,
      ],
      AVAILABILITY: [
        /down/i,
        /offline/i,
        /unavailable/i,
        /not working/i,
      ],
    };

    for (const [symptom, patterns] of Object.entries(symptomPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          symptoms.push(symptom);
          break;
        }
      }
    }

    return symptoms;
  }

  /**
   * EXTRACT IMPACT SCOPE
   */
  _extractImpact(lowerMessage) {
    if (
      /\ball users|everyone|entire organization|global|enterprise/i.test(
        lowerMessage
      )
    ) {
      return {
        scope: "ORGANIZATION",
        estimatedUsers: "All",
      };
    }

    if (/my team|our department|our group/i.test(lowerMessage)) {
      return {
        scope: "DEPARTMENT",
        estimatedUsers: "10-50",
      };
    }

    if (/\bme|just me|only me|i am/i.test(lowerMessage)) {
      return {
        scope: "INDIVIDUAL",
        estimatedUsers: "1",
      };
    }

    // Try to extract number of users
    const userMatch = lowerMessage.match(/(\d+)\s+users?/);
    if (userMatch) {
      const count = parseInt(userMatch[1]);
      let scope = "INDIVIDUAL";
      if (count > 50) scope = "DEPARTMENT";
      if (count > 100) scope = "ORGANIZATION";

      return {
        scope,
        estimatedUsers: count.toString(),
      };
    }

    return {
      scope: "UNKNOWN",
      estimatedUsers: "Unknown",
    };
  }

  /**
   * EXTRACT URGENCY INDICATORS
   */
  _extractUrgency(lowerMessage) {
    if (/emergency|critical|severe|down|cannot work/i.test(lowerMessage)) {
      return "CRITICAL";
    }

    if (/urgent|asap|blocking|blocked/i.test(lowerMessage)) {
      return "HIGH";
    }

    if (/soon|important|production/i.test(lowerMessage)) {
      return "MEDIUM";
    }

    return "LOW";
  }

  /**
   * EXTRACT USER REFERENCES
   */
  _extractUsers(message) {
    const users = [];

    // Email pattern
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = message.match(emailPattern) || [];
    users.push(...emails.map((e) => ({ type: "email", value: e })));

    // User mentions like @john, @team, etc.
    const mentionPattern = /@([a-zA-Z_]\w*)/g;
    const mentions = message.matchAll(mentionPattern);
    for (const match of mentions) {
      users.push({ type: "mention", value: match[1] });
    }

    return users;
  }

  /**
   * EXTRACT TIME REFERENCES
   */
  _extractTimeframes(message) {
    const timeframes = [];

    if (/today|right now|immediately/i.test(message)) {
      timeframes.push("TODAY");
    }

    if (/tomorrow/i.test(message)) {
      timeframes.push("TOMORROW");
    }

    if (/this week|next few days/i.test(message)) {
      timeframes.push("THIS_WEEK");
    }

    if (/next week|asap|urgent/i.test(message)) {
      timeframes.push("URGENT");
    }

    // Specific dates
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
    const dates = message.match(datePattern) || [];
    timeframes.push(
      ...dates.map((d) => ({ type: "specific_date", value: d }))
    );

    return timeframes;
  }

  /**
   * ENHANCE EXTRACTION WITH AI (FOR COMPLEX MESSAGES)
   */
  async _enhanceWithAI(message, entities) {
    try {
      const functions = [
        {
          name: "extract_entities",
          description: "Extract additional entities from message",
          parameters: {
            type: "object",
            properties: {
              applications: {
                type: "array",
                items: { type: "string" },
                description: "Business applications or services mentioned",
              },
              businessTerms: {
                type: "array",
                items: { type: "string" },
                description: "Business or technical terms used",
              },
              additionalContext: {
                type: "string",
                description: "Additional context about the issue",
              },
            },
          },
        },
      ];

      const response = await azureOpenAI.chatWithFunctions(
        [
          {
            role: "system",
            content:
              "Extract business and technical entities from the user message.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        functions,
        0.3
      );

      if (response.functionCall) {
        const result = JSON.parse(response.functionCall.arguments);

        if (result.applications?.length > 0) {
          const aiApps = result.applications.map((app) => ({
            name: app,
            confidence: 0.7,
            source: "ai",
          }));
          entities.applications.push(...aiApps);
        }

        if (result.businessTerms?.length > 0) {
          entities.businessTerms = result.businessTerms;
        }

        if (result.additionalContext) {
          entities.context = result.additionalContext;
        }
      }
    } catch (error) {
      logger.warn("AI entity enhancement failed", { error: error.message });
      // Continue with pattern-based results
    }
  }
}

module.exports = new EntityExtractor();