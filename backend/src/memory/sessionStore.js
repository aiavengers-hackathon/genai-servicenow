const sessions = {};

/**
 * GET SESSION
 */
function getSession(userId) {

  if (!sessions[userId]) {

    sessions[userId] = {

      workflow: null,

      awaitingField: null,

      awaitingConfirmation: false,

      collectedData: {},

      userId,
    };
  }

  return sessions[userId];
}

/**
 * CLEAR SESSION
 */
function clearSession(userId) {

  delete sessions[userId];
}

module.exports = {
  getSession,
  clearSession,
};