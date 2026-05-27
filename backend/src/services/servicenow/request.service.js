/**
 * SERVICENOW REQUEST SERVICE
 */

const axios = require("axios");
const logger = require("../../utils/logger");

// Open request states
const OPEN_STATES = ["1", "2", "3", "4"];

class RequestService {

  constructor() {

    this.baseURL =
      process.env.SN_INSTANCE;

    this.catalogItemEndpoint =
      "/api/now/table/sc_cat_item";

    this.requestEndpoint =
      "/api/now/table/sc_request";

    this.requestItemEndpoint =
      "/api/now/table/sc_req_item";

    this.auth = {
      username:
        process.env.SN_USER,

      password:
        process.env.SN_PASS,
    };
  }

  /**
   * HUMAN READABLE STATUS
   */
  getReadableState(state, stage) {

    const normalizedStage =
      String(stage || "")
        .trim()
        .toLowerCase();

    const normalizedState =
      String(state || "")
        .trim();

    /**
     * SERVICENOW REQUEST STAGES
     */
    const stageMap = {

      requested:
        "Requested",

      request_approved:
        "Approved",

      request_cancelled:
        "Cancelled",

      fulfillment:
        "Fulfillment In Progress",

      complete:
        "Completed",

      closed_complete:
        "Completed",

      closed_incomplete:
        "Closed Incomplete",

      
      new:
        "Open",

      open:
        "Open",

      approval:
        "Pending Approval",

      pending_approval:
        "Pending Approval",

      work_in_progress:
        "Work In Progress",

      wip:
        "Work In Progress",

      in_progress:
        "In Progress",

      completed:
        "Completed",

      closed:
        "Closed",

      cancelled:
        "Cancelled",
    };

    /**
     * SERVICENOW STATES
     */
    const stateMap = {

      "1":
        "Open",

      "2":
        "Work In Progress",

      "3":
        "Pending Approval",

      "4":
        "Approved",

      "5":
        "Pending",

      "6":
        "Closed Complete",

      "7":
        "Closed Incomplete",

      "8":
        "Cancelled",
    };

    /**
     * PRIORITY:
     * stage > state
     */

    // exact stage mapping
    if (
      normalizedStage &&
      stageMap[normalizedStage]
    ) {

      return stageMap[normalizedStage];
    }

    // contains logic
    if (
      normalizedStage.includes("approval")
    ) {

      return "Pending Approval";
    }

    if (
      normalizedStage.includes("fulfillment")
    ) {

      return "Fulfillment In Progress";
    }

    if (
      normalizedStage.includes("complete")
    ) {

      return "Completed";
    }

    if (
      normalizedStage.includes("cancel")
    ) {

      return "Cancelled";
    }

    if (
      normalizedStage.includes("progress")
    ) {

      return "Work In Progress";
    }

    // fallback to state
    if (
      stateMap[normalizedState]
    ) {

      return stateMap[normalizedState];
    }

    // raw stage fallback
    if (normalizedStage) {

      return normalizedStage
        .replace(/_/g, " ")
        .replace(
          /\b\w/g,
          c => c.toUpperCase()
        );
    }

    return "Open";
  }

  /**
   * SEARCH CATALOG ITEMS
   */
  async searchCatalogItems(
    searchTerm,
    options = {}
  ) {

    try {

      const {
        maxResults = 10,
      } = options;

      const response =
        await axios.get(

          `${this.baseURL}${this.catalogItemEndpoint}`,

          {
            params: {
              sysparm_query:
                `nameLIKE${searchTerm}`,

              sysparm_limit:
                maxResults,

              sysparm_fields:
                "sys_id,name,description",
            },

            auth: this.auth,
          }
        );

      return (
        response.data.result || []
      );

    } catch (error) {

      logger.error(
        "Catalog search failed",
        {
          error:
            error.message,
        }
      );

      return [];
    }
  }

  /**
   * SEARCH APPLICATIONS
   */
  async searchApplications(appName) {

    try {

      logger.info(
        "Searching application",
        { appName }
      );

      const response =
        await axios.get(

          `${this.baseURL}/api/now/table/cmdb_ci_business_app`,

          {
            params: {

              sysparm_query:
                `nameLIKE${appName}`,

              sysparm_limit: 10,

              sysparm_fields:
                "sys_id,name,short_description,short_name",
            },

            auth: this.auth,
          }
        );

      return (
        response.data.result || []
      );

    } catch (error) {

      logger.error(
        "Application search failed",
        {
          error:
            error.message,

          appName,
        }
      );

      return [];
    }
  }

  /**
   * VALIDATE APPLICATION
   */
  async validateApplication(appName) {

    try {

      if (
        !appName ||
        appName.length < 2
      ) {

        return {
          isValid: false,

          error:
            "Invalid application name",
        };
      }

      const results =
        await this.searchApplications(
          appName
        );

      if (
        results.length === 0
      ) {

        return {
          isValid: false,

          error:
            `Application "${appName}" not found`,

          suggestions: [],
        };
      }

      const exactMatch =
        results.find(
          (app) =>

            app.name?.toLowerCase() ===
              appName.toLowerCase() ||

            app.short_name?.toLowerCase() ===
              appName.toLowerCase()
        );

      if (exactMatch) {

        return {
          isValid: true,

          application: {
            name:
              exactMatch.name,

            shortName:
              exactMatch.short_name,

            sysId:
              exactMatch.sys_id,
          },
        };
      }

      return {
        isValid: false,

        error:
          `Exact match not found for "${appName}"`,

        suggestions:
          results.map(
            (app) => ({
              name:
                app.name,

              shortName:
                app.short_name,
            })
          ),
      };

    } catch (error) {

      logger.error(
        "Application validation failed",
        {
          error:
            error.message,
        }
      );

      return {
        isValid: false,

        error:
          "Application validation failed",
      };
    }
  }

