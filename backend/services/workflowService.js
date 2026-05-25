const mappings = {
  BAAMR: {
    assignment_group: "RD Clinical",
    configuration_item: "BAAMR Application",
  },

  VPN: {
    assignment_group: "Network Team",
    configuration_item: "Corporate VPN",
    category: "Network",
    subcategory: "VPN",
  },
};

function handleWorkflow(
  session,
  aiData,
  message
) {

  // Greeting
  if (aiData.intent === "greeting") {
    return {
      reply:
        "Hello! How can I help you today?",
    };
  }

  // INCIDENT FLOW
  if (aiData.intent === "incident") {

    session.workflow = "incident";

    const app =
      aiData.application || "VPN";

    const mapping =
      mappings[app.toUpperCase()];

    session.collectedData = {
      application: app,
      assignment_group:
        mapping?.assignment_group,

      configuration_item:
        mapping?.configuration_item,

      category:
        mapping?.category,

      subcategory:
        mapping?.subcategory,

      short_description:
        aiData.short_description,

      urgency:
        aiData.urgency || "1",

      impact:
        aiData.impact || "1",
    };

    session.awaitingField = "incident_details";

    return {
      reply:
`I can help create an incident for ${app} issues.

Please provide:
1. Your username
2. Error message
3. Is this impacting your work?`,
    };
  }

  // INCIDENT DETAILS COLLECTION
  if (
    session.awaitingField ===
    "incident_details"
  ) {

    session.collectedData.description =
      message;

    session.awaitingField = null;

    session.awaitingConfirmation = true;

    return {
      reply:
`Please confirm incident details:

Category:
${session.collectedData.category}

Subcategory:
${session.collectedData.subcategory}

Assignment Group:
${session.collectedData.assignment_group}

Configuration Item:
${session.collectedData.configuration_item}

Priority:
High

Short Description:
${session.collectedData.short_description}

Description:
${session.collectedData.description}

Type CONFIRM to create incident.`,
    };
  }

  // ACCESS REQUEST FLOW
  if (aiData.intent === "access_request") {

    session.workflow = "access_request";

    const app =
      aiData.application?.toUpperCase();

    const mapping = mappings[app];

    session.collectedData = {
      application: app,

      assignment_group:
        mapping?.assignment_group,

      configuration_item:
        mapping?.configuration_item,
    };

    session.awaitingField = "username";

    return {
      reply:
`Sure — I can help with ${app} access.

Please provide your username.`,
    };
  }

  // ACCESS USERNAME
  if (
    session.awaitingField === "username"
  ) {

    session.collectedData.username =
      message;

    session.awaitingField = null;

    session.awaitingConfirmation = true;

    return {
      reply:
`Please confirm request details:

Application:
${session.collectedData.application}

Username:
${session.collectedData.username}

Assignment Group:
${session.collectedData.assignment_group}

Configuration Item:
${session.collectedData.configuration_item}

Type CONFIRM to create request.`,
    };
  }

  // FINAL CONFIRMATION
  if (
    session.awaitingConfirmation &&
    message.toLowerCase() === "confirm"
  ) {

    if (
      session.workflow === "incident"
    ) {

      return {
        action: "CREATE_INCIDENT",
        data: session.collectedData,
      };
    }

    if (
      session.workflow ===
      "access_request"
    ) {

      return {
        action: "CREATE_REQUEST",
        data: session.collectedData,
      };
    }
  }

  return {
    reply:
      "Could you please provide more details?",
  };
}

module.exports = {
  handleWorkflow,
};