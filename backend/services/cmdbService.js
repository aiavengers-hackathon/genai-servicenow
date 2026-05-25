const axios = require("axios");

const SNOW_URL =
  process.env.SN_INSTANCE;

const SNOW_USER =
  process.env.SN_USER;

const SNOW_PASSWORD =
  process.env.SN_PASS;

/**
 * CLEAN APPLICATION NAME
 */
function cleanApplicationName(name) {

  return name
    .replace(/application/gi, "")
    .replace(/app/gi, "")
    .trim();
}

/**
 * FIND APPLICATION
 */
async function findApplication(name) {

  try {

    /**
     * CLEAN USER INPUT
     */
    const cleanedName =
      cleanApplicationName(name);

    console.log(
      "Searching CMDB for:",
      cleanedName
    );

    /**
     * MULTIPLE SEARCH STRATEGIES
     */
    const queries = [

      // Exact match
      `name=${cleanedName}`,

      // LIKE search
      `nameLIKE${cleanedName}`,

      // Starts with
      `nameSTARTSWITH${cleanedName}`,

      // Contains
      `nameCONTAINS${cleanedName}`,
    ];

    for (const query of queries) {

      console.log(
        "Trying query:",
        query
      );

      const response =
        await axios.get(

        `${SNOW_URL}/api/now/table/cmdb_ci_business_app`,

        {
          auth: {
            username: SNOW_USER,
            password: SNOW_PASSWORD,
          },

          params: {

            sysparm_query: query,

            sysparm_limit: 5,

            sysparm_fields:
              "sys_id,name,support_group,business_criticality,owned_by",
          },
        }
      );

      const results =
        response.data.result;

      if (
        results &&
        results.length > 0
      ) {

        console.log(
          "FOUND APPLICATION:",
          results[0].name
        );

        return results[0];
      }
    }

    /**
     * NOTHING FOUND
     */
    console.log(
      "No CMDB application found"
    );

    return null;

  } catch (err) {

    console.error(
      "CMDB SEARCH ERROR:",
      err.response?.data ||
      err.message
    );

    return null;
  }
}

module.exports = {
  findApplication,
};