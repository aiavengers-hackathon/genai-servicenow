/**
 * SERVER.JS
 * Main Express server for AI ServiceNow Agent Backend
 */

const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const chatRoutes = require("./src/api/routes/chat.routes");
const incidentRoutes = require("./src/api/routes/incident.routes");
const requestRoutes = require("./src/api/routes/request.routes");
const kbRoutes = require("./src/api/routes/kb.routes");
const catalogRoutes = require("./src/api/routes/catalogRoutes");

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
console.log("chatRoutes:", typeof chatRoutes);
console.log("incidentRoutes:", typeof incidentRoutes);
console.log("requestRoutes:", typeof requestRoutes);
console.log("kbRoutes:", typeof kbRoutes);
console.log("catalogRoutes:", typeof catalogRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/kb", kbRoutes);
app.use("/api/catalog", catalogRoutes);

// Root endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "AI ServiceNow Agent API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      chat: "/api/chat",
      incidents: "/api/incidents",
      requests: "/api/requests",
      kb: "/api/kb",
      catalog: "/api/catalog",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   AI ServiceNow Agent Backend Server   ║
╚════════════════════════════════════════╝

✓ Server running on http://localhost:${PORT}
✓ Environment: ${process.env.NODE_ENV || "development"}
✓ Azure OpenAI: ${process.env.AZURE_OPENAI_ENDPOINT ? "✓ Connected" : "✗ Not configured"}
✓ ServiceNow: ${process.env.SN_INSTANCE ? "✓ Connected" : "✗ Not configured"}

API Endpoints:
  GET  /health                   - Health check
  GET  /api                      - API info
  POST /api/chat/message         - Send chat message
  GET  /api/chat/history         - Get conversation history
  GET  /api/kb/search            - Search knowledge base
  POST /api/incidents/create     - Create incident
  POST /api/requests/create      - Create service request
  GET  /api/catalog/search       - Search catalog

Listening for requests...
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received. Shutting down gracefully...");
  process.exit(0);
});
