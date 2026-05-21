const axios = require("axios");
require("dotenv").config();

const instance = process.env.SN_INSTANCE;
const username = process.env.SN_USER;
const password = process.env.SN_PASS;

async function createAccessRequest(data) {
  const payload = {
    short_description:
      `${data.application} Access Request`,

    description:
      `User ${data.username} requested access for ${data.application}`,

    assignment_group:
      data.assignment_group,

    cmdb_ci:
      data.configuration_item,

    caller_id:
      data.username,
  };

  console.log("Payload:", payload);

  const response = await axios.post(
    `${instance}/api/now/table/sc_request`,
    payload,
    {
      auth: {
        username,
        password,
      },
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.result;
}

module.exports = {
  createAccessRequest,
};