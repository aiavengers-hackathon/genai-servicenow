const express = require("express");

const router = express.Router();

const {
  searchKB,
} = require("../../services/servicenow/kb.service");

router.get("/", async (req, res) => {

  try {

    const query =
      req.query.q;

    const articles =
      await searchKB(query);

    return res.json({
      success: true,
      articles,
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;