const express = require("express");

const router = express.Router();

const {
  createIncident,
} = require("../../services/servicenowService");

/**
 * DIRECT INCIDENT CREATION
 */
router.post("/create", async (req, res) => {

  try {

    const incidentData =
      req.body;

    const incident =
      await createIncident(
        incidentData
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

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;