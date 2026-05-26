/**
 * API ENDPOINTS
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const ENDPOINTS = {
  // Chat
  CHAT_MESSAGE: `${API_BASE_URL}/chat/message`,
  CHAT_HISTORY: `${API_BASE_URL}/chat/history`,
  CHAT_PROFILE: `${API_BASE_URL}/chat/profile`,
  CHAT_STATS: `${API_BASE_URL}/chat/stats`,
  CLEAR_SESSION: `${API_BASE_URL}/chat/clear-session`,

  // Incidents
  CREATE_INCIDENT: `${API_BASE_URL}/incidents/create`,
  CONFIRM_INCIDENT: `${API_BASE_URL}/chat/confirm-incident`,
  GET_INCIDENTS: `${API_BASE_URL}/incidents`,
  GET_INCIDENT: `${API_BASE_URL}/incidents/:id`,

  // Requests
  GET_CATALOG: `${API_BASE_URL}/requests/catalog`,
  SEARCH_CATALOG: `${API_BASE_URL}/requests/catalog/search`,
  CREATE_REQUEST: `${API_BASE_URL}/requests/create`,
  GET_REQUESTS: `${API_BASE_URL}/requests`,

  // Knowledge Base
  SEARCH_KB: `${API_BASE_URL}/kb/search`,
  GET_ARTICLE: `${API_BASE_URL}/kb/articles/:id`,
  RATE_ARTICLE: `${API_BASE_URL}/chat/rate-article`,

  // Feedback
  SEND_FEEDBACK: `${API_BASE_URL}/chat/feedback`,
};

/**
 * INTENT TYPES
 */
export const INTENT_TYPES = {
  INCIDENT: "INCIDENT",
  SERVICE_REQUEST: "SERVICE_REQUEST",
  ACCESS_REQUEST: "ACCESS_REQUEST",
  PASSWORD_RESET: "PASSWORD_RESET",
  KB_QUERY: "KB_QUERY",
  OUTAGE: "OUTAGE",
  CHANGE_REQUEST: "CHANGE_REQUEST",
  OTHER: "OTHER",
};

/**
 * RESPONSE TYPES
 */
export const RESPONSE_TYPES = {
  KB_ARTICLES: "KB_ARTICLES",
  SELF_HEAL_OFFERED: "SELF_HEAL_OFFERED",
  SERVICE_REQUEST_OPTIONS: "SERVICE_REQUEST_OPTIONS",
  INCIDENT_CONFIRMATION: "INCIDENT_CONFIRMATION",
  INCIDENT_CREATED: "INCIDENT_CREATED",
  KNOWN_OUTAGE: "KNOWN_OUTAGE",
  ERROR: "ERROR",
  NO_SOLUTION: "NO_SOLUTION",
  COULD_NOT_FULFILL: "COULD_NOT_FULFILL",
};

/**
 * PRIORITY LEVELS
 */
export const PRIORITY_LEVELS = {
  P1: { value: 1, label: "Critical", color: "#DC2626", icon: "🔴" },
  P2: { value: 2, label: "High", color: "#EA580C", icon: "🟠" },
  P3: { value: 3, label: "Medium", color: "#F59E0B", icon: "🟡" },
  P4: { value: 4, label: "Low", color: "#10B981", icon: "🟢" },
  P5: { value: 5, label: "Planning", color: "#6B7280", icon: "⚪" },
};

/**
 * STATUS LABELS
 */
export const STATUS_LABELS = {
  NEW: "New",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  FULFILLED: "Fulfilled",
};

/**
 * IMPACT LEVELS
 */
export const IMPACT_LEVELS = {
  INDIVIDUAL: { label: "Individual User", value: "INDIVIDUAL" },
  DEPARTMENT: { label: "Department", value: "DEPARTMENT" },
  DIVISION: { label: "Division", value: "DIVISION" },
  ENTERPRISE: { label: "Enterprise", value: "ENTERPRISE" },
};

/**
 * SUGGESTION CHIPS
 */
export const SUGGESTION_TOPICS = [
  { text: "How to reset password", icon: "🔐" },
  { text: "Request VPN access", icon: "🌐" },
  { text: "Need SAP access", icon: "💼" },
  { text: "Email not working", icon: "📧" },
  { text: "Can't login to system", icon: "🚫" },
  { text: "System is slow", icon: "⚡" },
];
