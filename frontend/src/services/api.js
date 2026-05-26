/**
 * API SERVICE
 * 
 * Handles all communication with backend
 */

import axios from "axios";
import { ENDPOINTS, API_BASE_URL } from "../constants/api";
import { getUserId } from "../utils/helpers";

const apiClient = axios.create({
  baseURL: API_BASE_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * SEND CHAT MESSAGE
 */
export async function sendChatMessage(message) {
  try {
    const response = await apiClient.post("/chat/message", {
      message,
      userId: getUserId(),
    });

    return response.data;
  } catch (error) {
    console.error("Chat message error:", error);
    throw new Error(error.response?.data?.error || error.message || "Failed to send message");
  }
}

/**
 * GET CONVERSATION HISTORY
 */
export async function getConversationHistory(limit = 50) {
  try {
    const response = await apiClient.get(ENDPOINTS.CHAT_HISTORY.replace(":userId", getUserId()), {
      params: { limit },
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch conversation history");
  }
}

/**
 * GET USER PROFILE
 */
export async function getUserProfile() {
  try {
    const response = await apiClient.get(ENDPOINTS.CHAT_PROFILE.replace(":userId", getUserId()));

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch user profile");
  }
}

/**
 * CONFIRM INCIDENT CREATION
 */
export async function confirmIncidentCreation(incidentData) {
  try {
    const response = await apiClient.post(ENDPOINTS.CONFIRM_INCIDENT, {
      userId: getUserId(),
      incidentData,
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create incident");
  }
}

/**
 * SEARCH CATALOG
 */
export async function searchCatalog(query, options = {}) {
  try {
    const response = await apiClient.get(ENDPOINTS.SEARCH_CATALOG, {
      params: { query, ...options },
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to search catalog");
  }
}

/**
 * CREATE SERVICE REQUEST
 */
export async function createServiceRequest(requestData) {
  try {
    const response = await apiClient.post(ENDPOINTS.CREATE_REQUEST, {
      userId: getUserId(),
      ...requestData,
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create request");
  }
}

/**
 * SEARCH KNOWLEDGE BASE
 */
export async function searchKnowledgeBase(query, options = {}) {
  try {
    const response = await apiClient.get(ENDPOINTS.SEARCH_KB, {
      params: { query, ...options },
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to search knowledge base");
  }
}

/**
 * GET KB ARTICLE
 */
export async function getKBArticle(articleId) {
  try {
    const response = await apiClient.get(ENDPOINTS.GET_ARTICLE.replace(":id", articleId));

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch article");
  }
}

/**
 * RATE ARTICLE
 */
export async function rateArticle(articleId, helpful) {
  try {
    const response = await apiClient.post(ENDPOINTS.RATE_ARTICLE, {
      articleId,
      helpful,
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to rate article");
  }
}

/**
 * SEND FEEDBACK
 */
export async function sendFeedback(feedback, sentiment) {
  try {
    const response = await apiClient.post(ENDPOINTS.SEND_FEEDBACK, {
      userId: getUserId(),
      feedback,
      sentiment,
    });

    return response.data;
  } catch (error) {
    throw new Error("Failed to send feedback");
  }
}

/**
 * GET STATS
 */
export async function getStats() {
  try {
    const response = await apiClient.get(ENDPOINTS.CHAT_STATS);

    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch stats");
  }
}

/**
 * CLEAR SESSION
 */
export async function clearSession() {
  try {
    const response = await apiClient.post(ENDPOINTS.CLEAR_SESSION.replace(":userId", getUserId()));

    return response.data;
  } catch (error) {
    throw new Error("Failed to clear session");
  }
}

export default apiClient;
