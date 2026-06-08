/**
 * SERVER.JS
 * Main Express server for AI ServiceNow Agent Backend
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const logger = require("./src/utils/logger");
const rateLimiter = require("./src/middleware/rateLimiter");
const requestLogger = require("./src/middleware/requestLogger");
const errorHandler = require("./src/middleware/errorHandler");
const metricsCollector = require("./src/utils/metricsCollector");

// Import routes
const chatRoutes = require("./src/api/routes/chat.routes");
const incidentRoutes = require("./src/api/routes/incident.routes");
const requestRoutes = require("./src/api/routes/request.routes");
const kbRoutes = require("./src/api/routes/kb.routes");
const catalogRoutes = require("./src/api/routes/catalogRoutes");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(requestLogger);
app.use(rateLimiter);

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

/**
 * Metrics endpoint
 */
app.get("/api/metrics", (req, res) => {
  return res.json({
    success: true,
    metrics: metricsCollector.getMetrics(),
  });
});

// API Routes
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

/**
 * 404 handler
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 GenAI ServiceNow Server running on port ${PORT}`, {
    nodeEnv: process.env.NODE_ENV,
    snInstance: process.env.SN_INSTANCE,
  });
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

module.exports = app;
