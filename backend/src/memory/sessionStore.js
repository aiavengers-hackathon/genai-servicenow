const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      workflow: null,
      awaitingField: null,
      awaitingConfirmation: false,
      awaitingStatusInput: false,   // NEW
      statusType: null,             // 'INCIDENT' or 'REQUEST'
      collectedData: {},
      userId,
    };
  }
  return sessions[userId];
}

function clearSession(userId) {
  delete sessions[userId];
}

module.exports = { getSession, clearSession };