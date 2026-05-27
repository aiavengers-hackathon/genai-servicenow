const express = require("express");
const router = express.Router();

const {
  createIncident,
} = require("../../services/servicenowService");

const requestService =
  require("../../services/servicenow/request.service");

const logger =
  require("../../utils/logger");

/**
 * STATE MAP - Convert ServiceNow state numbers to readable names
 */
const STATE_MAP = {
  "1": "Open",
  "2": "Work in Progress",
  "3": "Pending Approval",
  "4": "Approved",
  "6": "Closed Complete",
  "7": "Closed Incomplete",
  "8": "Cancelled",
};

/**
 * VALIDATE APPLICATION FOR INCIDENT
 * Checks if application exists in ServiceNow
 */
async function validateApplicationForIncident(appName) {
  try {
    if (!appName || appName.trim().length < 2) {
      return {
        isValid: false,
        error: "Application name too short",
      };
    }

    const validation =
      await requestService
        .validateApplication(appName.trim());

    if (validation.isValid) {
      return {
        isValid: true,
        application: validation.application,
      };
    }

    if (
      validation.suggestions &&
      validation.suggestions.length > 0
    ) {
      return {
        isValid: false,
        hasSuggestions: true,
        suggestions: validation.suggestions,
        error: validation.error,
      };
    }

    return {
      isValid: false,
      error: validation.error,
    };

  } catch (error) {
    logger.error(
      "Application validation error",
      { error: error.message, appName }
    );

    return {
      isValid: false,
      error: "Error validating application",
    };
  }
}

/**
 * DIRECT INCIDENT CREATION
 * Used when incident data is already validated
 * CHANGED: username is now mandatory for incident creation
 */
router.post("/create", async (req, res) => {
  try {
    const incidentData = req.body;

    if (
      !incidentData.short_description ||
      !incidentData.description ||
      !incidentData.username
    ) {
      return res.status(400).json({
        success: false,
        error:
          "short_description, description and username are required",
      });
    }

    logger.info(
      "Creating incident",
      {
        app: incidentData.application,
        username: incidentData.username,
      }
    );

    const incident =
      await createIncident({
        ...incidentData,
        username: incidentData.username.trim(),
      });

    logger.info(
      "Incident created",
      {
        number: incident.number,
        username: incidentData.username,
      }
    );

    return res.json({
      success: true,
      incident,
    });

  } catch (err) {
    console.error(
      "INCIDENT ERROR:",
      err.message
    );

    logger.error(
      "Failed to create incident",
      { error: err.message }
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * VALIDATE APPLICATION FOR INCIDENT
 * Endpoint to validate if application exists
 * Returns validation status and suggestions if applicable
 */
router.post("/validate-application", async (req, res) => {
  try {
    const { application } = req.body;

    if (!application) {
      return res.status(400).json({
        success: false,
        error: "application parameter required",
      });
    }

    logger.info(
      "Validating incident application",
      { application }
    );

    const validation =
      await validateApplicationForIncident(
        application
      );

    if (validation.isValid) {
      return res.json({
        success: true,
        isValid: true,
        application:
          validation.application,
      });
    }

    if (validation.hasSuggestions) {
      return res.json({
        success: true,
        isValid: false,
        hasSuggestions: true,
        suggestions:
          validation.suggestions,
        error: validation.error,
      });
    }

    return res.json({
      success: true,
      isValid: false,
      hasSuggestions: false,
      error: validation.error,
    });

  } catch (err) {
    console.error(
      "INCIDENT VALIDATION ERROR:",
      err.message
    );

    logger.error(
      "Failed to validate application",
      { error: err.message }
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET INCIDENT STATUS
 * Retrieve details of a specific incident
 */
router.get("/:incidentNumber", async (req, res) => {
  try {
    const { incidentNumber } = req.params;

    if (!incidentNumber) {
      return res.status(400).json({
        success: false,
        error: "incidentNumber parameter required",
      });
    }

    logger.info(
      "Fetching incident status",
      { incidentNumber }
    );

    const incident =
      await requestService
        .getRequestStatus(incidentNumber);

    const stateLabel =
      STATE_MAP[incident.state] ||
      incident.state;

    return res.json({
      success: true,
      incident: {
        number: incident.number,
        status: stateLabel,
        stage: incident.stage,
        created: incident.created,
      },
    });

  } catch (err) {
    console.error(
      "INCIDENT STATUS ERROR:",
      err.message
    );

    logger.error(
      "Failed to fetch incident status",
      { error: err.message }
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * BULK VALIDATE APPLICATIONS
 * Validate multiple applications at once
 */
router.post("/bulk-validate", async (req, res) => {
  try {
    const { applications } = req.body;

    if (
      !applications ||
      !Array.isArray(applications)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "applications array required",
      });
    }

    logger.info(
      "Bulk validating applications",
      { count: applications.length }
    );

    const results = await Promise.all(
      applications.map(async (app) => {
        const validation =
          await validateApplicationForIncident(
            app
          );

        return {
          application: app,
          ...validation,
        };
      })
    );

    return res.json({
      success: true,
      results,
    });

  } catch (err) {
    console.error(
      "BULK VALIDATION ERROR:",
      err.message
    );

    logger.error(
      "Failed bulk validation",
      { error: err.message }
    );

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;