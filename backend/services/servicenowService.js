const axios = require("axios");
require("dotenv").config();

const instance = process.env.SN_INSTANCE;
const username = process.env.SN_USER;
const password = process.env.SN_PASS;

async function createIncident(data) {
  const payload = {
    short_description: data.short_description,
    description: data.description,
    category: data.category,
    subcategory: data.subcategory,
    urgency: data.urgency || "2",
    impact: data.impact || "2",
    assignment_group: data.assignment_group || "Service Desk"
  };

  const response = await axios.post(
    `${instance}/api/now/table/incident`,
    payload,
    {
      auth: {
        username,
        password,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );

  return response.data.result;
}

module.exports = {
  createIncident,
};