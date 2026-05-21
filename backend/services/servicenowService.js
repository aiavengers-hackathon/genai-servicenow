const axios = require("axios");
require("dotenv").config();

const instance = process.env.SN_INSTANCE;
const username = process.env.SN_USER;
const password = process.env.SN_PASS;

const auth = {
  username,
  password,
};

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * CREATE INCIDENT
 */
async function createIncident(data) {
  try {
    const payload = {
      short_description:
        data.short_description ||
        "Incident created by AI Agent",

      description:
        data.description ||
        "No description provided",

      category:
        data.category || "Network",

      subcategory:
        data.subcategory || "VPN",

      urgency:
        data.urgency || "1",

      impact:
        data.impact || "1",
    };

    console.log(
      "Creating Incident Payload:",
      payload
    );

    const response = await axios.post(
      `${instance}/api/now/table/incident`,
      payload,
      {
        auth,
        headers,
      }
    );

    console.log(
      "Incident Created:",
      response.data.result.number
    );

    return response.data.result;

  } catch (err) {

    console.error(
      "Incident Creation Error:",
      err.response?.data || err.message
    );

    throw err;
  }
}

/**
 * CREATE ACCESS REQUEST
 */
async function createAccessRequest(data) {
  try {

    const payload = {
      short_description:
        `${data.application} Access Request`,

      description:
        `User ${data.username} requested access for ${data.application}`,

      special_instructions:
        `Assignment Group: ${data.assignment_group}`,

      requested_for:
        data.username,
    };

    console.log(
      "Creating Request Payload:",
      payload
    );

    /**
     * NOTE:
     * Using sc_request table directly
     * for MVP simplicity.
     */

    const response = await axios.post(
      `${instance}/api/now/table/sc_request`,
      payload,
      {
        auth,
        headers,
      }
    );

    console.log(
      "Request Created:",
      response.data.result.number
    );

    return response.data.result;

  } catch (err) {

    console.error(
      "Request Creation Error:",
      err.response?.data || err.message
    );

    throw err;
  }
}

module.exports = {
  createIncident,
  createAccessRequest,
};