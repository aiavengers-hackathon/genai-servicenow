const express = require("express");
const cors = require("cors");
require("dotenv").config();

const incidentRoutes = require("./routes/incidentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/incidents", incidentRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});