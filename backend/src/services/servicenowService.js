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
      "Creating incident"
    );

    return await incidentService
      .createIncident(data);

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
 * Flow:
 * 1. Resolve username → ServiceNow sys_id
 *    If not found → return notSnowUser: true
 * 2. Check for duplicate open request
 *    If found → return isDuplicate: true
 * 3. Create request using sys_id as requested_for
 */
async function createAccessRequest(data) {

  try {

    logger.info(
      "Creating access request",
      {
        application: data.application,
        username: data.username,
      }
    );

    // STEP 1: Resolve ServiceNow username → sys_id
    // The username typed by user (e.g. "sayyedr") must exist
    // in ServiceNow sys_user table to create a valid request
    const userSysId =
      await requestService.resolveUserSysId(
        data.username
      );

    if (!userSysId) {

      logger.warn(
        "User not found in ServiceNow",
        { username: data.username }
      );

      // Clear session — user needs to start over
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

    // STEP 2: Check for duplicate open request
    // Use sys_id (not username) for the ServiceNow query
    const {
      isDuplicate,
      existingRequest,
    } = await requestService.checkDuplicateRequest(
      userSysId,
      data.application
    );

    if (isDuplicate) {

      logger.info(
        "Duplicate request blocked",
        {
          username: data.username,
          application: data.application,
          existingRequest: existingRequest.number,
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

    // STEP 3: No duplicate — create the request
    // Use sys_id as requested_for so ServiceNow
    // correctly links request to the user
    const result =
      await requestService.submitRequest({

        requestedFor: userSysId,

        shortDescription:
          data.shortDescription,

        description:
          `Access request for ${data.application}`,

        priority: "3",
      });

    if (data.userId) {
      clearSession(data.userId);
      logger.info(
        "Session cleared after access request",
        { userId: data.userId }
      );
    }

    return result;

  } catch (error) {

    logger.error(
      "Access request failed",
      {
        error: error.message,
      }
    );

    throw error;
  }
}

module.exports = {
  createIncident,
  createAccessRequest,
};