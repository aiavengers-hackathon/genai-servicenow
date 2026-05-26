/**
 * INTENT CLASSIFICATION SERVICE
 *
 * Production-grade intent classification using Azure OpenAI with:
 * - Multiple classification categories
 * - Confidence scoring
 * - Entity extraction
 * - Fallback strategies
 * - Caching for common patterns
 */

const azureOpenAI = require("./azureOpenAI.service");
const logger = require("../../utils/logger");

const INTENT_TYPES = {
  INCIDENT: "INCIDENT",
  SERVICE_REQUEST: "SERVICE_REQUEST",
  ACCESS_REQUEST: "ACCESS_REQUEST",
  PASSWORD_RESET: "PASSWORD_RESET",
  KB_QUERY: "KB_QUERY",
  OUTAGE: "OUTAGE",
  CHANGE_REQUEST: "CHANGE_REQUEST",
  REQUEST_STATUS: "REQUEST_STATUS",
  OTHER: "OTHER",
};

const INTENT_PATTERNS = {
  // Incident patterns - more specific to actual issues
  INCIDENT: [
    /not\s+work/i,
    /broken/i,
    /error/i,
    /fail(?:ed|ure)?/i,
    /(?:is\s+)?down/i,
    /crash/i,
    /slow/i,
    /can't\s+(?:access|login|connect)/i,
    /unable\s+to\s+(?:access|login|connect)/i,
    /issue\s+with/i,
  ],
  // Access request patterns - more specific
  ACCESS_REQUEST: [
    /need\s+access\s+(?:to|for)/i,
    /request\s+access\s+(?:to|for)/i,
    /grant\s+me\s+access/i,
    /onboard/i,
    /provision/i,
    /add\s+to\s+group/i,
    /get\s+access\s+(?:to|for)/i,
    /require\s+access/i,
  ],
  // Password reset patterns
  PASSWORD_RESET: [
    /password/i,
    /reset\s+password/i,
    /forgot\s+password/i,
    /locked\s+out/i,
    /mfa/i,
    /forgot\s+mfa/i,
  ],
  // KB/How-to patterns
  KB_QUERY: [
    /how\s+to/i,
    /how\s+do\s+i/i,
    /what\s+is/i,
    /guide\s+to/i,
    /steps\s+to/i,
    /can\s+you\s+help\s+me\s+with/i,
  ],
  // Outage patterns
  OUTAGE: [
    /down\s+for\s+everyone/i,
    /all\s+users/i,
    /everyone\s+affected/i,
    /major\s+outage/i,
    /service\s+down/i,
    /unavailable/i,
  ],
  // Service request patterns
  SERVICE_REQUEST: [
    /order/i,
    /request\s+catalog/i,
    /need\s+software/i,
    /install/i,
    /license/i,
    /new\s+user/i,
  ],
  // NEW: Request status patterns
  REQUEST_STATUS: [
    /status\s+of\s+(?:my\s+)?request/i,
    /check\s+(?:my\s+)?request/i,
    /where\s+is\s+my\s+request/i,
    /my\s+request\s+status/i,
    /track\s+(?:my\s+)?request/i,
    /progress\s+of\s+(?:my\s+)?request/i,
    /open\s+requests/i,
    /pending\s+requests/i,
    /my\s+tickets/i,
    /request\s+number/i,
    /need\s+status\s+of\s+(?:my\s+)?request/i,
    /i\s+need\s+status/i,
  ],
};

// Access requests have dynamic app names — never cache them
const ACCESS_REQUEST_PATTERN = /need\s+access|request\s+access|grant\s+me\s+access/i;

// Request status queries — also don't cache (user may check different requests)
const REQUEST_STATUS_PATTERN = /status\s+of\s+(?:my\s+)?request|check\s+(?:my\s+)?request|open\s+requests|my\s+tickets|track\s+(?:my\s+)?request|need\s+status/i;

class IntentClassifier {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * CLASSIFY USER MESSAGE
   * Returns: { intent, confidence, entities, reasoning }
   */
  async classify(message, context = {}) {
    try {
      logger.debug("Classifying intent", { messageLength: message.length });

      // Skip cache for dynamic queries (access requests, status checks)
      const isAccessRequest = ACCESS_REQUEST_PATTERN.test(message);
      const isStatusQuery = REQUEST_STATUS_PATTERN.test(message);

      if (!isAccessRequest && !isStatusQuery) {
        const cached = this._getFromCache(message);
        if (cached) {
          logger.debug("Returning cached intent classification");
          return cached;
        }
      }

      // Try pattern matching first (fast path)
      const patternResult = this._classifyByPatterns(message);
      if (patternResult.confidence > 0.8) {
        logger.debug("Pattern matching confidence high", {
          confidence: patternResult.confidence,
        });

        // Only cache stable queries
        if (!isAccessRequest && !isStatusQuery) {
          this._setCache(message, patternResult);
        }

        return patternResult;
      }

      // Fall back to AI classification
      const aiResult = await this._classifyWithAI(message, context);

      // Only cache stable queries
      if (!isAccessRequest && !isStatusQuery) {
        this._setCache(message, aiResult);
      }

      return aiResult;
    } catch (error) {
      logger.error("Intent classification error", { error: error.message });
      return {
        intent: INTENT_TYPES.OTHER,
        confidence: 0.5,
        entities: {},
        reasoning: "Classification failed, defaulting to OTHER",
      };
    }
  }

