/**
 * SERVICENOW KNOWLEDGE BASE SERVICE
 * 
 * Production-grade KB management:
 * - Search knowledge articles
 * - Get article details
 * - Rank by relevance
 * - Track article usage
 */

const axios = require("axios");
const logger = require("../../utils/logger");

class KBService {
  constructor() {
    this.baseURL = process.env.SN_INSTANCE || "https://dev12345.service-now.com";
    this.kbEndpoint = "/api/now/table/kb_knowledge";
    this.auth = {
      username: process.env.SN_USER,
      password: process.env.SN_PASS,
    };
  }

  /**
   * SEARCH KNOWLEDGE ARTICLES
   */
  async searchArticles(query, options = {}) {
    try {
      const { maxResults = 10, relevanceRank = true } = options;

      logger.debug("Searching KB articles", { query: query.substring(0, 50) });

      // Search in title, short_description, and text
      const searchQuery = `short_descriptionLIKE${query}%25ORtextLIKE${query}%25&publishedIS true&activeIS true`;

      const response = await axios.get(`${this.baseURL}${this.kbEndpoint}`, {
        params: {
          sysparm_query: searchQuery,
          sysparm_limit: maxResults,
          sysparm_fields:
            "sys_id,number,short_description,text,category,views,rating,useful_count,not_useful_count",
        },
        auth: this.auth,
      });

      let articles = response.data.result || [];

      // Rank by relevance (views, rating, etc.)
      if (relevanceRank) {
        articles = articles.sort((a, b) => {
          const scoreA = (parseInt(a.useful_count) || 0) - (parseInt(a.not_useful_count) || 0);
          const scoreB = (parseInt(b.useful_count) || 0) - (parseInt(b.not_useful_count) || 0);
          return scoreB - scoreA;
        });
      }

      logger.debug("Found KB articles", { count: articles.length });

      return articles.map((article) => ({
        id: article.sys_id,
        number: article.number,
        title: article.short_description,
        content: article.text ? article.text.substring(0, 500) : "", // Truncate for preview
        fullContent: article.text,
        category: article.category,
        views: article.views,
        rating: article.rating,
        helpfulCount: article.useful_count,
        notHelpfulCount: article.not_useful_count,
        url: `${this.baseURL}/nav_to.do?uri=kb_knowledge.do?sys_id=${article.sys_id}`,
      }));
    } catch (error) {
      logger.error("KB search failed", { error: error.message });
      return [];
    }
  }

  /**
   * GET ARTICLE DETAILS
   */
  async getArticle(articleId) {
    try {
      logger.debug("Fetching KB article", { articleId });

      const response = await axios.get(`${this.baseURL}${this.kbEndpoint}/${articleId}`, {
        auth: this.auth,
      });

      const article = response.data.result;

      if (!article) {
        throw new Error(`Article ${articleId} not found`);
      }

      return {
        id: article.sys_id,
        number: article.number,
        title: article.short_description,
        content: article.text,
        category: article.category,
        author: article.author,
        createdDate: article.sys_created_on,
        updatedDate: article.sys_updated_on,
        views: article.views,
        rating: article.rating,
        url: `${this.baseURL}/nav_to.do?uri=kb_knowledge.do?sys_id=${article.sys_id}`,
      };
    } catch (error) {
      logger.error("Failed to get KB article", { error: error.message });
      throw error;
    }
  }

  /**
   * RATE ARTICLE (HELPFUL/NOT HELPFUL)
   */
  async rateArticle(articleId, helpful = true) {
    try {
      logger.debug("Rating article", { articleId, helpful });

      const article = await this.getArticle(articleId);

      const field = helpful ? "useful_count" : "not_useful_count";
      const newCount = (parseInt(article[field]) || 0) + 1;

      await axios.patch(`${this.baseURL}${this.kbEndpoint}/${articleId}`, {
        [field]: newCount,
      });

      logger.info("Article rated", { articleId, helpful });
    } catch (error) {
      logger.error("Failed to rate article", { error: error.message });
    }
  }

  /**
   * SEARCH BY CATEGORY
   */
  async getByCategory(category, maxResults = 20) {
    try {
      logger.debug("Fetching KB articles by category", { category });

      const response = await axios.get(`${this.baseURL}${this.kbEndpoint}`, {
        params: {
          sysparm_query: `categoryIS${category}&publishedIS true&activeIS true`,
          sysparm_limit: maxResults,
          sysparm_fields: "sys_id,number,short_description,category,views",
        },
        auth: this.auth,
      });

      const articles = response.data.result || [];

      return articles.map((article) => ({
        id: article.sys_id,
        number: article.number,
        title: article.short_description,
        views: article.views,
      }));
    } catch (error) {
      logger.error("Failed to get articles by category", { error: error.message });
      return [];
    }
  }
}

module.exports = new KBService();