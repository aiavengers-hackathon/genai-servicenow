const axios = require('axios');
const logger = require('../../utils/logger');

class DuplicateDetectionService {
  /**
   * Find duplicate incidents using multiple strategies
   */
  static async findDuplicates(data) {
    try {
      const baseURL = process.env.SN_INSTANCE;
      const auth = {
        username: process.env.SN_USER,
        password: process.env.SN_PASS,
      };

      // Search for exact description match
      const exactMatch = await axios.get(`${baseURL}/api/now/table/incident`, {
        auth,
        params: {
          sysparm_query: `short_descriptionLIKE${data.short_description}^stateIN1,2,3`,
          sysparm_limit: 5,
          sysparm_fields: 'sys_id,number,short_description,state,priority,opened_at',
        },
        timeout: 10000,
      });

      if (exactMatch.data.result && exactMatch.data.result.length > 0) {
        return {
          isDuplicate: true,
          type: 'EXACT_MATCH',
          incidents: exactMatch.data.result.map((inc) => ({
            number: inc.number,
            description: inc.short_description,
            state: inc.state,
            priority: inc.priority,
            opened: inc.opened_at,
            sys_id: inc.sys_id,
          })),
          recommendation: 'This issue appears to be already reported. Please review existing incident.',
        };
      }

      // Check for similar incidents
      const similarIncidents = await axios.get(`${baseURL}/api/now/table/incident`, {
        auth,
        params: {
          sysparm_query: `cmdb_ci=${data.cmdb_ci || 'General'}^stateIN1,2`,
          sysparm_limit: 10,
          sysparm_fields: 'sys_id,number,short_description,state',
        },
        timeout: 10000,
      });

      if (similarIncidents.data.result && similarIncidents.data.result.length > 0) {
        const similar = this._findSimilarTickets(
          data.short_description,
          similarIncidents.data.result
        );

        if (similar.length > 0) {
          return {
            isDuplicate: false,
            type: 'SIMILAR_INCIDENTS',
            incidents: similar,
            recommendation: 'Similar tickets found. Review them before creating new ticket.',
          };
        }
      }

      return {
        isDuplicate: false,
        type: 'UNIQUE',
        incidents: [],
        recommendation: 'No duplicates found. Safe to create new incident.',
      };
    } catch (error) {
      logger.error('Duplicate detection failed', { error: error.message });
      return {
        isDuplicate: false,
        type: 'CHECK_FAILED',
        error: error.message,
      };
    }
  }

  /**
   * Find similar tickets using string similarity
   */
  static _findSimilarTickets(query, tickets, threshold = 0.7) {
    return tickets
      .filter((ticket) => {
        const similarity = this._stringSimilarity(
          query.toLowerCase(),
          ticket.short_description.toLowerCase()
        );
        return similarity > threshold;
      })
      .map((ticket) => ({
        number: ticket.number,
        description: ticket.short_description,
        state: ticket.state,
        sys_id: ticket.sys_id,
      }));
  }

  /**
   * Calculate string similarity (0-1)
   */
  static _stringSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm for string similarity
   */
  static _levenshteinDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}

module.exports = DuplicateDetectionService;