  /**
   * PATTERN-BASED CLASSIFICATION (FAST PATH)
   */
  _classifyByPatterns(message) {
    const lowerMessage = message.toLowerCase();
    const scores = {};

    // Score each intent type based on pattern matches
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          matchCount++;
        }
      }
      scores[intent] = matchCount;
    }

    // Find top intent
    const topIntent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const [intent, score] = topIntent || [INTENT_TYPES.OTHER, 0];

    // Calculate confidence (0-1 scale)
    const maxPossibleMatches = Math.max(
      ...Object.values(INTENT_PATTERNS).map((p) => p.length)
    );
    const confidence = Math.min(score / maxPossibleMatches, 1);

    return {
      intent,
      confidence,
      entities: this._extractEntities(message),
      reasoning: `Pattern matching: ${score} matches for ${intent}`,
      method: "patterns",
    };
  }

  /**
   * AI-BASED CLASSIFICATION USING AZURE OPENAI
   */
  async _classifyWithAI(message, context = {}) {
    const functions = [
      {
        name: "classify_intent",
        description: "Classify the user's intent into ITSM categories",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              enum: Object.values(INTENT_TYPES),
              description: "The classified intent",
            },
            confidence: {
              type: "number",
              description: "Confidence score 0-1",
            },
            reasoning: {
              type: "string",
              description: "Why this intent was chosen",
            },
            impactedApplication: {
              type: "string",
              description: "Application/service mentioned",
            },
            severity: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
              description: "Estimated severity if incident",
            },
            isMultiUser: {
              type: "boolean",
              description: "Does this affect multiple users?",
            },
          },
          required: ["intent", "confidence", "reasoning"],
        },
      },
    ];

    const systemPrompt = `You are an enterprise ITSM AI classifier. Your job is to understand what the user needs and classify it precisely.

INTENT TYPES:
- INCIDENT: Technical issue that needs fixing (VPN down, app error, performance issue)
- SERVICE_REQUEST: Fulfill a catalog item (need software, access, laptop)
- ACCESS_REQUEST: Specific access/permission request
- PASSWORD_RESET: Password or MFA related
- KB_QUERY: How-to question, asking for steps/documentation
- OUTAGE: Widespread service disruption affecting many users
- CHANGE_REQUEST: Request to change system configuration
- REQUEST_STATUS: Checking status of open requests/tickets
- OTHER: Doesn't fit above categories

CONTEXT:
${context.userDepartment ? `User Department: ${context.userDepartment}` : ""}
${context.recentIncidents ? `Recent Incidents: ${context.recentIncidents}` : ""}

Be precise. If unsure between two intents, provide high confidence in the most likely one.`;

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ];

    try {
      const response = await azureOpenAI.chatWithFunctions(
        messages,
        functions,
        0.3
      );

      if (
        response.functionCall &&
        response.functionCall.name === "classify_intent"
      ) {
        const result = JSON.parse(response.functionCall.arguments);
        logger.debug("AI classification result", result);

        return {
          intent: result.intent,
          confidence: result.confidence,
          entities: {
            application: result.impactedApplication,
            severity: result.severity,
            isMultiUser: result.isMultiUser,
          },
          reasoning: result.reasoning,
          method: "ai",
        };
      }

      return {
        intent: INTENT_TYPES.OTHER,
        confidence: 0.5,
        entities: {},
        reasoning: "AI classification inconclusive",
        method: "ai",
      };
    } catch (error) {
      logger.error("AI classification failed", { error: error.message });
      throw error;
    }
  }

  /**
   * EXTRACT ENTITIES FROM MESSAGE
   */
  _extractEntities(message) {
    const entities = {};

    const applications = [
      "SAP",
      "Salesforce",
      "Outlook",
      "Teams",
      "VPN",
      "Cisco",
      "Active Directory",
      "AD",
      "ServiceNow",
      "Jira",
      "Slack",
      "Zoom",
      "Azure",
      "AWS",
    ];

    for (const app of applications) {
      if (new RegExp(app, "i").test(message)) {
        entities.application = app;
        break;
      }
    }

    if (
      /\ball\s+users|\beveryone|\bmajor|widespread/i.test(message)
    ) {
      entities.impact = "MULTIPLE_USERS";
    } else if (/\bme\s+only|\bjust\s+me|\bpersonal/i.test(message)) {
      entities.impact = "SINGLE_USER";
    } else {
      entities.impact = "UNKNOWN";
    }

    return entities;
  }

  /**
   * CACHE MANAGEMENT
   */
  _getFromCache(message) {
    const key = this._hashMessage(message);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  _setCache(message, data) {
    const key = this._hashMessage(message);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  _hashMessage(message) {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(message).digest("hex");
  }
}

module.exports = new IntentClassifier();