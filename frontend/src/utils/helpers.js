/**
 * UTILITY FUNCTIONS
 */

/**
 * FORMAT DATE
 */
export function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * FORMAT TIME
 */
export function formatTime(date) {
  if (!date) return "";

  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * TRUNCATE TEXT
 */
export function truncate(text, length = 100) {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

/**
 * EXTRACT TICKET NUMBER
 */
export function extractTicketNumber(text) {
  const match = text.match(/INC\d{7}|REQ\d{7}|CHG\d{7}/);
  return match ? match[0] : null;
}

/**
 * IS EMPTY
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * DEBOUNCE
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * GET USER ID (FROM LOCAL STORAGE OR GENERATE)
 */
export function getUserId() {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("userId", userId);
  }
  return userId;
}

/**
 * PARSE INCIDENT DATA FROM RESPONSE
 */
export function parseIncidentData(response) {
  if (response.tracking?.incidentNumber) {
    return {
      number: response.tracking.incidentNumber,
      priority: response.priority,
      url: response.tracking.url,
    };
  }
  return null;
}

/**
 * GET RESPONSE COLOR BASED ON TYPE
 */
export function getResponseColor(type) {
  const colors = {
    SELF_HEAL_OFFERED: "bg-blue-50 border-blue-200",
    KB_ARTICLES: "bg-green-50 border-green-200",
    SERVICE_REQUEST_OPTIONS: "bg-purple-50 border-purple-200",
    INCIDENT_CONFIRMATION: "bg-yellow-50 border-yellow-200",
    INCIDENT_CREATED: "bg-green-50 border-green-200",
    ERROR: "bg-red-50 border-red-200",
  };
  return colors[type] || "bg-gray-50 border-gray-200";
}

/**
 * GET RESPONSE ICON
 */
export function getResponseIcon(type) {
  const icons = {
    SELF_HEAL_OFFERED: "💡",
    KB_ARTICLES: "📚",
    SERVICE_REQUEST_OPTIONS: "📋",
    INCIDENT_CONFIRMATION: "⚠️",
    INCIDENT_CREATED: "✅",
    ERROR: "❌",
    OUTAGE: "🚨",
  };
  return icons[type] || "💬";
}
