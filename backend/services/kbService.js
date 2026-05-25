const axios = require("axios");

async function searchKB(query) {
  try {
    const response = await axios.get(
      `${process.env.SNOW_URL}/api/now/table/kb_knowledge`,
      {
        auth: {
          username: process.env.SN_USER,
          password: process.env.SN_PASS,
        },
        params: {
          sysparm_query: `short_descriptionLIKE${query}`,
          sysparm_limit: 3,
        },
      }
    );

    return response.data.result;
  } catch (err) {
    console.error(err);
    return [];
  }
}

module.exports = { searchKB };