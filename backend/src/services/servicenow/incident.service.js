/**
 * SERVICENOW INCIDENT SERVICE
 *
 * Features:
 * - Create incidents
 * - Detect duplicates
 * - Smart AI priority detection
 * - Human readable priorities and states
 * - Get incident status
 * - Get user incidents
 * - Add comments/work notes
 * - Resolve and close incidents
 */

const axios = require("axios");
const logger = require("../../utils/logger");

const OPEN_STATES = ["1", "2", "3"];

const STATE_MAP = {
  "1": "New",
  "2": "In Progress",
  "3": "On Hold",
  "6": "Resolved",
  "7": "Closed",
  "8": "Canceled",
};

const PRIORITY_MAP = {
  "1": "Critical",
  "2": "High",
  "3": "Medium",
  "4": "Low",
  "5": "Planning",
};

class IncidentService {
  constructor() {
    this.baseURL = process.env.SN_INSTANCE || "https://dev12345.service-now.com";
    this.apiEndpoint = "/api/now/table/incident";
    this.auth = {
      username: process.env.SN_USER,
      password: process.env.SN_PASS,
    };
    if (!this.auth.username || !this.auth.password) {
      throw new Error("Missing ServiceNow credentials");
    }
  }

  getConfig(params = {}) {
    return {
      auth: this.auth,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      params,
      timeout: 30000,
    };
  }

  getReadableState(state) {
    return STATE_MAP[state] || state || "New";
  }

  getReadablePriority(priority) {
    return PRIORITY_MAP[priority] || priority || "Medium";
  }

  /**
   * SMART PRIORITY ANALYSIS
   */
  analyzePriority(text = "") {
    const message = String(text).toLowerCase();

    const criticalKeywords = [
      "production down",
      "system down",
      "outage",
      "all users",
      "entire team",
      "critical",
      "urgent",
      "data loss",
      "security breach",
      "server down",
      "vpn down",
      "email down",
    ];

    const highKeywords = [
      "high",
      "important",
      "blocked",
      "cannot access",
      "cannot work",
      "failing",
      "issue",
      "error",
      "slow",
      "multiple users",
      "not working",
      "failed",
      "unable to login",
    ];

    const lowKeywords = [
      "cosmetic",
      "enhancement",
      "feature request",
      "small issue",
      "ui issue",
      "label issue",
    ];

    if (criticalKeywords.some((k) => message.includes(k))) {
      return { severity: "CRITICAL", priority: "1", label: "Critical", reason: "System-wide or business critical impact detected" };
    }
    if (highKeywords.some((k) => message.includes(k))) {
      return { severity: "HIGH", priority: "2", label: "High", reason: "Major business impact detected" };
    }
    if (lowKeywords.some((k) => message.includes(k))) {
      return { severity: "LOW", priority: "4", label: "Low", reason: "Minor issue detected" };
    }
    return { severity: "MEDIUM", priority: "3", label: "Medium", reason: "Standard business impact issue" };
  }

  /**
   * CALCULATE PRIORITY FOR SERVICENOW
   */
  calculatePriority(severity, isMultiUser = false) {
    switch (severity) {
      case "CRITICAL":
      case isMultiUser && "CRITICAL":
        return { priority: "1", urgency: "1", impact: "1" };
      case "HIGH":
        return { priority: "2", urgency: "2", impact: "2" };
      case "LOW":
        return { priority: "4", urgency: "4", impact: "4" };
      default:
        return { priority: "3", urgency: "3", impact: "3" };
    }
  }

  /**
   * CREATE INCIDENT
   */
  async createIncident(data) {
    try {
      logger.info("Creating incident", { shortDescription: data.short_description });

      // Use severity from user input if provided
      let severity = data.severity || this.analyzePriority(data.short_description || data.description).severity;
      const calc = this.calculatePriority(severity);

      const payload = {
        short_description: data.short_description,
        description: data.description || data.short_description,
        assignment_group: data.assignment_group || "",
        assigned_to: data.assigned_to || "",
        priority: calc.priority,
        urgency: calc.urgency,
        impact: calc.impact,
        business_service: data.business_service || "",
        cmdb_ci: data.configuration_item || "",
        caller_id: data.caller_id || "",
        category: data.category || "Software",
        subcategory: data.subcategory || "Issue",
        contact_type: "virtual_agent",
        state: "1",
      };

      logger.info("Incident payload", payload);

      const response = await axios.post(`${this.baseURL}${this.apiEndpoint}`, payload, this.getConfig());

      const incident = response.data.result;

      logger.info("Incident created", {
        number: incident.number,
        priority: incident.priority,
        urgency: incident.urgency,
        impact: incident.impact,
      });

      return {
        number: incident.number,
        sys_id: incident.sys_id,
        state: incident.state,
        stateLabel: this.getReadableState(incident.state),
        priority: incident.priority,
        priorityLabel: this.getReadablePriority(incident.priority),
        urgency: incident.urgency,
        impact: incident.impact,
        severity: severity,
        url: `${this.baseURL}/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}`,
      };
    } catch (error) {
      logger.error("Incident creation failed", { error: error.response?.data || error.message });
      throw new Error("Failed to create incident");
    }
  }
}

module.exports = new IncidentService();