/**
 * CUSTOM HOOKS
 * 
 * Reusable React hooks for common operations
 */

import { useContext, useCallback } from "react";
import { ConversationContext } from "../context/ConversationContext";
import * as api from "../services/api";

/**
 * USE CONVERSATION
 * Access conversation context
 */
export function useConversation() {
  const context = useContext(ConversationContext);

  if (!context) {
    throw new Error("useConversation must be used within ConversationProvider");
  }

  return context;
}

/**
 * USE CHAT MESSAGE
 * Send message to orchestrator
 */
export function useChatMessage() {
  const { addMessage, setLoading, setError, setResponse, clearError } = useConversation();

  const sendMessage = useCallback(
    async (message) => {
      try {
        clearError();
        setLoading(true);
        addMessage({ sender: "user", text: message, timestamp: new Date() });

        const response = await api.sendChatMessage(message);

        addMessage({
          sender: "assistant",
          text: response.message || JSON.stringify(response),
          timestamp: new Date(),
          data: response,
        });

        setResponse(response, response.type);

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [addMessage, setLoading, setError, setResponse, clearError]
  );

  return { sendMessage };
}

/**
 * USE INCIDENT WORKFLOW
 * Handle incident creation flow
 */
export function useIncidentWorkflow() {
  const {
    incidentData,
    awaitingIncidentConfirmation,
    setIncidentData,
    setAwaitingIncidentConfirmation,
    confirmIncident,
    addMessage,
    setLoading,
    setError,
  } = useConversation();

  const createIncident = useCallback(
    async (data) => {
      try {
        setLoading(true);

        const response = await api.confirmIncidentCreation(data);

        addMessage({
          sender: "assistant",
          text: response.message,
          timestamp: new Date(),
          data: response,
        });

        confirmIncident();

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [confirmIncident, addMessage, setLoading, setError]
  );

  return {
    incidentData,
    awaitingIncidentConfirmation,
    setIncidentData,
    setAwaitingIncidentConfirmation,
    createIncident,
  };
}

/**
 * USE CATALOG SEARCH
 * Search and browse service catalog
 */
export function useCatalogSearch() {
  const { setCatalogItems, setError, setLoading } = useConversation();

  const searchCatalog = useCallback(
    async (query, options = {}) => {
      try {
        setLoading(true);

        const response = await api.searchCatalog(query, options);

        setCatalogItems(response.catalogItems || []);

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setCatalogItems, setError, setLoading]
  );

  return { searchCatalog };
}

/**
 * USE KB SEARCH
 * Search knowledge base
 */
export function useKBSearch() {
  const { setKBArticles, setError, setLoading } = useConversation();

  const searchKB = useCallback(
    async (query, options = {}) => {
      try {
        setLoading(true);

        const response = await api.searchKnowledgeBase(query, options);

        setKBArticles(response.articles || []);

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setKBArticles, setError, setLoading]
  );

  return { searchKB };
}

/**
 * USE SERVICE REQUEST
 * Create service request
 */
export function useServiceRequest() {
  const { addMessage, setLoading, setError, clearError } = useConversation();

  const createRequest = useCallback(
    async (requestData) => {
      try {
        clearError();
        setLoading(true);

        const response = await api.createServiceRequest(requestData);

        addMessage({
          sender: "assistant",
          text: response.message,
          timestamp: new Date(),
          data: response,
        });

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [addMessage, setLoading, setError, clearError]
  );

  return { createRequest };
}

/**
 * USE USER PROFILE
 * Get and manage user profile
 */
export function useUserProfile() {
  const { userProfile, setUserProfile, setError } = useConversation();

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await api.getUserProfile();
      setUserProfile(profile.profile);
      return profile;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setUserProfile, setError]);

  return { userProfile, fetchProfile };
}

/**
 * USE FEEDBACK
 * Send feedback to backend
 */
export function useFeedback() {
  const { setError } = useConversation();

  const sendFeedback = useCallback(
    async (feedback, sentiment) => {
      try {
        const response = await api.sendFeedback(feedback, sentiment);
        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      }
    },
    [setError]
  );

  return { sendFeedback };
}

/**
 * USE ARTICLE RATING
 * Rate KB articles
 */
export function useArticleRating() {
  const { setError } = useConversation();

  const rateArticle = useCallback(
    async (articleId, helpful) => {
      try {
        const response = await api.rateArticle(articleId, helpful);
        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      }
    },
    [setError]
  );

  return { rateArticle };
}
