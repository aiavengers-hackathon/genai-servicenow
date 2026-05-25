const axios = require("axios");

const SNOW_URL = process.env.SN_INSTANCE;
const SN_USER = process.env.SN_USER;
const SN_PASS = process.env.SN_PASS;

/**
 * Search Service Catalog Items
 */
async function findCatalogItem(query) {

  try {

    const response = await axios.get(
      `${SNOW_URL}/api/now/table/sc_cat_item`,
      {
        auth: {
          username: SN_USER,
          password: SN_PASS,
        },

        params: {

          // Search active catalog items
          sysparm_query:
            `active=true^nameLIKE${query}`,

          sysparm_limit: 5,

          sysparm_fields:
            "sys_id,name,short_description,category,sc_catalogs",
        },
      }
    );

    return response.data.result;

  } catch (err) {

    console.error(
      "Catalog Search Error:",
      err.response?.data || err.message
    );

    return [];
  }
}

/**
 * Find Exact Catalog Item
 */
async function getCatalogItemByName(name) {

  try {

    const response = await axios.get(
      `${SNOW_URL}/api/now/table/sc_cat_item`,
      {
        auth: {
          username: SN_USER,
          password: SN_PASS,
        },

        params: {
          sysparm_query:
            `active=true^name=${name}`,

          sysparm_limit: 1,
        },
      }
    );

    return response.data.result[0] || null;

  } catch (err) {

    console.error(
      "Catalog Item Lookup Error:",
      err.response?.data || err.message
    );

    return null;
  }
}

/**
 * Search Access Request Catalogs
 */
async function findAccessCatalog(application) {

  try {

    const response = await axios.get(
      `${SNOW_URL}/api/now/table/sc_cat_item`,
      {
        auth: {
          username: SN_USER,
          password: SN_PASS,
        },

        params: {

          sysparm_query:
            `active=true^nameLIKE${application}` +
            `^ORshort_descriptionLIKE${application}`,

          sysparm_limit: 5,
        },
      }
    );

    const items = response.data.result || [];

    // Try to identify access-related catalog item
    const accessItem = items.find((item) => {

      const text =
        `${item.name} ${item.short_description}`
          .toLowerCase();

      return (
        text.includes("access") ||
        text.includes("request") ||
        text.includes("role") ||
        text.includes("permission")
      );
    });

    return accessItem || null;

  } catch (err) {

    console.error(
      "Access Catalog Search Error:",
      err.response?.data || err.message
    );

    return null;
  }
}

/**
 * Check if Application Exists in Catalog
 */
async function catalogItemExists(application) {

  try {

    const items =
      await findCatalogItem(application);

    return items.length > 0;

  } catch (err) {

    console.error(
      "Catalog Exists Error:",
      err.message
    );

    return false;
  }
}

module.exports = {
  findCatalogItem,
  getCatalogItemByName,
  findAccessCatalog,
  catalogItemExists,
};