const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      messages: [],
      workflow: null,
      collectedData: {},
      awaitingField: null,
      awaitingConfirmation: false,
    };
  }

  return sessions[userId];
}

function clearSession(userId) {
  delete sessions[userId];
}

module.exports = {
  getSession,
  clearSession,
};