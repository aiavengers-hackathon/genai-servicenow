const express = require("express");

const router = express.Router();

const {
  processMessage,
} = require("../services/workflowService");

const {
  createIncident,
  createAccessRequest,
} = require("../services/servicenowService");

const {
  getSession,
  clearSession,
} = require("../memory/sessionStore");

/**
 * MAIN CHAT ROUTE
 */
router.post("/", async (req, res) => {

  try {

    const {
      message,
      userId,
    } = req.body;

    if (!message || !userId) {

      return res.status(400).json({
        error:
          "message and userId are required",
      });
    }

    /**
     * GET USER SESSION
     */
    const session =
      getSession(userId);

    console.log(
      "SESSION:",
      JSON.stringify(session, null, 2)
    );

    /**
     * NORMALIZE MESSAGE
     */
    const normalizedMessage =
      message.trim();

    /**
     * ======================================
     * CANCEL FLOW
     * ======================================
     */
    if (
      normalizedMessage.toLowerCase() ===
      "cancel"
    ) {

      clearSession(userId);

      return res.json({
        reply:
          "Current request cancelled successfully.",
      });
    }

    /**
     * ======================================
     * CONFIRMATION FLOW
     * ======================================
     */
    if (
      session.awaitingConfirmation &&
      normalizedMessage.toLowerCase() ===
      "confirm"
    ) {

      /**
       * INCIDENT CREATION
       */
      if (
        session.workflow ===
        "incident"
      ) {

        console.log(
          "CREATING INCIDENT:",
          session.collectedData
        );

        const incident =
          await createIncident(
            session.collectedData
          );

        clearSession(userId);

        return res.json({

          reply:
`Incident created successfully.

Incident Number:
${incident.number}

Application:
${session.collectedData.application}

Assignment Group:
${session.collectedData.assignment_group}`,
        });
      }

      /**
       * ACCESS REQUEST CREATION
       */
      if (
        session.workflow ===
        "access_request"
      ) {

        console.log(
          "CREATING ACCESS REQUEST:",
          session.collectedData
        );

        const request =
          await createAccessRequest(
            session.collectedData
          );

        clearSession(userId);

        return res.json({

          reply:
`Access request created successfully.

Request Number:
${request.number}

Application:
${session.collectedData.application}`,
        });
      }

      /**
       * UNKNOWN WORKFLOW
       */
      clearSession(userId);

      return res.json({
        reply:
          "Workflow completed.",
      });
    }

    /**
     * ======================================
     * INCIDENT DETAILS FLOW
     * ======================================
     *
     * IMPORTANT:
     * DO NOT CALL AI AGAIN
     * CONTINUE EXISTING WORKFLOW
     */
    if (
      session.workflow === "incident" &&
      session.awaitingField ===
      "incident_details"
    ) {

      /**
       * STORE DESCRIPTION
       */
      session.collectedData.description =
        normalizedMessage;

      /**
       * UPDATE SESSION
       */
      session.awaitingField = null;

      session.awaitingConfirmation =
        true;

      return res.json({

        reply:
`Please confirm incident creation.

Application:
${session.collectedData.application}

Short Description:
${session.collectedData.short_description}

Issue Description:
${session.collectedData.description}

Assignment Group:
${session.collectedData.assignment_group}

Configuration Item:
${session.collectedData.configuration_item}

Priority:
High

Type CONFIRM to create the incident
or CANCEL to abort.`,
      });
    }

    /**
     * ======================================
     * USERNAME COLLECTION FLOW
     * ======================================
     *
     * IMPORTANT:
     * DO NOT CALL AI AGAIN
     */
    if (
      session.workflow ===
        "access_request" &&
      session.awaitingField ===
        "username"
    ) {

      /**
       * STORE USERNAME
       */
      session.collectedData.username =
        normalizedMessage;

      /**
       * UPDATE SESSION
       */
      session.awaitingField = null;

      session.awaitingConfirmation =
        true;

      return res.json({

        reply:
`Please confirm access request.

Application:
${session.collectedData.application}

Username:
${session.collectedData.username}

Assignment Group:
${session.collectedData.assignment_group}

Configuration Item:
${session.collectedData.configuration_item}

Catalog Item:
${session.collectedData.catalog_item || "Not Available"}

Type CONFIRM to create the request
or CANCEL to abort.`,
      });
    }

    /**
     * ======================================
     * EXISTING ACTIVE WORKFLOW
     * ======================================
     */
    if (
      session.workflow &&
      !session.awaitingField &&
      !session.awaitingConfirmation
    ) {

      return res.json({
        reply:
          "An active workflow already exists. Please type CONFIRM or CANCEL.",
      });
    }

    /**
     * ======================================
     * MAIN AI WORKFLOW
     * ======================================
     *
     * AI SHOULD ONLY RUN
     * FOR NEW REQUESTS
     */
    const response =
      await processMessage(
        session,
        normalizedMessage
      );

    /**
     * SAFETY FALLBACK
     */
    if (!response) {

      return res.json({
        reply:
          "I could not process your request.",
      });
    }

    return res.json(response);

  } catch (err) {

    console.error(
      "CHAT ERROR:",
      err.response?.data ||
      err.message
    );

    return res.status(500).json({

      success: false,

      error:
        err.response?.data ||
        err.message ||
        "Internal server error",
    });
  }
});

module.exports = router;