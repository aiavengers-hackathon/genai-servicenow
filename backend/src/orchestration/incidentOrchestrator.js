const express = require("express");
const router = express.Router();

const { processMessage } = require("../../services/workflowService");
const { createIncident, createAccessRequest } = require("../../services/servicenowService");
const { getSession, clearSession } = require("../../memory/sessionStore");
const requestService = require("../../services/servicenow/request.service");
const logger = require("../../utils/logger");

/**
 * PARSE REQUEST NUMBERS FROM TEXT
 * Extracts REQ numbers like REQ0010022
 * Normalizes to uppercase and deduplicates.
 */
function extractRequestNumbers(text) {
  const matches = text.match(/REQ\d+/gi);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

/**
 * PARSE INCIDENT NUMBERS FROM TEXT
 * Extracts INC numbers like INC0010045
 * Normalizes to uppercase and deduplicates.
 */
function extractIncidentNumbers(text) {
  const matches = text.match(/INC\d+/gi);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

/**
 * PARSE USERNAMES FROM TEXT
 * Strips ticket numbers first, then extracts candidate usernames.
 */
function extractUsernames(text) {
  // Remove ticket numbers first so they aren't treated as usernames
  let cleaned = text.replace(/\b(?:REQ|INC)\d+\b/gi, " ");

  const words = cleaned
    .split(/[\s,;]+/)
    .filter(word =>
      word.length >= 3 &&
      /^[a-zA-Z0-9._-]+$/.test(word) &&
      !["request", "status", "check", "provide", "username", "number", "if", "you", "have", "or", "and", "the", "for", "incident", "confirm", "cancel"].includes(word.toLowerCase())
    );

  return [...new Set(words)];
}

/**
 * STATE MAP - Convert ServiceNow state numbers to readable names
 */
const STATE_MAP = {
  "1": "Open",
  "2": "Work in Progress",
  "3": "Pending Approval",
  "4": "Approved",
  "6": "Closed Complete",
  "7": "Closed Incomplete",
  "8": "Cancelled",
};

/**
 * VALIDATE APPLICATION
 * Helper to validate and handle application responses
 */
async function validateApplicationHelper(appName, context = {}) {
  try {
    const validation = await requestService.validateApplication(appName);

    if (validation.isValid) {
      return {
        status: "valid",
        application: validation.application,
      };
    } else if (validation.suggestions && validation.suggestions.length > 0) {
      return {
        status: "partial",
        suggestions: validation.suggestions,
        error: validation.error,
      };
    } else {
      return {
        status: "invalid",
        error: validation.error,
      };
    }
  } catch (error) {
    logger.error("Application validation error", { error: error.message, appName });
    return {
      status: "error",
      error: "Error validating application",
    };
  }
}

/**
 * HANDLE APPLICATION VALIDATION RESPONSE
 * Reusable logic for both access requests and incidents
 */
async function handleApplicationValidation(session, userId, text, workflowType) {
  try {
    const validation = await validateApplicationHelper(text.trim());

    if (validation.status === "valid") {
      session.collectedData.application = validation.application.name;
      session.collectedData.applicationShortName = validation.application.shortName;

      if (workflowType === "access_request") {
        session.awaitingField = "username";
        return {
          success: true,
          message: `Great! Application found: ${validation.application.name}\n\nNow, please provide your username.`,
        };
      } else if (workflowType === "incident") {
        session.awaitingField = "details";
        return {
          success: true,
          message: `Got it! Creating incident for ${validation.application.name}.\n\nPlease provide more details about the issue.`,
        };
      }
    } else if (validation.status === "partial") {
      const suggestions = validation.suggestions
        .map((app, idx) => `${idx + 1}. ${app.name}`)
        .join("\n");

      return {
        success: false,
        isSuggestion: true,
        suggestions: validation.suggestions,
        message: `"${text}" not found exactly.\n\nDid you mean one of these?\n\n${suggestions}\n\nPlease select a number or provide the correct application name.`,
      };
    } else {
      return {
        success: false,
        isSuggestion: false,
        message: `I couldn't find the application "${text}" in ServiceNow.\n\nThis application is invalid. Please check the name and try again, or type CANCEL to start over.`,
      };
    }
  } catch (error) {
    logger.error("Application validation handler error", { error: error.message });
    return {
      success: false,
      error: true,
      message: `Error validating application. Please try again.`,
    };
  }
}

/**
 * HANDLE SUGGESTION SELECTION
 * When user selects from application suggestions
 */
function handleSuggestionSelection(text, suggestions) {
  const selectedIndex = parseInt(text, 10) - 1;

  if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < suggestions.length) {
    const app = suggestions[selectedIndex];
    return {
      selected: true,
      application: {
        name: app.name,
        shortName: app.shortName ?? app.name,
      },
    };
  }

  return {
    selected: false,
  };
}

/**
 * FETCH REQUEST STATUS
 * Helper to fetch and format request status
 */
async function fetchRequestStatus(requestNumbers, usernames) {
  let allResults = [];

  // Handle request numbers
  if (requestNumbers.length > 0) {
    for (const reqNumber of requestNumbers) {
      try {
        const request = await requestService.getRequestStatus(reqNumber);
        const stateLabel = STATE_MAP[request.state] ?? request.state;

        allResults.push({
          type: "request",
          number: request.number,
          state: stateLabel,
          created: request.created,
        });
      } catch (error) {
        allResults.push({
          type: "request_error",
          number: reqNumber,
          error: "Request not found",
        });
      }
    }
  }

  // Handle usernames for requests
  if (usernames.length > 0) {
    for (const username of usernames) {
      try {
        const userSysId = await requestService.resolveUserSysId(username);

        if (!userSysId) {
          allResults.push({
            type: "user_error",
            username,
            error: "User not found in ServiceNow",
          });
          continue;
        }

        const requests = await requestService.getUserRequests(userSysId);

        if (!requests || requests.length === 0) {
          allResults.push({
            type: "user_no_requests",
            username,
          });
        } else {
          allResults.push({
            type: "user_requests",
            username,
            requests: requests.map(req => ({
              number: req.number,
              state: STATE_MAP[req.state] ?? req.state,
              description: req.short_description,
            })),
          });
        }
      } catch (error) {
        logger.error("Error fetching user requests", { error: error.message });
        allResults.push({
          type: "user_error",
          username,
          error: "Error fetching requests",
        });
      }
    }
  }

  return allResults;
}

/**
 * FETCH INCIDENT STATUS
 * Helper to fetch and format incident status
 */
async function fetchIncidentStatus(incidentNumbers, usernames) {
  let allResults = [];

  // Handle incident numbers
  if (incidentNumbers.length > 0) {
    for (const incNumber of incidentNumbers) {
      try {
        // Ensure this method is correct for incidents; if not, rename in requestService
        const incident = await requestService.getIncidentStatus?.(incNumber) ?? await requestService.getRequestStatus(incNumber);
        const stateLabel = STATE_MAP[incident.state] ?? incident.state;

        allResults.push({
          type: "incident",
          number: incident.number,
          state: stateLabel,
          created: incident.created,
        });
      } catch (error) {
        allResults.push({
          type: "incident_error",
          number: incNumber,
          error: "Incident not found",
        });
      }
    }
  }

  // Handle usernames for incidents
  if (usernames.length > 0) {
    for (const username of usernames) {
      try {
        const userSysId = await requestService.resolveUserSysId(username);

        if (!userSysId) {
          allResults.push({
            type: "user_error",
            username,
            error: "User not found in ServiceNow",
          });
          continue;
        }

        // For incidents, we'd need a method to get user's incidents
        // For now, we'll note this limitation
        allResults.push({
          type: "user_incident_note",
          username,
          message: "Incident lookup by username requires ServiceNow configuration",
        });
      } catch (error) {
        logger.error("Error fetching user incidents", { error: error.message });
        allResults.push({
          type: "user_error",
          username,
          error: "Error fetching incidents",
        });
      }
    }
  }

  return allResults;
}

/**
 * FORMAT REQUEST STATUS RESPONSE
 * Helper to format status results into readable message
 */
function formatRequestStatusResponse(results) {
  if (results.length === 0) {
    return "I couldn't find any request numbers or usernames in your message.\n\n" +
      "Please provide:\n" +
      "- Request number (e.g., REQ0010022)\n" +
      "- Username (e.g., sayyedr)\n" +
      "- Or both separated by comma";
  }

  let responseText = "";

  for (const result of results) {
    if (result.type === "user_requests") {
      responseText += `\n📋 Requests for ${result.username}:\n`;
      result.requests.forEach((req, idx) => {
        responseText += `${idx + 1}. ${req.number}\n   Status: ${req.state}\n   Description: ${req.description}\n`;
      });
    } else if (result.type === "user_no_requests") {
      responseText += `\n✓ ${result.username}: No open requests\n`;
    } else if (result.type === "user_error") {
      responseText += `\n✗ ${result.username}: ${result.error}\n`;
    } else if (result.type === "request") {
      responseText += `\n📌 Request: ${result.number}\n   Status: ${result.state}\n   Created: ${result.created}\n`;
    } else if (result.type === "request_error") {
      responseText += `\n✗ ${result.number}: ${result.error}\n`;
    }
  }

  return `Request Status Summary:${responseText}\n\nWould you like more details about any of these?`;
}

/**
 * FORMAT INCIDENT STATUS RESPONSE
 * Helper to format incident status results into readable message
 */
function formatIncidentStatusResponse(results) {
  if (results.length === 0) {
    return "I couldn't find any incident numbers or usernames in your message.\n\n" +
      "Please provide:\n" +
      "- Incident number (e.g., INC0010045)\n" +
      "- Username (e.g., sayyedr)\n" +
      "- Or both separated by comma";
  }

  let responseText = "";

  for (const result of results) {
    if (result.type === "incident") {
      responseText += `\n🔴 Incident: ${result.number}\n   Status: ${result.state}\n   Created: ${result.created}\n`;
    } else if (result.type === "incident_error") {
      responseText += `\n✗ ${result.number}: ${result.error}\n`;
    } else if (result.type === "user_error") {
      responseText += `\n✗ ${result.username}: ${result.error}\n`;
    } else if (result.type === "user_incident_note") {
      responseText += `\nⓘ ${result.username}: ${result.message}\n`;
    }
  }

  return `Incident Status Summary:${responseText}\n\nWould you like more details about any of these?`;
}

/**
 * MAIN CHAT ENDPOINT
 */
router.post("/message", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        error: "message and userId required",
      });
    }

    const session = getSession(userId);
    const text = message.trim();
    const lowerText = text.toLowerCase();

    /**
     * CANCEL - global, at any time
     */
    if (lowerText === "cancel") {
      clearSession(userId);
      return res.json({
        reply: "Request cancelled.",
      });
    }

    /**
     * CONFIRM HANDLER WITH EXPLICIT FALLBACK
     */
    if (session.awaitingConfirmation) {
      if (lowerText === "confirm") {
        if (session.workflow === "incident") {
          // Ensure normalized payload
          const incidentPayload = {
            shortDescription: session.collectedData.shortDescription,
            description: session.collectedData.description,
            application: session.collectedData.application,
            assignmentGroup: session.collectedData.assignmentGroup,
          };
          const incident = await createIncident(incidentPayload);
          clearSession(userId);
          return res.json({
            reply: `Incident created successfully.\n\nNumber:\n${incident.number}`,
          });
        }

        if (session.workflow === "access_request") {
          const payload = {
            application: session.collectedData.application,
            applicationShortName: session.collectedData.applicationShortName,
            username: session.collectedData.username,
            assignmentGroup: session.collectedData.assignmentGroup,
            configurationItem: session.collectedData.configurationItem,
            userId,
          };

          const result = await createAccessRequest(payload);

          if (result.notSnowUser) {
            clearSession(userId);
            return res.json({
              reply: `You are not a registered ServiceNow user.\n\nUsername:\n${session.collectedData.username}\n\nPlease contact your IT administrator to get onboarded.`,
            });
          }

          if (result.isDuplicate) {
            clearSession(userId);
            return res.json({
              reply: `You already have an open request for ${session.collectedData.application}.\n\nRequest Number:\n${result.existingRequest.number}\n\nStatus:\n${result.existingRequest.stage ?? result.existingRequest.state}\n\nPlease wait for it to be resolved before submitting a new one.`,
            });
          }

          clearSession(userId);
          return res.json({
            reply: `Access request created successfully.\n\nRequest Number:\n${result.number}`,
          });
        }
      }

      if (lowerText === "cancel") {
        // Already handled globally, but be explicit here too
        clearSession(userId);
        return res.json({
          reply: "Request cancelled.",
        });
      }

      // Not confirm or cancel: ask user again
      return res.json({
        reply: "Please type CONFIRM to continue or CANCEL to stop.",
      });
    }

    /**
     * APPLICATION VALIDATION FOR ACCESS REQUEST
     */
    if (session.workflow === "access_request" && session.awaitingField === "application_validation") {
      const result = await handleApplicationValidation(session, userId, text, "access_request");

      if (result.error) {
        return res.json({ reply: result.message });
      }

      if (result.isSuggestion) {
        session.collectedData.suggestedApplications = result.suggestions;
        session.awaitingField = "application_selection";
        return res.json({ reply: result.message });
      }

      if (result.success) {
        session.awaitingField = "username";
        return res.json({ reply: result.message });
      }

      return res.json({ reply: result.message });
    }

    /**
     * APPLICATION SELECTION FOR ACCESS REQUEST (From suggestions)
     */
    if (session.workflow === "access_request" && session.awaitingField === "application_selection") {
      const selection = handleSuggestionSelection(text, session.collectedData.suggestedApplications);

      if (selection.selected) {
        session.collectedData.application = selection.application.name;
        session.collectedData.applicationShortName = selection.application.shortName;
        session.awaitingField = "username";
        return res.json({
          reply: `Got it! ${selection.application.name} selected.\n\nPlease provide your username.`,
        });
      }

      const result = await handleApplicationValidation(session, userId, text, "access_request");

      if (result.isSuggestion) {
        session.collectedData.suggestedApplications = result.suggestions;
        return res.json({ reply: result.message });
      }

      return res.json({ reply: result.message });
    }

    /**
     * USERNAME COLLECTION FOR ACCESS REQUEST
     */
    if (session.workflow === "access_request" && session.awaitingField === "username") {
      session.collectedData.username = text;
      session.awaitingField = null;
      session.awaitingConfirmation = true;

      return res.json({
        reply: `Please confirm access request.\n\nApplication:\n${session.collectedData.application}\n\nUsername:\n${text}\n\nType CONFIRM to create request.`,
      });
    }

    /**
     * USERNAME/REQUEST NUMBER COLLECTION FOR REQUEST STATUS
     */
    if (session.workflow === "request_status" && session.awaitingField === "username_or_request") {
      const requestNumbers = extractRequestNumbers(text);
      const usernames = extractUsernames(text);

      try {
        const results = await fetchRequestStatus(requestNumbers, usernames);
        clearSession(userId);
        return res.json({
          reply: formatRequestStatusResponse(results),
        });
      } catch (error) {
        logger.error("Failed to fetch request status", { error: error.message });
        clearSession(userId);
        return res.json({
          reply: `Error checking requests. Please try again.`,
        });
      }
    }

    /**
     * INCIDENT NUMBER/USERNAME COLLECTION FOR INCIDENT STATUS
     */
    if (session.workflow === "incident_status" && session.awaitingField === "number_or_username") {
      const incidentNumbers = extractIncidentNumbers(text);
      const usernames = extractUsernames(text);

      try {
        const results = await fetchIncidentStatus(incidentNumbers, usernames);
        clearSession(userId);
        return res.json({
          reply: formatIncidentStatusResponse(results),
        });
      } catch (error) {
        logger.error("Failed to fetch incident status", { error: error.message });
        clearSession(userId);
        return res.json({
          reply: `Error checking incidents. Please try again.`,
        });
      }
    }

    /**
     * INCIDENT DETAILS
     */
    if (session.workflow === "incident" && session.awaitingField === "details") {
      session.collectedData.description = text;
      session.awaitingField = null;
      session.awaitingConfirmation = true;

      return res.json({
        reply: `Please confirm incident creation.\n\nIssue:\n${text}\n\nType CONFIRM to create incident.`,
      });
    }

    /**
     * INCIDENT APPLICATION VALIDATION
     */
    if (session.workflow === "incident" && session.awaitingField === "application_validation") {
      const result = await handleApplicationValidation(session, userId, text, "incident");

      if (result.error) {
        clearSession(userId);
        return res.json({ reply: result.message });
      }

      if (result.isSuggestion) {
        session.collectedData.suggestedApplications = result.suggestions;
        session.awaitingField = "application_selection";
        return res.json({ reply: result.message });
      }

      if (result.success) {
        session.awaitingField = "details";
        return res.json({ reply: result.message });
      }

      return res.json({ reply: result.message });
    }

    /**
     * INCIDENT APPLICATION SELECTION (From suggestions)
     */
    if (session.workflow === "incident" && session.awaitingField === "application_selection") {
      const selection = handleSuggestionSelection(text, session.collectedData.suggestedApplications);

      if (selection.selected) {
        session.collectedData.application = selection.application.name;
        session.collectedData.applicationShortName = selection.application.shortName;
        session.awaitingField = "details";
        return res.json({
          reply: `Got it! ${selection.application.name} selected.\n\nPlease provide more details about the issue.`,
        });
      }

      const result = await handleApplicationValidation(session, userId, text, "incident");

      if (result.isSuggestion) {
        session.collectedData.suggestedApplications = result.suggestions;
        return res.json({ reply: result.message });
      }

      return res.json({ reply: result.message });
    }

    /**
     * AI PROCESSING
     */
    const response = await processMessage(session, text);

    /**
     * REQUEST STATUS FLOW
     */
    if (response.type === "REQUEST_STATUS") {
      session.workflow = "request_status";
      session.awaitingField = "username_or_request";
      session.collectedData = {};

      return res.json({
        reply: `I can check your request status.\n\nPlease provide:\n• Username (e.g., sayyedr)\n• Request number (e.g., REQ0010022)\n• Or both separated by comma`,
      });
    }

    /**
     * INCIDENT STATUS FLOW
     */
    if (response.type === "INCIDENT_STATUS") {
      session.workflow = "incident_status";
      session.awaitingField = "number_or_username";
      session.collectedData = {};

      return res.json({
        reply: `I can check your incident status.\n\nPlease provide:\n• Incident number (e.g., INC0010045)\n• Username (e.g., sayyedr)\n• Or both separated by comma`,
      });
    }

    /**
     * ACCESS REQUEST FLOW
     */
    if (response.type === "ACCESS_REQUEST") {
      session.workflow = "access_request";
      session.awaitingField = "application_validation";
      session.collectedData = {
        application: response.application,
        assignmentGroup: response.assignmentGroup,
        configurationItem: response.configurationItem,
      };

      return res.json({
        reply: `I detected an access request for: ${response.application}\n\nLet me verify this application exists in our system...\n\nPlease confirm the exact application name or short name you need access to.\n\nType CANCEL if you want to start over.`,
      });
    }

    /**
     * INCIDENT FLOW - All variants
     */
    if (response.type === "INCIDENT_APPLICATION_VALIDATED") {
      session.workflow = "incident";
      session.awaitingField = "details";
      session.collectedData = {
        shortDescription: response.incident.title,
        description: response.incident.description,
        application: response.incident.application,
        assignmentGroup: response.incident.assignmentGroup,
      };
      return res.json({ reply: response.reply });
    }

    if (response.type === "INCIDENT_APPLICATION_VALIDATION") {
      session.workflow = "incident";
      session.awaitingField = "application_selection";
      session.collectedData = {
        description: response.incident.description,
        suggestedApplications: response.incident.suggestedApplications,
        assignmentGroup: response.incident.assignmentGroup,
      };
      return res.json({ reply: response.reply });
    }

    if (response.type === "INCIDENT_INVALID_APPLICATION") {
      clearSession(userId);
      return res.json({ reply: response.reply });
    }

    if (response.type === "READY_TO_CREATE_INCIDENT") {
      session.workflow = "incident";
      session.awaitingField = "details";
      session.collectedData = {
        shortDescription: response.incident.title,
        application: response.incident.application,
        assignmentGroup: response.incident.assignmentGroup,
      };
      return res.json({ reply: response.reply });
    }

    return res.json({
      reply: response.reply ?? response.message,
    });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    return res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;