/**
 * REQUEST ROUTES
 * Handles Service Request APIs
 */

const express = require("express");

const router = express.Router();

const {
  startRequestWorkflow,
} = require("../../services/workflowService");

const {
  createAccessRequest,
  createServiceRequest,
} = require("../../services/servicenowService");

const requestService =
  require("../../services/servicenow/request.service");

/**
 * CREATE SERVICE REQUEST
 */
router.post("/create", async (req, res) => {

  try {

    const data = req.body;

    if (!data) {

      return res.status(400).json({
        success: false,
        error: "Request body is required",
      });
    }

    const result =
      await startRequestWorkflow(data);

    return res.json({
      success: true,
      data: result,
    });

  } catch (err) {

    console.error(
      "REQUEST CREATE ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.message ||
        "Failed to create request",
    });
  }
});

/**
 * CREATE ACCESS REQUEST
 */
router.post("/access", async (req, res) => {

  try {

    const {
      application,
      username,
      assignment_group,
      configuration_item,
    } = req.body;

    if (!application || !username) {

      return res.status(400).json({
        success: false,
        error:
          "application and username are required",
      });
    }

    const result =
      await createAccessRequest({

        application,
        username,

        assignment_group:
          assignment_group ||
          "IAM Support",

        configuration_item:
          configuration_item ||
          application,

        shortDescription:
          `Access request for ${application}`,

        description:
          `User ${username} requested access for ${application}`,
      });

    // NOT A SERVICENOW USER
    if (result.notSnowUser) {

      return res.status(404).json({
        success: false,
        error:
          `User "${username}" is not registered in ServiceNow.`,
      });
    }

    // DUPLICATE REQUEST
    if (result.isDuplicate) {

      return res.status(409).json({
        success: false,
        error:
          `An open request already exists for ${application}.`,
        existingRequest:
          result.existingRequest,
      });
    }

    return res.json({
      success: true,
      request: result,
    });

  } catch (err) {

    console.error(
      "ACCESS REQUEST ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.message ||
        "Failed to create access request",
    });
  }
});

/**
 * CREATE GENERIC SERVICE REQUEST
 */
router.post("/service", async (req, res) => {

  try {

    const {
      shortDescription,
      description,
      requestedFor,
    } = req.body;

    // FIX: requestedFor must be a valid
    // ServiceNow username, not hardcoded "admin"
    if (!requestedFor) {

      return res.status(400).json({
        success: false,
        error: "requestedFor is required",
      });
    }

    const request =
      await createServiceRequest({
        shortDescription,
        description,
        requestedFor,
      });

    return res.json({
      success: true,
      request,
    });

  } catch (err) {

    console.error(
      "SERVICE REQUEST ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.message ||
        "Failed to create service request",
    });
  }
});

/**
 * GET USER REQUESTS
 */
router.get("/user/:userId", async (req, res) => {

  try {

    const { userId } = req.params;

    console.log(
      "FETCHING REQUESTS FOR:",
      userId
    );

    const requests =
      await requestService.getUserRequests(
        userId
      );

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });

  } catch (err) {

    console.error(
      "GET USER REQUESTS ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.message ||
        "Failed to fetch requests",
    });
  }
});

/**
 * GET REQUEST STATUS
 */
router.get("/:requestNumber", async (req, res) => {

  try {

    const {
      requestNumber,
    } = req.params;

    const request =
      await requestService.getRequestStatus(
        requestNumber
      );

    return res.json({
      success: true,
      request,
    });

  } catch (err) {

    console.error(
      "REQUEST STATUS ERROR:",
      err.message
    );

    return res.status(500).json({
      success: false,
      error:
        err.message ||
        "Failed to fetch request status",
    });
  }
});

module.exports = router;