const express = require("express");
const router = express.Router();

const { detectIntent } =
  require("../services/aiService");

const {
  handleWorkflow,
} = require("../services/workflowService");

const {
  createAccessRequest,
} = require("../services/servicenowService");

const {
  getSession,
  clearSession,
} = require("../memory/sessionStore");

router.post("/", async (req, res) => {
  try {
    const { message, userId } = req.body;

    const session = getSession(userId);

    let aiData = {
      intent: null,
    };

    if (!session.awaitingField &&
        !session.awaitingConfirmation) {

      aiData = await detectIntent(message);
    }

    const workflowResult =
      handleWorkflow(
        session,
        aiData,
        message
      );

    // Create Request
    if (
      workflowResult.action ===
      "CREATE_REQUEST"
    ) {
      const request =
        await createAccessRequest(
          workflowResult.data
        );

      clearSession(userId);

      return res.json({
        reply:
`Request created successfully.

Request Number:
${request.number}`,
      });
    }

    return res.json({
      reply: workflowResult.reply,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;