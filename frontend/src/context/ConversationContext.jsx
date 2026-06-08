/**
 * CONVERSATION CONTEXT
 * 
 * Global state for conversation, user, and orchestration data
 */

import React, { createContext, useReducer, useCallback } from "react";

// Create context
export const ConversationContext = createContext();

// Initial state
const initialState = {
  // Messages
  messages: [],
  loading: false,
  error: null,

  // Current response
  currentResponse: null,
  responseType: null,

  // Conversation
  conversationId: null,
  messageCount: 0,

  // Incident workflow
  incidentData: null,
  awaitingIncidentConfirmation: false,

  // Service request workflow
  catalogItems: [],
  awaitingCatalogSelection: false,

  // KB workflow
  kbArticles: [],
  showKBSolutions: false,

  // User
  userId: null,
  userProfile: null,

  // UI state
  showSidebar: true,
  isMobile: false,
};

// Actions
export const ACTIONS = {
  // Message actions
  ADD_MESSAGE: "ADD_MESSAGE",
  SET_MESSAGES: "SET_MESSAGES",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",

  // Response actions
  SET_RESPONSE: "SET_RESPONSE",
  CLEAR_RESPONSE: "CLEAR_RESPONSE",

  // Incident workflow
  SET_INCIDENT_DATA: "SET_INCIDENT_DATA",
  SET_AWAITING_INCIDENT_CONFIRMATION: "SET_AWAITING_INCIDENT_CONFIRMATION",
  CONFIRM_INCIDENT: "CONFIRM_INCIDENT",

  // Catalog workflow
  SET_CATALOG_ITEMS: "SET_CATALOG_ITEMS",
  SET_AWAITING_CATALOG_SELECTION: "SET_AWAITING_CATALOG_SELECTION",

  // KB workflow
  SET_KB_ARTICLES: "SET_KB_ARTICLES",
  SET_SHOW_KB_SOLUTIONS: "SET_SHOW_KB_SOLUTIONS",

  // User actions
  SET_USER: "SET_USER",
  SET_USER_PROFILE: "SET_USER_PROFILE",

  // UI actions
  SET_SHOW_SIDEBAR: "SET_SHOW_SIDEBAR",
  SET_IS_MOBILE: "SET_IS_MOBILE",

  // Reset
  RESET_CONVERSATION: "RESET_CONVERSATION",
};

// Reducer
function conversationReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        messageCount: state.messageCount + 1,
      };

    case ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
        messageCount: action.payload.length,
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ACTIONS.SET_RESPONSE:
      return {
        ...state,
        currentResponse: action.payload.data,
        responseType: action.payload.type,
      };

    case ACTIONS.CLEAR_RESPONSE:
      return {
        ...state,
        currentResponse: null,
        responseType: null,
      };

    case ACTIONS.SET_INCIDENT_DATA:
      return {
        ...state,
        incidentData: action.payload,
      };

    case ACTIONS.SET_AWAITING_INCIDENT_CONFIRMATION:
      return {
        ...state,
        awaitingIncidentConfirmation: action.payload,
      };

    case ACTIONS.CONFIRM_INCIDENT:
      return {
        ...state,
        incidentData: null,
        awaitingIncidentConfirmation: false,
      };

    case ACTIONS.SET_CATALOG_ITEMS:
      return {
        ...state,
        catalogItems: action.payload,
      };

    case ACTIONS.SET_AWAITING_CATALOG_SELECTION:
      return {
        ...state,
        awaitingCatalogSelection: action.payload,
      };

    case ACTIONS.SET_KB_ARTICLES:
      return {
        ...state,
        kbArticles: action.payload,
      };

    case ACTIONS.SET_SHOW_KB_SOLUTIONS:
      return {
        ...state,
        showKBSolutions: action.payload,
      };

    case ACTIONS.SET_USER:
      return {
        ...state,
        userId: action.payload,
      };

    case ACTIONS.SET_USER_PROFILE:
      return {
        ...state,
        userProfile: action.payload,
      };

    case ACTIONS.SET_SHOW_SIDEBAR:
      return {
        ...state,
        showSidebar: action.payload,
      };

    case ACTIONS.SET_IS_MOBILE:
      return {
        ...state,
        isMobile: action.payload,
      };

    case ACTIONS.RESET_CONVERSATION:
      return initialState;

    default:
      return state;
  }
}

/**
 * CONVERSATION PROVIDER
 */
export function ConversationProvider({ children }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  // Action creators
  const addMessage = useCallback((message) => {
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: message });
  }, []);

  const setMessages = useCallback((messages) => {
    dispatch({ type: ACTIONS.SET_MESSAGES, payload: messages });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  const setResponse = useCallback((data, type) => {
    dispatch({ type: ACTIONS.SET_RESPONSE, payload: { data, type } });
  }, []);

  const clearResponse = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_RESPONSE });
  }, []);

  const setIncidentData = useCallback((data) => {
    dispatch({ type: ACTIONS.SET_INCIDENT_DATA, payload: data });
  }, []);

  const setAwaitingIncidentConfirmation = useCallback((awaiting) => {
    dispatch({ type: ACTIONS.SET_AWAITING_INCIDENT_CONFIRMATION, payload: awaiting });
  }, []);

  const confirmIncident = useCallback(() => {
    dispatch({ type: ACTIONS.CONFIRM_INCIDENT });
  }, []);

  const setCatalogItems = useCallback((items) => {
    dispatch({ type: ACTIONS.SET_CATALOG_ITEMS, payload: items });
  }, []);

  const setAwaitingCatalogSelection = useCallback((awaiting) => {
    dispatch({ type: ACTIONS.SET_AWAITING_CATALOG_SELECTION, payload: awaiting });
  }, []);

  const setKBArticles = useCallback((articles) => {
    dispatch({ type: ACTIONS.SET_KB_ARTICLES, payload: articles });
  }, []);

  const setShowKBSolutions = useCallback((show) => {
    dispatch({ type: ACTIONS.SET_SHOW_KB_SOLUTIONS, payload: show });
  }, []);

  const setUser = useCallback((userId) => {
    dispatch({ type: ACTIONS.SET_USER, payload: userId });
  }, []);

  const setUserProfile = useCallback((profile) => {
    dispatch({ type: ACTIONS.SET_USER_PROFILE, payload: profile });
  }, []);

  const setShowSidebar = useCallback((show) => {
    dispatch({ type: ACTIONS.SET_SHOW_SIDEBAR, payload: show });
  }, []);

  const setIsMobile = useCallback((isMobile) => {
    dispatch({ type: ACTIONS.SET_IS_MOBILE, payload: isMobile });
  }, []);

  const resetConversation = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_CONVERSATION });
  }, []);

  const value = {
    // State
    ...state,

    // Actions
    addMessage,
    setMessages,
    setLoading,
    setError,
    clearError,
    setResponse,
    clearResponse,
    setIncidentData,
    setAwaitingIncidentConfirmation,
    confirmIncident,
    setCatalogItems,
    setAwaitingCatalogSelection,
    setKBArticles,
    setShowKBSolutions,
    setUser,
    setUserProfile,
    setShowSidebar,
    setIsMobile,
    resetConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}
/**
 * CUSTOM HOOK
 */
export function useConversation() {

  const context = React.useContext(
    ConversationContext
  );

  if (!context) {

    throw new Error(
      "useConversation must be used within ConversationProvider"
    );
  }

  return context;
}