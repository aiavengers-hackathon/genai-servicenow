/**
 * SERVICENOW INCIDENT SERVICE
 * 
 * Production-grade incident management with:
 * - Create incidents with full details
 * - Find duplicate/similar incidents
 * - Update incident status
 * - Add comments and notes
 * - Assign to groups
 */

const axios = require("axios");
const logger = require("../../utils/logger");

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

  /**
   * CREATE INCIDENT
   */
  async createIncident(data) {
    try {
      const {
        short_description,
        description,
        assignment_group,
        assigned_to,
        priority = 3,
        urgency = 3,
        impact = 3,
        business_service,
        configuration_item,
        caller_id,
        category = "Software",
        subcategory = "Issue",
        problem_type = "Problem",
      } = data;

      logger.debug("Creating incident", { short_description });

      const payload = {
        short_description,
        description: description || short_description,
        assignment_group,
        assigned_to,
        priority,
        urgency,
        impact,
        business_service,
        cmdb_ci: configuration_item,
        caller_id,
        category,
        subcategory,
        type: problem_type,
        state: "New", // New = 1
      };

      const response = await axios.post(`${this.baseURL}${this.apiEndpoint}`, payload, {
        auth: this.auth,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const incident = response.data.result;

      logger.info("Incident created successfully", {
        incidentNumber: incident.number,
        sysId: incident.sys_id,
      });

      return {
        number: incident.number,
        sys_id: incident.sys_id,
        state: incident.state,
        url: `${this.baseURL}/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}`,
      };
    } catch (error) {
      logger.error("Incident creation failed", {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * FIND DUPLICATE/SIMILAR INCIDENTS
   */
  async findDuplicate(description, options = {}) {
    try {
      const { maxResults = 5, daysBack = 7 } = options;

      logger.debug("Searching for duplicate incidents", { description: description.substring(0, 50) });

      // Search for open incidents from last N days with similar descriptions
      const nDaysAgo = new Date();
      nDaysAgo.setDate(nDaysAgo.getDate() - daysBack);

      const query = `short_descriptionLIKE${description.substring(0, 50)}&ORdescriptionLIKE${description.substring(0, 50)}&stateIN1,2,4&sys_created_onONORBEFORE${nDaysAgo.toISOString()}`;

      const response = await axios.get(`${this.baseURL}${this.apiEndpoint}`, {
        params: {
          sysparm_query: query,
          sysparm_limit: maxResults,
          sysparm_fields: "number,short_description,state,priority,assigned_to,assignment_group",
        },
        auth: this.auth,
      });

      const incidents = response.data.result || [];

      logger.debug("Found similar incidents", { count: incidents.length });

      return incidents.map((inc) => ({
        number: inc.number,
        sys_id: inc.sys_id,
        title: inc.short_description,
        state: inc.state,
        priority: inc.priority,
        assignedTo: inc.assigned_to,
        assignmentGroup: inc.assignment_group,
      }));
    } catch (error) {
      logger.warn("Duplicate search failed", { error: error.message });
      return [];
    }
  }

  /**
   * GET INCIDENT DETAILS
   */
  async getIncident(incidentNumber) {
    try {
      logger.debug("Fetching incident", { incidentNumber });

      const response = await axios.get(`${this.baseURL}${this.apiEndpoint}`, {
        params: {
          sysparm_query: `number=${incidentNumber}`,
          sysparm_limit: 1,
        },
        auth: this.auth,
      });

      const incident = response.data.result[0];

      if (!incident) {
        throw new Error(`Incident ${incidentNumber} not found`);
      }

      return incident;
    } catch (error) {
      logger.error("Failed to get incident", { error: error.message });
      throw error;
    }
  }

  /**
   * UPDATE INCIDENT
   */
  async updateIncident(incidentNumber, updates) {
    try {
      logger.debug("Updating incident", { incidentNumber, updates });

      // First get the sys_id
      const incident = await this.getIncident(incidentNumber);

      const response = await axios.patch(
        `${this.baseURL}${this.apiEndpoint}/${incident.sys_id}`,
        updates,
        {
          auth: this.auth,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      logger.info("Incident updated", { incidentNumber });
      return response.data.result;
    } catch (error) {
      logger.error("Incident update failed", { error: error.message });
      throw error;
    }
  }

  /**
   * ADD WORK NOTE (INTERNAL COMMENT)
   */
  async addWorkNote(incidentNumber, note) {
    try {
      logger.debug("Adding work note", { incidentNumber });

      return await this.updateIncident(incidentNumber, {
        work_notes: note,
      });
    } catch (error) {
      logger.error("Failed to add work note", { error: error.message });
      throw error;
    }
  }

  /**
   * ADD COMMENT (VISIBLE TO USER)
   */
  async addComment(incidentNumber, comment) {
    try {
      logger.debug("Adding comment", { incidentNumber });

      return await this.updateIncident(incidentNumber, {
        comments: comment,
      });
    } catch (error) {
      logger.error("Failed to add comment", { error: error.message });
      throw error;
    }
  }

  /**
   * RESOLVE INCIDENT
   */
  async resolveIncident(incidentNumber, resolutionNotes) {
    try {
      logger.debug("Resolving incident", { incidentNumber });

      return await this.updateIncident(incidentNumber, {
        state: "Resolved", // 6
        resolution_notes: resolutionNotes,
        resolved_by: process.env.SN_BOT_USER || "AI Agent",
      });
    } catch (error) {
      logger.error("Failed to resolve incident", { error: error.message });
      throw error;
    }
  }

  /**
   * CLOSE INCIDENT
   */
  async closeIncident(incidentNumber) {
    try {
      logger.debug("Closing incident", { incidentNumber });

      return await this.updateIncident(incidentNumber, {
        state: "Closed", // 7
      });
    } catch (error) {
      logger.error("Failed to close incident", { error: error.message });
      throw error;
    }
  }
}

module.exports = new IncidentService();
