/**
 * WORKFLOW SERVICE ADAPTER
 */

const triageEngine = require("../orchestration/triageEngine");

const logger = require("../utils/logger");

/**
 * PROCESS MESSAGE
 */
async function processMessage(session, message) {

  try {

    logger.debug(
      "Processing message",
      {
        userId: session.userId,
        message,
      }
    );

    const result =
      await triageEngine.process(
        message,
        session
      );

    logger.debug(
      "Message processed",
      {
        type: result.type,
      }
    );

    return result;

  } catch (error) {

    logger.error(
      "Failed to process message",
      {
        error: error.message,
      }
    );

    throw error;
  }
}

/**
 * REQUEST WORKFLOW
 */
async function startRequestWorkflow(data) {

  return {
    success: true,
    data,
  };
}

module.exports = {
  processMessage,
  startRequestWorkflow,
};