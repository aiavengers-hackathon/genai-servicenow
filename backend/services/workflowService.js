const applicationMappings = {
  BAAMR: {
    assignment_group: "RD Clinical",
    configuration_item: "BAAMR Application",
  },

  SAP: {
    assignment_group: "SAP Support",
    configuration_item: "SAP ECC",
  },

  VPN: {
    assignment_group: "Network Team",
    configuration_item: "Corporate VPN",
  },
};

function handleWorkflow(session, aiData, message) {
  // Greeting
  if (aiData.intent === "greeting") {
    return {
      reply: "Hello! How can I help you today?",
    };
  }

  // Access Request Flow
  if (aiData.intent === "access_request") {
    session.workflow = "access_request";

    const app =
      aiData.application?.toUpperCase();

    session.collectedData.application = app;

    const mapping =
      applicationMappings[app];

    if (mapping) {
      session.collectedData.assignment_group =
        mapping.assignment_group;

      session.collectedData.configuration_item =
        mapping.configuration_item;
    }

    if (!session.collectedData.username) {
      session.awaitingField = "username";

      return {
        reply: `Sure — I can help with ${app} access.\n\nPlease provide your username.`,
      };
    }
  }

  // Username collection
  if (session.awaitingField === "username") {
    session.collectedData.username = message;

    session.awaitingField = null;

    session.awaitingConfirmation = true;

    return {
      reply:
`Please confirm the request:

Application: ${session.collectedData.application}
Username: ${session.collectedData.username}
Assignment Group: ${session.collectedData.assignment_group}
Configuration Item: ${session.collectedData.configuration_item}

Type CONFIRM to create the request.`,
    };
  }

  // Confirmation
  if (
    session.awaitingConfirmation &&
    message.toLowerCase() === "confirm"
  ) {
    return {
      action: "CREATE_REQUEST",
      data: session.collectedData,
    };
  }

  return {
    reply: "Could you please provide more details?",
  };
}

module.exports = {
  handleWorkflow,
};