const {
  detectIntent,
} = require("./aiService");

const {
  searchKB,
} = require("./kbService");

const {
  findApplication,
} = require("./cmdbService");

const {
  findAccessCatalog,
} = require("./catalogService");

/**
 * MAIN WORKFLOW ENGINE
 */
async function processMessage(
  session,
  message
) {

  /**
   * =========================================
   * STEP 1
   * AI UNDERSTANDING
   * ONLY FOR NEW REQUESTS
   * =========================================
   */
  const aiData =
    await detectIntent(
      message,
      session
    );

  console.log(
    "AI DATA:",
    JSON.stringify(aiData, null, 2)
  );

  /**
   * =========================================
   * GREETING
   * =========================================
   */
  if (
    aiData.intent === "greeting"
  ) {

    return {
      reply:
        "Hello! How can I assist you today?",
    };
  }

  /**
   * =========================================
   * APPLICATION LOOKUP
   * =========================================
   */
  if (
    aiData.intent ===
    "application_lookup"
  ) {

    const application =
      await findApplication(
        aiData.application
      );

    if (!application) {

      return {
        reply:
`I could not find the application "${aiData.application}" in ServiceNow CMDB.`,
      };
    }

    /**
     * SEARCH KB
     */
    const kbArticles =
      await searchKB(
        aiData.application
      );

    /**
     * SEARCH CATALOG
     */
    const catalogItem =
      await findAccessCatalog(
        aiData.application
      );

    let response =
`I found the application "${application.name}" in ServiceNow.

Support Group:
${application.support_group?.display_value || "Not Available"}

Business Criticality:
${application.business_criticality || "Not Available"}
`;

    /**
     * KB ARTICLES
     */
    if (kbArticles.length > 0) {

      response += `

Knowledge Articles:
`;

      kbArticles
        .slice(0, 3)
        .forEach((kb, index) => {

          response += `
${index + 1}. ${kb.short_description}`;
        });
    }

    /**
     * CATALOG
     */
    if (catalogItem) {

      response += `

Catalog Item:
${catalogItem.name}`;
    }

    return {
      reply: response,
    };
  }

  /**
   * =========================================
   * ACCESS REQUEST FLOW
   * =========================================
   */
  if (
    aiData.intent ===
      "access_request" ||

    aiData.intent ===
      "application_access"
  ) {

    /**
     * FIND APPLICATION
     */
    const application =
      await findApplication(
        aiData.application
      );

    /**
     * APPLICATION NOT FOUND
     */
    if (!application) {

      return {
        reply:
`I could not find the application "${aiData.application}" in ServiceNow CMDB.

Please verify the application name.`,
      };
    }

    /**
     * SEARCH KB
     */
    const kbArticles =
      await searchKB(
        aiData.application
      );

    /**
     * SEARCH CATALOG
     */
    const catalogItem =
      await findAccessCatalog(
        aiData.application
      );

    /**
     * START WORKFLOW
     */
    session.workflow =
      "access_request";

    session.awaitingField =
      "username";

    session.collectedData = {

      application:
        application.name,

      short_description:
        aiData.short_description ||
        `Access request for ${application.name}`,

      assignment_group:
        application.support_group
          ?.display_value ||
        "Service Desk",

      configuration_item:
        application.name,

      catalog_item:
        catalogItem?.name || null,
    };

    /**
     * BUILD RESPONSE
     */
    let response =
`I found the application "${application.name}" in ServiceNow.

Support Group:
${session.collectedData.assignment_group}
`;

    /**
     * KB ARTICLES
     */
    if (kbArticles.length > 0) {

      response += `

Knowledge Articles:
`;

      kbArticles
        .slice(0, 3)
        .forEach((kb, index) => {

          response += `
${index + 1}. ${kb.short_description}`;
        });
    }

    /**
     * CATALOG ITEM
     */
    if (catalogItem) {

      response += `

Catalog Item:
${catalogItem.name}`;
    }

    response += `

Please provide your username to continue with the access request.`;

    return {
      reply: response,
    };
  }

  /**
   * =========================================
   * INCIDENT FLOW
   * =========================================
   */
  if (

    aiData.domain ===
      "incident_management" ||

    aiData.intent ===
      "incident" ||

    aiData.intent ===
      "application_issue" ||

    aiData.intent ===
      "login_issue" ||

    aiData.intent ===
      "vpn_issue" ||

    aiData.intent ===
      "network_issue"
  ) {

    /**
     * FIND APPLICATION
     */
    const application =
      await findApplication(
        aiData.application
      );

    /**
     * APPLICATION NOT FOUND
     */
    if (!application) {

      return {
        reply:
`I could not find the application "${aiData.application}" in ServiceNow CMDB.

Please verify the application name.`,
      };
    }

    /**
     * SEARCH KB
     */
    const kbArticles =
      await searchKB(
        aiData.application
      );

    /**
     * START INCIDENT WORKFLOW
     */
    session.workflow =
      "incident";

    session.awaitingField =
      "incident_details";

    session.collectedData = {

      application:
        application.name,

      category:
        aiData.category ||
        "Application",

      subcategory:
        aiData.subcategory ||
        "Login Issue",

      assignment_group:
        application.support_group
          ?.display_value ||
        "Service Desk",

      configuration_item:
        application.name,

      short_description:
        aiData.short_description ||
        `${application.name} issue`,

      urgency:
        aiData.urgency || "2",

      impact:
        aiData.impact || "2",
    };

    /**
     * BUILD RESPONSE
     */
    let response =
`I found "${application.name}" in ServiceNow.

Support Group:
${session.collectedData.assignment_group}
`;

    /**
     * KB ARTICLES
     */
    if (kbArticles.length > 0) {

      response += `

Knowledge Articles:
`;

      kbArticles
        .slice(0, 3)
        .forEach((kb, index) => {

          response += `
${index + 1}. ${kb.short_description}`;
        });
    }

    response += `

Please describe the issue you are facing.`;

    return {
      reply: response,
    };
  }

  /**
   * =========================================
   * KB HELP FLOW
   * =========================================
   */
  if (

    aiData.intent === "kb_help" ||

    aiData.intent === "how_to" ||

    aiData.intent === "troubleshooting"
  ) {

    const kbArticles =
      await searchKB(
        aiData.application ||
        message
      );

    if (
      kbArticles.length === 0
    ) {

      return {
        reply:
          "I could not find any relevant knowledge articles.",
      };
    }

    let response =
      "I found the following knowledge articles:\n";

    kbArticles
      .slice(0, 5)
      .forEach((kb, index) => {

        response += `
${index + 1}. ${kb.short_description}`;
      });

    return {
      reply: response,
    };
  }

  /**
   * =========================================
   * PASSWORD RESET
   * =========================================
   */
  if (
    aiData.intent ===
    "password_reset"
  ) {

    return {
      reply:
`I can help with password reset.

Please use the Self-Service Password Reset portal or contact Service Desk if you are locked out.`,
    };
  }

  /**
   * =========================================
   * HUMAN AGENT
   * =========================================
   */
  if (
    aiData.intent ===
    "human_agent_request"
  ) {

    return {
      reply:
`I can connect you with the Service Desk team.

Please provide a brief summary of your issue.`,
    };
  }

  /**
   * =========================================
   * UNKNOWN / FALLBACK
   * =========================================
   */
  return {

    reply:
      "I could not fully understand your request. Please provide more details or specify the application/service involved.",
  };
}

module.exports = {
  processMessage,
};