  /**
   * RESOLVE USER SYS_ID
   */
  async resolveUserSysId(
    username
  ) {

    try {

      const response =
        await axios.get(

          `${this.baseURL}/api/now/table/sys_user`,

          {
            params: {

              sysparm_query:
                `user_name=${username}`,

              sysparm_limit: 1,

              sysparm_fields:
                "sys_id,user_name,name,email",
            },

            auth: this.auth,
          }
        );

      const results =
        response.data.result || [];

      if (
        results.length > 0
      ) {

        return results[0].sys_id;
      }

      return null;

    } catch (error) {

      logger.error(
        "User sys_id lookup failed",
        {
          error:
            error.message,
        }
      );

      return null;
    }
  }

  /**
   * CHECK DUPLICATE REQUEST
   */
  async checkDuplicateRequest(
    userSysId,
    application
  ) {

    try {

      const stateQuery =
        OPEN_STATES
          .map(
            (s) => `state=${s}`
          )
          .join("^OR");

      const query = [

        `requested_for=${userSysId}`,

        `short_descriptionLIKE${application}`,

        `${stateQuery}`,

      ].join("^");

      const response =
        await axios.get(

          `${this.baseURL}${this.requestEndpoint}`,

          {
            params: {

              sysparm_query:
                query,

              sysparm_limit: 1,

              sysparm_fields:
                "number,short_description,state,stage,sys_created_on",
            },

            auth: this.auth,
          }
        );

      const results =
        response.data.result || [];

      if (
        results.length > 0
      ) {

        const existing =
          results[0];

        return {
          isDuplicate: true,

          existingRequest: {

            number:
              existing.number,

            state:
              this.getReadableState(
                existing.state,
                existing.stage
              ),

            stage:
              existing.stage,

            created:
              existing.sys_created_on,

            shortDescription:
              existing.short_description,
          },
        };
      }

      return {
        isDuplicate: false,

        existingRequest: null,
      };

    } catch (error) {

      logger.error(
        "Duplicate request check failed",
        {
          error:
            error.message,
        }
      );

      return {
        isDuplicate: false,

        existingRequest: null,
      };
    }
  }

  /**
   * SUBMIT REQUEST
   */
  async submitRequest(data) {

    try {

      logger.info(
        "Submitting request",
        { data }
      );

      const payload = {

        short_description:
          data.shortDescription ||
          data.short_description ||
          "Access Request",

        description:
          data.description ||
          "Access Request",

        requested_for:
          data.requestedFor ||
          data.requested_for ||
          "",

        priority:
          data.priority || "4",
      };

      const response =
        await axios.post(

          `${this.baseURL}${this.requestEndpoint}`,

          payload,

          {
            auth: this.auth,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );

      const request =
        response.data.result;

      logger.info(
        "Request created",
        {
          number:
            request.number,
        }
      );

      return {

        number:
          request.number,

        sys_id:
          request.sys_id,

        status:
          this.getReadableState(
            request.state,
            request.stage
          ),

        rawState:
          request.state,

        rawStage:
          request.stage,

        url:
`${this.baseURL}/nav_to.do?uri=sc_request.do?sys_id=${request.sys_id}`,
      };

    } catch (error) {

      logger.error(
        "Request creation failed",
        {
          error:
            error.response?.data ||
            error.message,
        }
      );

      throw error;
    }
  }

  /**
   * GET REQUEST STATUS
   */
  async getRequestStatus(
    requestNumber
  ) {

    try {

      const response =
        await axios.get(

          `${this.baseURL}${this.requestEndpoint}`,

          {
            params: {

              sysparm_query:
                `number=${requestNumber}`,

              sysparm_limit: 1,
            },

            auth: this.auth,
          }
        );

      const request =
        response.data.result[0];

      if (!request) {

        throw new Error(
          "Request not found"
        );
      }

      return {

        number:
          request.number,

        state:
          this.getReadableState(
            request.state,
            request.stage
          ),

        rawState:
          request.state,

        rawStage:
          request.stage,

        created:
          request.sys_created_on,
      };

    } catch (error) {

      logger.error(
        "Get request status failed",
        {
          error:
            error.message,
        }
      );

      throw error;
    }
  }

  /**
   * GET USER REQUESTS
   */
  async getUserRequests(
    userId
  ) {

    try {

      const response =
        await axios.get(

          `${this.baseURL}${this.requestEndpoint}`,

          {
            params: {

              sysparm_query:
                `requested_for=${userId}`,

              sysparm_limit: 20,

              sysparm_fields:
                "number,short_description,state,stage,sys_created_on",
            },

            auth: this.auth,
          }
        );

      return (
        response.data.result || []
      ).map((req) => ({

        number:
          req.number,

        shortDescription:
          req.short_description,

        state:
          this.getReadableState(
            req.state,
            req.stage
          ),

        rawState:
          req.state,

        rawStage:
          req.stage,

        created:
          req.sys_created_on,
      }));

    } catch (error) {

      logger.error(
        "Failed fetching user requests",
        {
          error:
            error.message,
        }
      );

      return [];
    }
  }

  /**
   * SEARCH KNOWLEDGE BASE
   */
  async searchKnowledgeBase(
    application,
    query
  ) {

    return {

      title:
        `${application} Access Guide`,

      summary:
        `Follow the documented access process for ${application}.`,
    };
  }
}

module.exports =
  new RequestService();