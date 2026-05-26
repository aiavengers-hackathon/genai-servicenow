/**
 * SERVICENOW CMDB SERVICE
 * 
 * Production-grade CMDB operations:
 * - Find applications and services
 * - Get CI details and relationships
 * - Lookup support groups
 * - Dependency mapping
 * - Impact analysis
 */

const axios = require("axios");
const logger = require("../../utils/logger");

const SNOW_URL = process.env.SN_INSTANCE || "https://dev12345.service-now.com";
const SNOW_USER = process.env.SN_USER;
const SNOW_PASSWORD = process.env.SN_PASS;

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
 * FIND APPLICATION IN CMDB
 */
async function findApplication(name) {
  try {
    const cleanedName = cleanApplicationName(name);

    logger.debug("Searching CMDB for application", { cleanedName });

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
      logger.debug("Trying query:", query);

      const response = await axios.get(`${SNOW_URL}/api/now/table/cmdb_ci_business_app`, {
        auth: {
          username: SNOW_USER,
          password: SNOW_PASSWORD,
        },
        params: {
          sysparm_query: query,
          sysparm_limit: 5,
          sysparm_fields:
            "sys_id,name,support_group,business_criticality,owned_by,description,department",
        },
      });

      const results = response.data.result;

      if (results && results.length > 0) {
        logger.info("Found CMDB application", { name: results[0].name });

        return {
          id: results[0].sys_id,
          name: results[0].name,
          supportGroup: results[0].support_group,
          businessCriticality: results[0].business_criticality,
          owner: results[0].owned_by,
          description: results[0].description,
          department: results[0].department,
        };
      }
    }

    logger.warn("No CMDB application found", { name });
    return null;
  } catch (err) {
    logger.error("CMDB search error", { error: err.message });
    return null;
  }
}

/**
 * GET CI (CONFIGURATION ITEM) DETAILS
 */
async function getConfigurationItem(ciId) {
  try {
    logger.debug("Fetching CI details", { ciId });

    const response = await axios.get(`${SNOW_URL}/api/now/table/cmdb_ci/${ciId}`, {
      auth: {
        username: SNOW_USER,
        password: SNOW_PASSWORD,
      },
    });

    const ci = response.data.result;

    if (!ci) {
      throw new Error(`CI ${ciId} not found`);
    }

    return {
      id: ci.sys_id,
      name: ci.name,
      type: ci.sys_class_name,
      status: ci.install_status,
      owner: ci.owner,
      supportGroup: ci.support_group,
      lastUpdated: ci.sys_updated_on,
    };
  } catch (error) {
    logger.error("Failed to get CI details", { error: error.message });
    throw error;
  }
}

/**
 * FIND DEPENDENCIES (RELATED CIs)
 */
async function findDependencies(ciId) {
  try {
    logger.debug("Finding CI dependencies", { ciId });

    const response = await axios.get(`${SNOW_URL}/api/now/table/cmdb_rel_ci`, {
      auth: {
        username: SNOW_USER,
        password: SNOW_PASSWORD,
      },
      params: {
        sysparm_query: `parent_idIS${ciId}ORchild_idIS${ciId}`,
        sysparm_limit: 20,
        sysparm_fields: "parent_id,child_id,relationship_type,dependency_type",
      },
    });

    const relations = response.data.result || [];

    const dependencies = relations.map((rel) => ({
      parentId: rel.parent_id,
      childId: rel.child_id,
      type: rel.relationship_type,
      dependencyType: rel.dependency_type,
    }));

    logger.debug("Found dependencies", { count: dependencies.length });

    return dependencies;
  } catch (error) {
    logger.error("Failed to find dependencies", { error: error.message });
    return [];
  }
}

/**
 * GET SUPPORT GROUP FOR APPLICATION
 */
async function getSupportGroup(applicationName) {
  try {
    logger.debug("Looking up support group for application", { applicationName });

    const app = await findApplication(applicationName);

    if (!app || !app.supportGroup) {
      logger.warn("No support group found");
      return null;
    }

    const response = await axios.get(
      `${SNOW_URL}/api/now/table/sys_user_group/${app.supportGroup}`,
      {
        auth: {
          username: SNOW_USER,
          password: SNOW_PASSWORD,
        },
        params: {
          sysparm_fields: "sys_id,name,description,email",
        },
      }
    );

    const group = response.data.result;

    return {
      id: group.sys_id,
      name: group.name,
      email: group.email,
      description: group.description,
    };
  } catch (error) {
    logger.error("Failed to get support group", { error: error.message });
    return null;
  }
}

/**
 * CHECK SERVICE AVAILABILITY
 */
async function checkServiceAvailability(serviceName) {
  try {
    logger.debug("Checking service availability", { serviceName });

    const response = await axios.get(`${SNOW_URL}/api/now/table/cmdb_ci_service`, {
      auth: {
        username: SNOW_USER,
        password: SNOW_PASSWORD,
      },
      params: {
        sysparm_query: `nameLIKE${serviceName}`,
        sysparm_limit: 1,
        sysparm_fields: "sys_id,name,operational_status,status,status_change_date",
      },
    });

    const service = response.data.result?.[0];

    if (!service) {
      return { available: true, status: "UNKNOWN" };
    }

    const isAvailable = service.operational_status !== "Stopped" && service.status !== "Unavailable";

    return {
      available: isAvailable,
      status: service.operational_status,
      lastStatusChange: service.status_change_date,
    };
  } catch (error) {
    logger.error("Failed to check service availability", { error: error.message });
    return { available: true, status: "UNKNOWN" };
  }
}

/**
 * GET BLAST RADIUS (AFFECTED SERVICES)
 * Shows what other services/CIs would be affected
 */
async function getBlastRadius(ciId) {
  try {
    logger.debug("Computing blast radius", { ciId });

    const dependencies = await findDependencies(ciId);
    const affectedCIs = new Set([ciId]);

    // Recursively find dependent CIs
    const queue = [ciId];

    while (queue.length > 0 && affectedCIs.size < 100) {
      // Safety limit
      const current = queue.shift();

      for (const dep of dependencies) {
        if (dep.parentId === current) {
          affectedCIs.add(dep.childId);
          queue.push(dep.childId);
        }
      }
    }

    return {
      directlyAffected: affectedCIs.size,
      affectedCIs: Array.from(affectedCIs),
      blastRadius: affectedCIs.size > 10 ? "HIGH" : affectedCIs.size > 5 ? "MEDIUM" : "LOW",
    };
  } catch (error) {
    logger.error("Failed to compute blast radius", { error: error.message });
    return { directlyAffected: 0, affectedCIs: [], blastRadius: "UNKNOWN" };
  }
}

module.exports = {
  findApplication,
  getConfigurationItem,
  findDependencies,
  getSupportGroup,
  checkServiceAvailability,
  getBlastRadius,
  cleanApplicationName,
};