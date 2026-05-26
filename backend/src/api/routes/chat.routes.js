const express = require("express");

const router = express.Router();

const {
  processMessage,
} = require("../../services/workflowService");

const {
  createIncident,
  createAccessRequest,
} = require("../../services/servicenowService");

const {
  getSession,
  clearSession,
} = require("../../memory/sessionStore");

/**
 * MAIN CHAT
 */
router.post("/message", async (req, res) => {

  try {

    const {
      message,
      userId,
    } = req.body;

    if (!message || !userId) {

      return res.status(400).json({
        error:
          "message and userId required",
      });
    }

    const session =
      getSession(userId);

    const text =
      message.trim();

    /**
     * CANCEL
     */
    if (
      text.toLowerCase() ===
      "cancel"
    ) {

      clearSession(userId);

      return res.json({
        reply:
          "Request cancelled.",
      });
    }

    /**
     * CONFIRM
     */
    if (
      session.awaitingConfirmation &&
      text.toLowerCase() ===
      "confirm"
    ) {

      /**
       * CREATE INCIDENT
       */
      if (
        session.workflow ===
        "incident"
      ) {

        const incident =
          await createIncident(
            session.collectedData
          );

        clearSession(userId);

        return res.json({

          reply:
`Incident created successfully.

Number:
${incident.number}`,
        });
      }

      /**
       * CREATE ACCESS REQUEST
       */
      if (
        session.workflow ===
        "access_request"
      ) {

        // FIX: Pass both internal userId AND
        // the ServiceNow username (sayyedr) collected
        // during conversation into createAccessRequest
        const result =
          await createAccessRequest({
            ...session.collectedData,
            userId,
          });

        // FIX: Handle all response cases:
        // 1. Not a ServiceNow user
        // 2. Duplicate open request exists
        // 3. Successfully created

        // NOT A SERVICENOW USER
        if (result.notSnowUser) {

          clearSession(userId);

          return res.json({

            reply:
`You are not a registered ServiceNow user.

Username:
${session.collectedData.username}

Please contact your IT administrator to get onboarded.`,
          });
        }

        // DUPLICATE REQUEST EXISTS
        if (result.isDuplicate) {

          clearSession(userId);

          return res.json({

            reply:
`You already have an open request for ${session.collectedData.application}.

Request Number:
${result.existingRequest.number}

Status:
${result.existingRequest.stage || result.existingRequest.state}

Please wait for it to be resolved before submitting a new one.`,
          });
        }

        // SUCCESS
        clearSession(userId);

        return res.json({

          reply:
`Access request created successfully.

Request Number:
${result.number}`,
        });
      }
    }

    /**
     * USERNAME COLLECTION
     */
    if (
      session.workflow ===
      "access_request" &&

      session.awaitingField ===
      "username"
    ) {

      session.collectedData.username =
        text;

      session.awaitingField =
        null;

      session.awaitingConfirmation =
        true;

      return res.json({

        reply:
`Please confirm access request.

Application:
${session.collectedData.application}

Username:
${text}

Type CONFIRM to create request.`,
      });
    }

    /**
     * INCIDENT DETAILS
     */
    if (
      session.workflow ===
      "incident" &&

      session.awaitingField ===
      "details"
    ) {

      session.collectedData.description =
        text;

      session.awaitingField =
        null;

      session.awaitingConfirmation =
        true;

      return res.json({

        reply:
`Please confirm incident creation.

Issue:
${text}

Type CONFIRM to create incident.`,
      });
    }

    /**
     * AI PROCESSING
     */
    const response =
      await processMessage(
        session,
        text
      );

    /**
     * ACCESS REQUEST FLOW
     */
    if (
      response.type ===
      "ACCESS_REQUEST"
    ) {

      session.workflow =
        "access_request";

      session.awaitingField =
        "username";

      session.collectedData = {

        application:
          response.application,

        assignment_group:
          response.assignmentGroup,

        configuration_item:
          response.configurationItem,

        shortDescription:
          `Access request for ${response.application}`,
      };
    }

    /**
     * INCIDENT FLOW
     */
    if (
      response.type ===
      "READY_TO_CREATE_INCIDENT"
    ) {

      session.workflow =
        "incident";

      session.awaitingField =
        "details";

      session.collectedData = {

        short_description:
          response.incident.title,

        application:
          response.incident.application,

        assignment_group:
          response.incident.assignmentGroup,
      };
    }

    return res.json({
      reply:
        response.reply ||
        response.message,
    });

  } catch (err) {

    console.error(
      "CHAT ERROR:",
      err.message
    );

    return res.status(500).json({
      error:
        err.message,
    });
  }
});

module.exports = router;