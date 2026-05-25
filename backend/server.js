const express = require("express");
const cors = require("cors");
require("dotenv").config();

const chatRoutes =
  require("./routes/chatRoutes");

const kbRoutes =
  require("./routes/kbRoutes");

const catalogRoutes =
  require("./routes/catalogRoutes");

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/chat", chatRoutes);

app.use("/api/kb", kbRoutes);

app.use(
  "/api/catalog",
  catalogRoutes
);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});