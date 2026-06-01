const incidentService =
  require("./servicenow/incident.service");

const requestService =
  require("./servicenow/request.service");

const logger =
  require("../utils/logger");

const { clearSession } =
  require("../memory/sessionStore");

/**
 * CREATE INCIDENT
 */
async function createIncident(data) {

  try {

    logger.info(
      "Creating incident",
      {
        userId: data.userId
      }
    );

    let callerId = "";

    if (data.userId) {

      const user =
        await requestService.getUserByUsername(
          data.userId
        );

      if (user) {

        callerId =
          user.sys_id;

        logger.info(
          "Caller resolved",
          {
            username:
              data.userId,
            callerId
          }
        );
      }
    }

    return await incidentService.createIncident({
      ...data,
      caller_id: callerId
    });

  } catch (error) {

    logger.error(
      "Incident creation failed",
      {
        error: error.message,
      }
    );

    throw error;
  }
}
/**
 * CREATE ACCESS REQUEST
 *
 * Features:
 * 1. Resolve username → ServiceNow sys_id
 * 2. Duplicate request detection
 * 3. AI/User-defined priority
 * 4. ServiceNow request creation
 */
async function createAccessRequest(data) {

  try {

    logger.info(
      "Creating access request",
      {
        application: data.application,
        username: data.username,
        requestedPriority:
          data.requestedPriority,
      }
    );

    /**
     * STEP 1
     * Resolve ServiceNow user
     */
    const userSysId =
      await requestService.resolveUserSysId(
        data.username
      );

    if (!userSysId) {

      logger.warn(
        "User not found in ServiceNow",
        {
          username: data.username,
        }
      );

      if (data.userId) {
        clearSession(data.userId);
      }

      return {
        notSnowUser: true,
        username: data.username,
      };
    }

    logger.info(
      "User resolved in ServiceNow",
      {
        username: data.username,
        sysId: userSysId,
      }
    );

    /**
     * STEP 2
     * Duplicate request check
     */
    const {
      isDuplicate,
      existingRequest,
    } =
      await requestService.checkDuplicateRequest(
        userSysId,
        data.application
      );

    if (isDuplicate) {

      logger.info(
        "Duplicate request blocked",
        {
          username:
            data.username,

          application:
            data.application,

          existingRequest:
            existingRequest.number,
        }
      );

      if (data.userId) {
        clearSession(data.userId);
      }

      return {
        isDuplicate: true,
        existingRequest,
      };
    }

    /**
     * STEP 3
     * PRIORITY CALCULATION
     */

    let priority = "3";
    let urgency = "3";
    let impact = "3";

    const requestedPriority =
      (
        data.requestedPriority || ""
      )
        .toLowerCase()
        .trim();

    
    /**
     * HIGH
     */
    if (
      requestedPriority.includes(
        "high"
      )
    ) {

      priority = "2";
      urgency = "2";
      impact = "2";
    }

    /**
     * LOW
     */
    else if (
      requestedPriority.includes(
        "low"
      )
    ) {

      priority = "4";
      urgency = "4";
      impact = "4";
    }

    /**
     * MEDIUM DEFAULT
     */
    else {

      priority = "3";
      urgency = "3";
      impact = "3";
    }

    logger.info(
      "Request priority mapping",
      {
        requestedPriority,
        priority,
        urgency,
        impact,
      }
    );

    /**
     * STEP 4
     * CREATE REQUEST
     */
    const result =
      await requestService.submitRequest({

        requestedFor:
          userSysId,

        shortDescription:
          data.shortDescription ||
          `Access request for ${data.application}`,

        description:
          data.description ||
          `Access request for ${data.application}`,

        priority,
        urgency,
        impact,
      });

    logger.info(
      "Access request created",
      {
        requestNumber:
          result.number,

        priority,
      }
    );

    /**
     * STEP 5
     * CLEAR SESSION
     */
    if (data.userId) {

      clearSession(data.userId);

      logger.info(
        "Session cleared after access request",
        {
          userId:
            data.userId,
        }
      );
    }

    /**
     * RETURN RESPONSE
     */
    return {
      ...result,

      priority,
      urgency,
      impact,

      priorityLabel:
        priority === "1"
          ? "Critical"
          : priority === "2"
          ? "High"
          : priority === "4"
          ? "Low"
          : "Medium",
    };

  } catch (error) {

    logger.error(
      "Access request failed",
      {
        error:
          error.message,
      }
    );

    throw error;
  }
}

module.exports = {
  createIncident,
  createAccessRequest,
};