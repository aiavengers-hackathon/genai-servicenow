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
 */
function extractRequestNumbers(text) {
  const matches = text.match(/REQ\d+/gi);
  return matches ? [...new Set(matches)] : [];
}

/**
 * PARSE USERNAMES FROM TEXT
 * Extracts words that look like usernames (alphanumeric, no spaces)
 */
function extractUsernames(text) {
  const words = text
    .split(/[\s,;]+/)
    .filter(word => 
      word.length > 2 && 
      /^[a-zA-Z0-9._-]+$/.test(word) &&
      !['request', 'status', 'check', 'provide', 'username', 'number', 'if', 'you', 'have', 'or', 'and', 'the', 'for'].includes(word.toLowerCase())
    );
  return [...new Set(words)];
}

/**
 * MAIN CHAT
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

    /**
     * CANCEL
     */
    if (text.toLowerCase() === "cancel") {
      clearSession(userId);
      return res.json({
        reply: "Request cancelled.",
      });
    }

    /**
     * CONFIRM
     */
    if (
      session.awaitingConfirmation &&
      text.toLowerCase() === "confirm"
    ) {

      /**
       * CREATE INCIDENT
       */
      if (session.workflow === "incident") {

        const incident = await createIncident(
          session.collectedData
        );

        clearSession(userId);

        return res.json({
          reply: `Incident created successfully.

Number:
${incident.number}`,
        });
      }

      /**
       * CREATE ACCESS REQUEST
       */
      if (session.workflow === "access_request") {

        const result = await createAccessRequest({
          ...session.collectedData,
          userId,
        });

        // NOT A SERVICENOW USER
        if (result.notSnowUser) {
          clearSession(userId);
          return res.json({
            reply: `You are not a registered ServiceNow user.

Username:
${session.collectedData.username}

Please contact your IT administrator to get onboarded.`,
          });
        }

        // DUPLICATE REQUEST EXISTS
        if (result.isDuplicate) {
          clearSession(userId);
          return res.json({
            reply: `You already have an open request for ${session.collectedData.application}.

Request Number:
${result.existingRequest.number}

Status:
${result.existingRequest.stage || result.existingRequest.state}

Please wait for it to be resolved before submitting a new one.`,
          });
        }

        // SUCCESS
        clearSession(userId);
        return res.json({
          reply: `Access request created successfully.

Request Number:
${result.number}`,
        });
      }
    }

    /**
     * APPLICATION VALIDATION FOR ACCESS REQUEST
     * NEW: Smart validation - checks if app exists in ServiceNow
     */
    if (
      session.workflow === "access_request" &&
      session.awaitingField === "application_validation"
    ) {

      const userInput = text.trim();

      try {

        const validation =
          await requestService
            .validateApplication(userInput);

        if (validation.isValid) {

          // Application found and valid
          session.collectedData.application =
            validation.application.name;

          session.collectedData.applicationShortName =
            validation.application.shortName;

          session.awaitingField = "username";
          session.awaitingConfirmation = false;

          return res.json({
            reply: `Great! Application found: ${validation.application.name}

Now, please provide your username.`,
          });

        } else if (
          validation.suggestions &&
          validation.suggestions.length > 0
        ) {

          // Partial matches found
          const suggestions =
            validation.suggestions
              .map((app, idx) =>
`${idx + 1}. ${app.name} (${app.shortName})`
              )
              .join("\n");

          return res.json({
            reply: `"${userInput}" not found exactly.

Did you mean one of these?

${suggestions}

Please provide the exact application name or short name, or type CANCEL to start over.`,
          });

        } else {

          // No matches found - invalid application
          return res.json({
            reply: `I couldn't find the application "${userInput}" in ServiceNow.

This application is invalid. Please check the name and try again, or type CANCEL to start over.`,
          });
        }

      } catch (error) {

        logger.error(
          "Application validation error",
          { error: error.message }
        );

        return res.json({
          reply: `Error validating application. Please try again.`,
        });
      }
    }

    /**
     * USERNAME COLLECTION FOR ACCESS REQUEST
     */
    if (
      session.workflow === "access_request" &&
      session.awaitingField === "username"
    ) {

      session.collectedData.username = text;
      session.awaitingField = null;
      session.awaitingConfirmation = true;

      return res.json({
        reply: `Please confirm access request.

Application:
${session.collectedData.application}

Username:
${text}

Type CONFIRM to create request.`,
      });
    }

    /**
     * USERNAME/REQUEST NUMBER COLLECTION FOR REQUEST STATUS
     */
    if (
      session.workflow === "request_status" &&
      session.awaitingField === "username_or_request"
    ) {

      try {

        const requestNumbers =
          extractRequestNumbers(text);

        const usernames =
          extractUsernames(text);

        let allResults = [];

        const stateMap = {
          "1": "Open",
          "2": "Work in Progress",
          "3": "Pending Approval",
          "4": "Approved",
          "6": "Closed Complete",
          "7": "Closed Incomplete",
          "8": "Cancelled",
        };

        /**
         * HANDLE REQUEST NUMBERS
         */
        if (requestNumbers.length > 0) {

          for (const reqNumber of requestNumbers) {

            try {

              const request =
                await requestService
                  .getRequestStatus(reqNumber);

              const stateLabel =
                stateMap[request.state] ||
                request.state;

              allResults.push({
                number: request.number,
                state: stateLabel,
                stage: request.stage,
                created: request.created,
              });

            } catch (error) {

              allResults.push({
                number: reqNumber,
                error:
                  "Request not found",
              });
            }
          }
        }

        /**
         * HANDLE USERNAMES
         */
        if (usernames.length > 0) {

          for (const username of usernames) {

            try {

              const userSysId =
                await requestService
                  .resolveUserSysId(username);

              if (!userSysId) {

                allResults.push({
                  username,
                  error:
                    "User not found in ServiceNow",
                });
                continue;
              }

              const requests =
                await requestService
                  .getUserRequests(userSysId);

              if (!requests || requests.length === 0) {

                allResults.push({
                  username,
                  message:
                    "No open requests",
                });
              } else {

                allResults.push({
                  username,
                  requests: requests.map(req => ({
                    number: req.number,
                    state: stateMap[req.state] || req.state,
                    description:
                      req.short_description,
                  })),
                });
              }

            } catch (error) {

              logger.error(
                "Error fetching user requests",
                { error: error.message }
              );

              allResults.push({
                username,
                error: "Error fetching requests",
              });
            }
          }
        }

        // Format comprehensive response
        if (allResults.length === 0) {

          clearSession(userId);

          return res.json({
            reply: `I couldn't find any request numbers or usernames in your message.

Please provide:
- Request number (e.g., REQ0010022)
- Username (e.g., sayyedr)
- Or both separated by comma`,
          });
        }

        let responseText = "";

        for (const result of allResults) {

          if (result.requests) {

            responseText += `\n📋 Requests for ${result.username}:\n`;

            result.requests.forEach((req, idx) => {
              responseText += `${idx + 1}. ${req.number}
   Status: ${req.state}
   Description: ${req.description}\n`;
            });

          } else if (result.message) {

            responseText += `\n✓ ${result.username}: ${result.message}\n`;

          } else if (result.error && result.username) {

            responseText += `\n✗ ${result.username}: ${result.error}\n`;

          } else if (result.state) {

            responseText += `\n📌 Request: ${result.number}
   Status: ${result.state}
   Created: ${result.created}\n`;

          } else if (result.error && result.number) {

            responseText += `\n✗ ${result.number}: ${result.error}\n`;
          }
        }

        clearSession(userId);

        return res.json({
          reply: `Request Status Summary:${responseText}

Would you like more details about any of these?`,
        });

      } catch (error) {

        logger.error(
          "Failed to fetch request status",
          { error: error.message }
        );

        clearSession(userId);

        return res.json({
          reply: `Error checking requests. Please try again.`,
        });
      }
    }

    /**
     * INCIDENT DETAILS
     */
    if (
      session.workflow === "incident" &&
      session.awaitingField === "details"
    ) {

      session.collectedData.description = text;
      session.awaitingField = null;
      session.awaitingConfirmation = true;

      return res.json({
        reply: `Please confirm incident creation.

Issue:
${text}

Type CONFIRM to create incident.`,
      });
    }

    /**
     * AI PROCESSING
     */
    const response = await processMessage(
      session,
      text
    );

    /**
     * REQUEST STATUS FLOW
     */
    if (response.type === "REQUEST_STATUS") {

      session.workflow = "request_status";
      session.awaitingField = "username_or_request";
      session.collectedData = {};

      return res.json({
        reply: `I can check your request status.

Please provide:
• Username (e.g., sayyedr)
• Request number (e.g., REQ0010022)
• Or both separated by comma`,
      });
    }

    /**
     * ACCESS REQUEST FLOW
     * NEW: Validate application first before asking for username
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
        reply: `I detected an access request for: ${response.application}

Let me verify this application exists in our system...

Please confirm the exact application name or short name you need access to. (e.g., BAAMR, CRDSRS)

Type CANCEL if you want to start over.`,
      });
    }

    /**
     * INCIDENT FLOW
     */
    if (response.type === "READY_TO_CREATE_INCIDENT") {

      session.workflow = "incident";
      session.awaitingField = "details";
      session.collectedData = {

        short_description:
          response.incident.title,

        application:
          response.incident.application,

        assignment_group:
          response.incident.assignmentGroup,
      };
    }

    return res.json({
      reply:
        response.reply ||
        response.message,
    });

  } catch (err) {

    console.error(
      "CHAT ERROR:",
      err.message
    );

    return res.status(500).json({
      error:
        err.message,
    });
  }
});

module.exports = router;