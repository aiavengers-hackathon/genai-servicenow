const express = require("express");

const router = express.Router();

const {
  detectIntent,
} = require("../services/aiService");

const {
  createIncident,
  createAccessRequest,
} = require("../services/servicenowService");

const {
  getSession,
  clearSession,
} = require("../memory/sessionStore");

/**
 * APPLICATION MAPPINGS
 */
const mappings = {
  VPN: {
    assignment_group: "Network Team",
    configuration_item: "Corporate VPN",
    category: "Network",
    subcategory: "VPN",
  },

  BAAMR: {
    assignment_group: "RD Clinical",
    configuration_item: "BAAMR Application",
  },

  SAP: {
    assignment_group: "SAP Support",
    configuration_item: "SAP ECC",
  },
};

/**
 * CHAT API
 */
router.post("/", async (req, res) => {

  try {

    const { message, userId } = req.body;

    const session = getSession(userId);

    /**
     * STEP 1:
     * CONFIRMATION FLOW
     */
    if (
      session.awaitingConfirmation &&
      message.toLowerCase() === "confirm"
    ) {

      /**
       * INCIDENT CREATION
       */
      if (
        session.workflow === "incident"
      ) {

        const incident =
          await createIncident(
            session.collectedData
          );

        clearSession(userId);

        return res.json({
          reply:
`Incident created successfully.

Incident Number:
${incident.number}`,
        });
      }

      /**
       * ACCESS REQUEST CREATION
       */
      if (
        session.workflow ===
        "access_request"
      ) {

        const request =
          await createAccessRequest(
            session.collectedData
          );

        clearSession(userId);

        return res.json({
          reply:
`Request created successfully.

Request Number:
${request.number}`,
        });
      }
    }

    /**
     * STEP 2:
     * COLLECT MISSING FIELDS
     */

    // INCIDENT DETAILS
    if (
      session.awaitingField ===
      "incident_details"
    ) {

      session.collectedData.description =
        message;

      session.awaitingField = null;

      session.awaitingConfirmation = true;

      return res.json({
        reply:
`Please confirm incident details:

Category:
${session.collectedData.category}

Subcategory:
${session.collectedData.subcategory}

Assignment Group:
${session.collectedData.assignment_group}

Configuration Item:
${session.collectedData.configuration_item}

Priority:
High

Short Description:
${session.collectedData.short_description}

Description:
${session.collectedData.description}

Type CONFIRM to create incident.`,
      });
    }

    // USERNAME COLLECTION
    if (
      session.awaitingField ===
      "username"
    ) {

      session.collectedData.username =
        message;

      session.awaitingField = null;

      session.awaitingConfirmation = true;

      return res.json({
        reply:
`Please confirm request details:

Application:
${session.collectedData.application}

Username:
${session.collectedData.username}

Assignment Group:
${session.collectedData.assignment_group}

Configuration Item:
${session.collectedData.configuration_item}

Type CONFIRM to create request.`,
      });
    }

    /**
     * STEP 3:
     * DETECT INTENT
     */
    const aiData =
      await detectIntent(message);

    console.log(
      "AI RESPONSE:",
      aiData
    );

    /**
     * GREETING
     */
    if (
      aiData.intent === "greeting"
    ) {

      return res.json({
        reply:
          "Hello! How can I help you today?",
      });
    }

    /**
     * INCIDENT FLOW
     */
    if (
      aiData.intent === "incident"
    ) {

      session.workflow = "incident";

      const app =
        (
          aiData.application ||
          "VPN"
        ).toUpperCase();

      const mapping =
        mappings[app];

      session.collectedData = {

        application: app,

        category:
          mapping?.category ||
          "Network",

        subcategory:
          mapping?.subcategory ||
          "General",

        assignment_group:
          mapping?.assignment_group ||
          "Service Desk",

        configuration_item:
          mapping?.configuration_item ||
          app,

        short_description:
          aiData.short_description ||
          `${app} issue`,

        urgency:
          aiData.urgency || "1",

        impact:
          aiData.impact || "1",
      };

      session.awaitingField =
        "incident_details";

      return res.json({
        reply:
`I can help create an incident for ${app} issues.

Please provide:
1. Your username
2. Error message
3. Is this impacting your work?`,
      });
    }

    /**
     * ACCESS REQUEST FLOW
     */
    if (
      aiData.intent ===
      "access_request"
    ) {

      session.workflow =
        "access_request";

      const app =
        aiData.application?.toUpperCase();

      const mapping =
        mappings[app];

      session.collectedData = {

        application: app,

        assignment_group:
          mapping?.assignment_group ||
          "Service Desk",

        configuration_item:
          mapping?.configuration_item ||
          app,
      };

      session.awaitingField =
        "username";

      return res.json({
        reply:
`Sure — I can help with ${app} access.

Please provide your username.`,
      });
    }

    /**
     * FALLBACK
     */
    return res.json({
      reply:
        "Could you please provide more details?",
    });

  } catch (err) {

    console.error(
      "CHAT ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      error:
        err.response?.data ||
        err.message,
    });
  }
});

module.exports = router;