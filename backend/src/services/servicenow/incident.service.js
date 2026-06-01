/**
 * SERVICENOW INCIDENT SERVICE
 *
 * Intelligent Features:
 * - Create incidents
 * - Detect duplicate incidents
 * - Smart AI priority detection
 * - Human readable priorities
 * - Human readable states
 * - Get incident status
 * - Get user incidents
 * - Add comments/work notes
 * - Resolve incidents
 * - Close incidents
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
    this.baseURL =
      process.env.SN_INSTANCE ||
      "https://dev12345.service-now.com";

    this.apiEndpoint =
      "/api/now/table/incident";

    this.auth = {
      username: process.env.SN_USER,
      password: process.env.SN_PASS,
    };

    if (
      !this.auth.username ||
      !this.auth.password
    ) {
      throw new Error(
        "Missing ServiceNow credentials"
      );
    }
  }

  /**
   * COMMON CONFIG
   */
  getConfig(params = {}) {
    return {
      auth: this.auth,

      headers: {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",
      },

      params,

      timeout: 30000,
    };
  }

  /**
   * HUMAN READABLE STATE
   */
  getReadableState(state) {
    return (
      STATE_MAP[state] ||
      state ||
      "New"
    );
  }

  /**
   * HUMAN READABLE PRIORITY
   */
  getReadablePriority(priority) {
    return (
      PRIORITY_MAP[priority] ||
      priority ||
      "Medium"
    );
  }

  /**
   * CALCULATE PRIORITY
   * Used by chat.routes.js
   */
  calculatePriority(
    severity,
    isMultiUser = false
  ) {
    if (
      severity === "CRITICAL" ||
      isMultiUser
    ) {
      return {
        priority: "1",
        urgency: "1",
        impact: "1",
      };
    }

    if (severity === "HIGH") {
      return {
        priority: "2",
        urgency: "2",
        impact: "2",
      };
    }

    if (severity === "MEDIUM") {
      return {
        priority: "3",
        urgency: "3",
        impact: "3",
      };
    }

    return {
      priority: "4",
      urgency: "4",
      impact: "4",
    };
  }

  /**
   * SMART PRIORITY ANALYSIS
   */
  analyzePriority(text = "") {
    const message =
      text.toLowerCase();

    /**
     * CRITICAL
     */
    const criticalKeywords = [
      "production down",
      "system down",
      "outage",
      "unable to login",
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

    /**
     * HIGH
     */
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
    ];

    /**
     * LOW
     */
    const lowKeywords = [
      "cosmetic",
      "enhancement",
      "feature request",
      "small issue",
      "ui issue",
      "label issue",
    ];

    /**
     * CRITICAL
     */
    if (
      criticalKeywords.some((k) =>
        message.includes(k)
      )
    ) {
      return {
        severity: "CRITICAL",

        suggestedPriority:
          "Critical",

        priority: "1",

        urgency: "1",

        impact: "1",

        reason:
          "System-wide or business critical impact detected",
      };
    }

    /**
     * HIGH
     */
    if (
      highKeywords.some((k) =>
        message.includes(k)
      )
    ) {
      return {
        severity: "HIGH",

        suggestedPriority:
          "High",

        priority: "2",

        urgency: "2",

        impact: "2",

        reason:
          "Major business impact detected",
      };
    }

    /**
     * LOW
     */
    if (
      lowKeywords.some((k) =>
        message.includes(k)
      )
    ) {
      return {
        severity: "LOW",

        suggestedPriority:
          "Low",

        priority: "4",

        urgency: "4",

        impact: "4",

        reason:
          "Minor issue detected",
      };
    }

    /**
     * DEFAULT MEDIUM
     */
    return {
      severity: "MEDIUM",

      suggestedPriority:
        "Medium",

      priority: "3",

      urgency: "3",

      impact: "3",

      reason:
        "Standard business impact issue",
    };
  }

  /**
   * CREATE INCIDENT
   */
  async createIncident(data) {
    try {
      logger.info(
        "Creating incident",
        {
          shortDescription:
            data.short_description,
        }
      );

      /**
       * AI PRIORITY ANALYSIS
       */
      const priorityAnalysis =
        this.analyzePriority(`
          ${data.short_description || ""}
          ${data.description || ""}
        `);

      logger.info(
        "Priority analyzed",
        priorityAnalysis
      );

      /**
       * FORCE PRIORITY MATRIX
       * ServiceNow calculates priority
       * using impact + urgency.
       */

      let priority = "3";
      let urgency = "3";
      let impact = "3";

      /**
       * CRITICAL
       */
      if (
        priorityAnalysis.severity ===
        "CRITICAL"
      ) {
        priority = "1";
        urgency = "1";
        impact = "1";
      }

      /**
       * HIGH
       */
      else if (
        priorityAnalysis.severity ===
        "HIGH"
      ) {
        priority = "2";
        urgency = "2";
        impact = "2";
      }

      /**
       * LOW
       */
      else if (
        priorityAnalysis.severity ===
        "LOW"
      ) {
        priority = "4";
        urgency = "4";
        impact = "4";
      }

      /**
       * DEFAULT MEDIUM
       */
      else {
        priority = "3";
        urgency = "3";
        impact = "3";
      }

      logger.info(
        "Final priority mapping",
        {
          severity:
            priorityAnalysis.severity,
          priority,
          urgency,
          impact,
        }
      );

      /**
       * SERVICENOW PAYLOAD
       */
      const payload = {
        short_description:
          data.short_description,

        description:
          data.description ||
          data.short_description,

        assignment_group:
          data.assignment_group ||
          "",

        assigned_to:
          data.assigned_to ||
          "",

        /**
         * IMPORTANT
         * Send all 3 fields
         */
        priority: priority,
        urgency: urgency,
        impact: impact,

        business_service:
          data.business_service ||
          "",

        cmdb_ci:
          data.configuration_item ||
          "",

        caller_id:
          data.caller_id ||
          "",

        category:
          data.category ||
          "Software",

        subcategory:
          data.subcategory ||
          "Issue",

        contact_type:
          "virtual_agent",

        state: "1",
      };

      logger.info(
        "Incident payload",
        payload
      );

      /**
       * CREATE INCIDENT
       */
      const response =
        await axios.post(
          `${this.baseURL}${this.apiEndpoint}`,
          payload,
          this.getConfig()
        );

      const incident =
        response.data.result;

      logger.info(
        "Incident created",
        {
          number:
            incident.number,

          priority:
            incident.priority,

          urgency:
            incident.urgency,

          impact:
            incident.impact,
        }
      );

      /**
       * RETURN RESPONSE
       */
      return {
        number:
          incident.number,

        sys_id:
          incident.sys_id,

        state:
          incident.state,

        stateLabel:
          this.getReadableState(
            incident.state
          ),

        priority:
          incident.priority,

        priorityLabel:
          this.getReadablePriority(
            incident.priority
          ),

        urgency:
          incident.urgency,

        impact:
          incident.impact,

        severity:
          priorityAnalysis.severity,

        aiReason:
          priorityAnalysis.reason,

        url:
`${this.baseURL}/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}`,
      };
    } catch (error) {
      logger.error(
        "Incident creation failed",
        {
          error:
            error.response?.data ||
            error.message,
        }
      );

      throw new Error(
        "Failed to create incident"
      );
    }
  }

  /**
   * FIND DUPLICATE INCIDENTS
   */
  async findDuplicate(
    description,
    options = {}
  ) {
    try {
      const {
        maxResults = 5,
      } = options;

      const shortText =
        description.substring(0, 60);

      const query = [
        `short_descriptionLIKE${shortText}`,
        `stateIN${OPEN_STATES.join(",")}`,
      ].join("^");

      const response =
        await axios.get(
          `${this.baseURL}${this.apiEndpoint}`,
          this.getConfig({
            sysparm_query:
              query,

            sysparm_limit:
              maxResults,

            sysparm_fields:
              "sys_id,number,short_description,state,priority,assignment_group",
          })
        );

      const incidents =
        response.data.result ||
        [];

      return incidents.map(
        (inc) => ({
          number:
            inc.number,

          sys_id:
            inc.sys_id,

          title:
            inc.short_description,

          state:
            this.getReadableState(
              inc.state
            ),

          priority:
            this.getReadablePriority(
              inc.priority
            ),

          assignmentGroup:
            inc.assignment_group,
        })
      );
    } catch (error) {
      logger.warn(
        "Duplicate search failed",
        {
          error:
            error.message,
        }
      );

      return [];
    }
  }

  /**
   * GET INCIDENT
   */
  async getIncident(
    incidentNumber
  ) {
    try {
      const response =
        await axios.get(
          `${this.baseURL}${this.apiEndpoint}`,
          this.getConfig({
            sysparm_query:
              `number=${incidentNumber}`,

            sysparm_limit: 1,
          })
        );

      const incident =
        response.data.result?.[0];

      if (!incident) {
        throw new Error(
          `Incident ${incidentNumber} not found`
        );
      }

      return {
        number:
          incident.number,

        sys_id:
          incident.sys_id,

        shortDescription:
          incident.short_description,

        description:
          incident.description,

        state:
          incident.state,

        stateLabel:
          this.getReadableState(
            incident.state
          ),

        priority:
          incident.priority,

        priorityLabel:
          this.getReadablePriority(
            incident.priority
          ),

        urgency:
          incident.urgency,

        impact:
          incident.impact,

        assignmentGroup:
          incident.assignment_group,

        assignedTo:
          incident.assigned_to,

        created:
          incident.sys_created_on,

        updated:
          incident.sys_updated_on,
      };
    } catch (error) {
      logger.error(
        "Failed fetching incident",
        {
          error:
            error.message,
        }
      );

      throw error;
    }
  }

  /**
   * GET USER INCIDENTS
   */
  async getUserIncidents(
    callerId,
    limit = 10
  ) {
    try {
      const response =
        await axios.get(
          `${this.baseURL}${this.apiEndpoint}`,
          this.getConfig({
            sysparm_query:
  `caller_id=${callerId}^ORopened_by=${callerId}`,

            sysparm_limit:
              limit,

            sysparm_orderby_desc:
              "sys_created_on",

            sysparm_fields:
              "number,short_description,state,priority,sys_created_on",
          })
        );

      const incidents =
        response.data.result ||
        [];

      return incidents.map(
        (inc) => ({
          number:
            inc.number,

          shortDescription:
            inc.short_description,

          state:
            this.getReadableState(
              inc.state
            ),

          priority:
            this.getReadablePriority(
              inc.priority
            ),

          created:
            inc.sys_created_on,
        })
      );
    } catch (error) {
      logger.error(
        "Failed fetching user incidents",
        {
          error:
            error.message,
        }
      );

      return [];
    }
  }

  /**
   * UPDATE INCIDENT
   */
  async updateIncident(
    incidentNumber,
    updates
  ) {
    try {
      const incident =
        await this.getIncident(
          incidentNumber
        );

      const response =
        await axios.patch(
          `${this.baseURL}${this.apiEndpoint}/${incident.sys_id}`,
          updates,
          this.getConfig()
        );

      return response.data.result;
    } catch (error) {
      logger.error(
        "Incident update failed",
        {
          error:
            error.message,
        }
      );

      throw error;
    }
  }

  /**
   * ADD WORK NOTE
   */
  async addWorkNote(
    incidentNumber,
    note
  ) {
    return await this.updateIncident(
      incidentNumber,
      {
        work_notes: note,
      }
    );
  }

  /**
   * ADD COMMENT
   */
  async addComment(
    incidentNumber,
    comment
  ) {
    return await this.updateIncident(
      incidentNumber,
      {
        comments: comment,
      }
    );
  }

  /**
   * RESOLVE INCIDENT
   */
  async resolveIncident(
    incidentNumber,
    resolutionNotes
  ) {
    return await this.updateIncident(
      incidentNumber,
      {
        state: "6",

        close_notes:
          resolutionNotes,

        close_code:
          "Solved Permanently",
      }
    );
  }

  /**
   * CLOSE INCIDENT
   */
  async closeIncident(
    incidentNumber
  ) {
    return await this.updateIncident(
      incidentNumber,
      {
        state: "7",
      }
    );
  }
  async getUserIncidentsByUsername(username) {

  try {

    const normalizedUsername =
      String(username || "")
        .trim()
        .toLowerCase();

    const userResponse =
      await axios.get(
        `${this.baseURL}/api/now/table/sys_user`,
        {
          params: {
            sysparm_query:
              `user_name=${normalizedUsername}`,
            sysparm_limit: 1
          },
          auth: this.auth
        }
      );

    const users =
      userResponse.data.result || [];

    if (!users.length) {

      logger.warn(
        "User not found in ServiceNow",
        { username: normalizedUsername }
      );

      return [];
    }

    const userSysId =
      users[0].sys_id;

    logger.info(
      "User found",
      {
        username: normalizedUsername,
        userSysId
      }
    );

    const response =
      await axios.get(
        `${this.baseURL}${this.apiEndpoint}`,
        {
          params: {
            sysparm_query:
              
  `caller_id=${userSysId}^ORopened_by=${userSysId}`,
            sysparm_limit: 20,
            sysparm_orderby_desc:
              "sys_created_on",
            sysparm_fields:
              "number,state,priority,short_description,sys_created_on"
          },
          auth: this.auth
        }
      );

    const incidents =
      response.data.result || [];

    console.log(
  "INCIDENTS FOUND:",
  JSON.stringify(
    incidents,
    null,
    2
  )
);

logger.info(
  "Incidents found",
  {
    count: incidents.length
  }
);
return incidents.map(
      (incident) => ({
        number:
          incident.number,

        state:
          incident.state,

        stateLabel:
          this.getReadableState(
            incident.state
          ),

        priority:
          incident.priority,

        priorityLabel:
          this.getReadablePriority(
            incident.priority
          ),

        shortDescription:
          incident.short_description,

        created:
          incident.sys_created_on
      })
    );

  } catch (error) {

    logger.error(
      "User incident lookup failed",
      {
        username,
        error: error.message
      }
    );

    return [];
  }
}
}

module.exports =
  new IncidentService();