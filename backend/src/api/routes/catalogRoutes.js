const express = require("express");

const router = express.Router();

const {
  findCatalogItem,
} = require("../../services/servicenow/catalog.service");

router.get("/", async (req, res) => {

  try {

    const query =
      req.query.q;

    const items =
      await findCatalogItem(query);

    return res.json({
      success: true,
      items,
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;