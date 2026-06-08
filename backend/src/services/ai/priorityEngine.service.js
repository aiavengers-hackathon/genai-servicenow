/**
 * PRIORITY ENGINE SERVICE
 * 
 * Calculate incident priority/urgency based on:
 * - Impact (Single User, Department, Division, Enterprise)
 * - Urgency (Low, Medium, High, Critical)
 * - Business Criticality (from CMDB)
 * - Time of Day / Business Hours
 * - Historical patterns
 */

const logger = require("../../utils/logger");

// Priority Matrix: Impact x Urgency
const PRIORITY_MATRIX = {
  // [Impact][Urgency] => Priority (1=Highest, 5=Lowest)
  ENTERPRISE: { CRITICAL: 1, HIGH: 1, MEDIUM: 2, LOW: 3 },
  DIVISION: { CRITICAL: 1, HIGH: 2, MEDIUM: 2, LOW: 3 },
  DEPARTMENT: { CRITICAL: 2, HIGH: 2, MEDIUM: 3, LOW: 4 },
  INDIVIDUAL: { CRITICAL: 2, HIGH: 3, MEDIUM: 4, LOW: 5 },
};

const SEVERITY_MAPPING = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Planning",
};

class PriorityEngine {
  /**
   * CALCULATE PRIORITY
   * Returns: { priority: 1-5, severity, urgency, impact, reasoning }
   */
  calculatePriority(data) {
    try {
      logger.debug("Calculating priority", { data });

      // Extract inputs
      const {
        impact = "INDIVIDUAL",
        urgency = "MEDIUM",
        businessCriticality = "LOW",
        affectedUsers = 1,
        isOutage = false,
        isDataLoss = false,
        isSecurityIssue = false,
        timeOfDay = this._getTimeOfDay(),
      } = data;

      let baseUrgency = urgency;

      // Escalate urgency based on special conditions
      if (isOutage && affectedUsers > 10) {
        baseUrgency = "CRITICAL";
      } else if (isSecurityIssue) {
        baseUrgency = "CRITICAL";
      } else if (isDataLoss) {
        baseUrgency = "CRITICAL";
      } else if (affectedUsers > 100) {
        baseUrgency = "HIGH";
      }

      // Adjust based on business criticality
      if (businessCriticality === "CRITICAL") {
        baseUrgency = this._escalateUrgency(baseUrgency);
      }

      // Get priority from matrix
      const priority = PRIORITY_MATRIX[impact]?.[baseUrgency] || 4;

      // Adjust for business hours
      const businessHoursMultiplier = this._getBusinessHoursMultiplier(timeOfDay);
      const adjustedPriority = Math.max(1, priority - businessHoursMultiplier);

      const reasoning = this._buildReasoning({
        impact,
        urgency: baseUrgency,
        businessCriticality,
        affectedUsers,
        isOutage,
        isDataLoss,
        isSecurityIssue,
      });

      return {
        priority: Math.round(adjustedPriority),
        severity: SEVERITY_MAPPING[Math.round(adjustedPriority)],
        urgency: baseUrgency,
        impact,
        affectedUsers,
        reasoning,
        sla: this._getSLA(Math.round(adjustedPriority)),
      };
    } catch (error) {
      logger.error("Priority calculation error", { error: error.message });
      return {
        priority: 3,
        severity: SEVERITY_MAPPING[3],
        urgency: "MEDIUM",
        impact: "UNKNOWN",
        reasoning: "Error during calculation, defaulting to Medium",
        sla: "8 hours",
      };
    }
  }

  /**
   * CLASSIFY IMPACT LEVEL BASED ON AFFECTED USERS & SCOPE
   */
  classifyImpact(data) {
    const {
      affectedUsers = 1,
      affectedDepartments = [],
      isSystemWide = false,
      criticalService = false,
    } = data;

    if (isSystemWide) {
      return "ENTERPRISE";
    }

    if (affectedUsers > 50 || affectedDepartments.length > 3) {
      return "DIVISION";
    }

    if (affectedUsers > 5 || affectedDepartments.length > 0) {
      return "DEPARTMENT";
    }

    return "INDIVIDUAL";
  }

  /**
   * CLASSIFY URGENCY BASED ON KEYWORDS & CONTEXT
   */
  classifyUrgency(message) {
    const urgencyKeywords = {
      CRITICAL: [
        /critical/i,
        /emergency/i,
        /severe/i,
        /down/i,
        /everyone/i,
        /all\s+users/i,
        /entire/i,
        /cannot\s+work/i,
      ],
      HIGH: [
        /urgent/i,
        /asap/i,
        /immediately/i,
        /blocking/i,
        /blocked/i,
        /prevent/i,
      ],
      MEDIUM: [
        /soon/i,
        /important/i,
        /production/i,
        /business\s+hours/i,
      ],
      LOW: [/low\s+priority/i, /whenever/i, /not\s+urgent/i],
    };

    for (const [level, keywords] of Object.entries(urgencyKeywords)) {
      for (const keyword of keywords) {
        if (keyword.test(message)) {
          return level;
        }
      }
    }

    return "MEDIUM";
  }

  /**
   * GET SERVICE LEVEL AGREEMENT (SLA) BASED ON PRIORITY
   */
  _getSLA(priority) {
    const slaMap = {
      1: "1 hour",
      2: "4 hours",
      3: "8 hours",
      4: "24 hours",
      5: "72 hours",
    };
    return slaMap[priority] || "24 hours";
  }

  /**
   * ESCALATE URGENCY LEVEL
   */
  _escalateUrgency(urgency) {
    const escalation = {
      LOW: "MEDIUM",
      MEDIUM: "HIGH",
      HIGH: "CRITICAL",
      CRITICAL: "CRITICAL",
    };
    return escalation[urgency] || urgency;
  }

  /**
   * ADJUST PRIORITY BASED ON BUSINESS HOURS
   */
  _getBusinessHoursMultiplier(timeOfDay) {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    // Weekend or after hours = lower priority (higher number = lower priority)
    if (dayOfWeek === 0 || dayOfWeek === 6) return -0.5; // Weekend
    if (hour < 6 || hour > 18) return -0.3; // After hours

    return 0; // Business hours
  }

  /**
   * GET CURRENT TIME OF DAY
   */
  _getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return "MORNING";
    if (hour < 18) return "AFTERNOON";
    return "EVENING";
  }

  /**
   * BUILD REASONING EXPLANATION
   */
  _buildReasoning(data) {
    const parts = [];

    parts.push(`Impact: ${data.impact} (${data.affectedUsers} users)`);

    if (data.isOutage) {
      parts.push("This is a service outage");
    }

    if (data.isSecurityIssue) {
      parts.push("Security issue detected");
    }

    if (data.isDataLoss) {
      parts.push("Potential data loss");
    }

    if (data.businessCriticality === "CRITICAL") {
      parts.push("Critical business service affected");
    }

    return parts.join(" | ");
  }
}

module.exports = new PriorityEngine();
