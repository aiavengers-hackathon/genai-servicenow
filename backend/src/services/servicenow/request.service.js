/**
 * SERVICENOW REQUEST SERVICE
 */

const axios = require("axios");
const logger = require("../../utils/logger");

// Open request states in ServiceNow:
// 1 = Open, 2 = Work in Progress, 3 = Pending Approval
// 4 = Approved, 6 = Closed Complete, 7 = Closed Incomplete, 8 = Cancelled
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
      username: process.env.SN_USER,
      password: process.env.SN_PASS,
    };
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
        { error: error.message }
      );

      return [];
    }
  }

  /**
   * RESOLVE USERNAME TO SYS_ID
   *
   * ServiceNow stores requested_for as a sys_id reference,
   * not a plain username. This queries sys_user table
   * by user_name to get the sys_id.
   *
   * Returns: sys_id string or null if user not found
   */
  async resolveUserSysId(username) {

    try {

      logger.info(
        "Resolving user sys_id",
        { username }
      );

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

      if (results.length > 0) {

        const user = results[0];

        logger.info(
          "User sys_id resolved",
          {
            username,
            sysId: user.sys_id,
            displayName: user.name,
          }
        );

        return user.sys_id;
      }

      logger.warn(
        "User not found in ServiceNow",
        { username }
      );

      return null;

    } catch (error) {

      logger.error(
        "Failed to resolve user sys_id",
        { error: error.message }
      );

      return null;
    }
  }

  /**
   * CHECK DUPLICATE REQUEST
   *
   * Expects userSysId (already resolved sys_id),
   * not a plain username. Call resolveUserSysId() first.
   *
   * Returns: { isDuplicate, existingRequest }
   */
  async checkDuplicateRequest(
    userSysId,
    application
  ) {

    try {

      logger.info(
        "Checking for duplicate request",
        { userSysId, application }
      );

      const stateQuery = OPEN_STATES
        .map((s) => `state=${s}`)
        .join("^OR");

      const query = [
        `requested_for=${userSysId}`,
        `short_descriptionLIKE${application}`,
        `${stateQuery}`,
      ].join("^");

      logger.info(
        "Duplicate check query",
        { query }
      );

      const response =
        await axios.get(

          `${this.baseURL}${this.requestEndpoint}`,

          {
            params: {

              sysparm_query: query,

              sysparm_limit: 1,

              sysparm_fields:
                "number,short_description,state,sys_created_on,stage",
            },

            auth: this.auth,
          }
        );

      const results =
        response.data.result || [];

      if (results.length > 0) {

        const existing = results[0];

        logger.info(
          "Duplicate request found",
          {
            number: existing.number,
            state: existing.state,
          }
        );

        return {
          isDuplicate: true,
          existingRequest: {
            number: existing.number,
            state: existing.state,
            stage: existing.stage,
            created: existing.sys_created_on,
            shortDescription:
              existing.short_description,
          },
        };
      }

      logger.info(
        "No duplicate found",
        { userSysId, application }
      );

      return {
        isDuplicate: false,
        existingRequest: null,
      };

    } catch (error) {

      logger.error(
        "Duplicate check failed",
        { error: error.message }
      );

      // Fail open — allow request if check errors
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
        { number: request.number }
      );

      return {

        number:
          request.number,

        sys_id:
          request.sys_id,

        status:
          request.state,

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
  async getRequestStatus(requestNumber) {

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
        throw new Error("Request not found");
      }

      return {
        number: request.number,
        state: request.state,
        stage: request.stage,
        created: request.sys_created_on,
      };

    } catch (error) {

      logger.error(
        "Failed getting request",
        { error: error.message }
      );

      throw error;
    }
  }

  /**
   * GET USER REQUESTS
   */
  async getUserRequests(userId) {

    try {

      logger.info(
        "Fetching user requests",
        { userId }
      );

      const response =
        await axios.get(

          `${this.baseURL}${this.requestEndpoint}`,

          {
            params: {

              sysparm_query:
                `requested_for=${userId}`,

              sysparm_limit: 20,

              sysparm_fields:
                "number,short_description,state,sys_created_on,requested_for",
            },

            auth: this.auth,
          }
        );

      return (
        response.data.result || []
      );

    } catch (error) {

      logger.error(
        "Failed fetching user requests",
        { error: error.message }
      );

      return [];
    }
  }
}

module.exports =
  new RequestService();