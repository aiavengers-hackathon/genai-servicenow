const express = require("express");
const router = express.Router();

const { analyzeUserRequest } = require("../services/aiService");
const { createIncident } = require("../services/servicenowService");

router.post("/create", async (req, res) => {
  try {
    const { message } = req.body;

    const aiResponse = await analyzeUserRequest(message);

    const incident = await createIncident(aiResponse);

    res.json({
      success: true,
      aiResponse,
      incident,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;