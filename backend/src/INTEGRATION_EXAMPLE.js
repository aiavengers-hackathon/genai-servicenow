/**
 * INTEGRATION EXAMPLE - Chat Controller
 * 
 * Shows how to integrate the enterprise AI agent
 * with Express.js chat routes
 */

const IncidentOrchestrator = require("../orchestration/incidentOrchestrator");
const SessionStore = require("../memory/sessionStore");
const logger = require("../utils/logger");

/**
 * CHAT MESSAGE HANDLER
 * POST /api/chat/message
 */
async function handleChatMessage(req, res) {
  try {
    const { message, userId } = req.body;

    // Validate input
    if (!message || !userId) {
      return res.status(400).json({ error: "Missing message or userId" });
    }

    logger.info("Chat message received", { userId, messageLength: message.length });

    // Get user context (from auth or database)
    const user = {
      id: userId,
      department: req.user?.department || "Unknown",
      email: req.user?.email || "",
      manager: req.user?.manager || "",
    };

    // Process message through orchestrator
    const response = await IncidentOrchestrator.orchestrateIncident(message, user);

    // Add metadata
    const enrichedResponse = {
      ...response,
      timestamp: new Date(),
      conversationId: SessionStore.getSession(userId).id,
      sessionContext: {
        messageCount: SessionStore.getConversationHistory(userId).length,
        workflow: SessionStore.getSession(userId).workflow?.type,
      },
    };

    logger.info("Chat response generated", {
      userId,
      responseType: response.type,
    });

    res.json(enrichedResponse);
  } catch (error) {
    logger.error("Chat handler error", {
      error: error.message,
      userId: req.body.userId,
    });

    res.status(500).json({
      type: "ERROR",
      message: "An error occurred processing your request",
      errorId: logger.generateErrorId(),
    });
  }
}

/**
 * GET CONVERSATION HISTORY
 * GET /api/chat/history/:userId
 */
async function getConversationHistory(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const history = SessionStore.getConversationHistory(userId, parseInt(limit));

    res.json({
      userId,
      messageCount: history.length,
      messages: history,
    });
  } catch (error) {
    logger.error("History fetch error", { error: error.message });

    res.status(500).json({ error: "Failed to fetch history" });
  }
}

/**
 * GET USER PROFILE
 * GET /api/chat/profile/:userId
 */
async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;

    const profile = SessionStore.getUserProfile(userId);

    res.json({
      userId,
      profile: {
        preferences: profile.preferences,
        history: {
          totalIncidents: profile.history.totalIncidents,
          totalRequests: profile.history.totalRequests,
          frequentApplications: profile.history.frequentApplications,
        },
        engagement: profile.engagement,
      },
    });
  } catch (error) {
    logger.error("Profile fetch error", { error: error.message });

    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

/**
 * CONFIRM INCIDENT CREATION
 * POST /api/chat/confirm-incident
 */
async function confirmIncidentCreation(req, res) {
  try {
    const { userId, incidentData } = req.body;

    const user = { id: userId };

    const result = await IncidentOrchestrator.createConfirmedIncident(
      incidentData,
      user
    );

    logger.info("Incident confirmed and created", {
      userId,
      incidentNumber: result.incident.number,
    });

    res.json(result);
  } catch (error) {
    logger.error("Incident confirmation error", { error: error.message });

    res.status(500).json({ error: "Failed to create incident" });
  }
}

/**
 * PROVIDE FEEDBACK
 * POST /api/chat/feedback
 */
async function provideFeedback(req, res) {
  try {
    const { userId, feedback, sentiment } = req.body;

    const result = await IncidentOrchestrator.handleFeedback(
      userId,
      feedback,
      sentiment
    );

    logger.info("Feedback recorded", { userId, sentiment });

    res.json(result);
  } catch (error) {
    logger.error("Feedback error", { error: error.message });

    res.status(500).json({ error: "Failed to record feedback" });
  }
}

/**
 * RATE KB ARTICLE
 * POST /api/chat/rate-article
 */
async function rateArticle(req, res) {
  try {
    const { articleId, helpful } = req.body;

    const KBService = require("../services/servicenow/kb.service");

    await KBService.rateArticle(articleId, helpful);

    logger.info("Article rated", { articleId, helpful });

    res.json({ success: true });
  } catch (error) {
    logger.error("Article rating error", { error: error.message });

    res.status(500).json({ error: "Failed to rate article" });
  }
}

/**
 * CLEAR SESSION
 * POST /api/chat/clear-session/:userId
 */
async function clearSession(req, res) {
  try {
    const { userId } = req.params;

    SessionStore.clearSession(userId);

    logger.info("Session cleared", { userId });

    res.json({ success: true, message: "Session cleared" });
  } catch (error) {
    logger.error("Session clear error", { error: error.message });

    res.status(500).json({ error: "Failed to clear session" });
  }
}

/**
 * GET SESSION STATS
 * GET /api/chat/stats
 */
async function getStats(req, res) {
  try {
    const stats = SessionStore.getStats();

    res.json(stats);
  } catch (error) {
    logger.error("Stats fetch error", { error: error.message });

    res.status(500).json({ error: "Failed to fetch stats" });
  }
}

/**
 * EXPORT HANDLERS
 * 
 * Usage in Express router:
 * 
 * const express = require('express');
 * const router = express.Router();
 * const { handleChatMessage, getConversationHistory, ... } = require('./integration');
 * 
 * router.post('/chat/message', handleChatMessage);
 * router.get('/chat/history/:userId', getConversationHistory);
 * router.get('/chat/profile/:userId', getUserProfile);
 * router.post('/chat/confirm-incident', confirmIncidentCreation);
 * router.post('/chat/feedback', provideFeedback);
 * router.post('/chat/rate-article', rateArticle);
 * router.post('/chat/clear-session/:userId', clearSession);
 * router.get('/chat/stats', getStats);
 * 
 * module.exports = router;
 */

module.exports = {
  handleChatMessage,
  getConversationHistory,
  getUserProfile,
  confirmIncidentCreation,
  provideFeedback,
  rateArticle,
  clearSession,
  getStats,
};
