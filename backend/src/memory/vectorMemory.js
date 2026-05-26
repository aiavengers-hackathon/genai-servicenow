/**
 * VECTOR MEMORY & RAG SERVICE
 * 
 * Manages embeddings and vector search for:
 * - KB articles (knowledge base search)
 * - Historical incidents (similarity matching)
 * - Solutions and runbooks
 * - SOPs and documentation
 * 
 * Uses Azure Cognitive Search or similar vector DB
 */

const azureOpenAI = require("../services/ai/azureOpenAI.service");
const logger = require("../utils/logger");

class VectorMemory {
  constructor() {
    // In production, this would connect to Azure Cognitive Search
    // For now, using in-memory vector store for demo
    this.vectorStore = new Map();
    this.nextId = 1;
  }

  /**
   * STORE VECTOR EMBEDDING
   * Useful for KB articles, solutions, runbooks
   */
  async storeVector(data) {
    try {
      const { text, type, metadata = {} } = data;

      if (!text) {
        throw new Error("Text is required for vector storage");
      }

      // Generate embedding
      const embedding = await azureOpenAI.getEmbedding(text);

      const vectorRecord = {
        id: this.nextId++,
        text,
        type, // kb_article, solution, runbook, sop
        embedding,
        metadata,
        createdAt: new Date(),
      };

      this.vectorStore.set(vectorRecord.id, vectorRecord);

      logger.debug("Vector stored", { id: vectorRecord.id, type });
      return vectorRecord.id;
    } catch (error) {
      logger.error("Vector storage error", { error: error.message });
      throw error;
    }
  }

  /**
   * SEARCH FOR SIMILAR VECTORS (RAG)
   * Returns top K most similar results
   */
  async search(query, options = {}) {
    try {
      const {
        topK = 5,
        type = null, // Filter by type (kb_article, solution, etc.)
        threshold = 0.7, // Similarity threshold
      } = options;

      logger.debug("Vector search", { query: query.substring(0, 50), topK, type });

      // Generate embedding for query
      const queryEmbedding = await azureOpenAI.getEmbedding(query);

      // Calculate similarities
      const results = [];

      for (const [id, record] of this.vectorStore) {
        // Filter by type if specified
        if (type && record.type !== type) {
          continue;
        }

        // Calculate cosine similarity
        const similarity = this._cosineSimilarity(queryEmbedding, record.embedding);

        if (similarity >= threshold) {
          results.push({
            id,
            text: record.text,
            type: record.type,
            similarity,
            metadata: record.metadata,
            createdAt: record.createdAt,
          });
        }
      }

      // Sort by similarity (descending) and take top K
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, topK);
    } catch (error) {
      logger.error("Vector search error", { error: error.message });
      return [];
    }
  }

  /**
   * BATCH STORE MULTIPLE VECTORS
   * For bulk importing KB articles, solutions, etc.
   */
  async storeBatch(items) {
    try {
      logger.debug("Batch storing vectors", { count: items.length });

      const ids = [];

      for (const item of items) {
        const id = await this.storeVector(item);
        ids.push(id);
      }

      return ids;
    } catch (error) {
      logger.error("Batch storage error", { error: error.message });
      throw error;
    }
  }

  /**
   * RETRIEVE VECTOR BY ID
   */
  getVector(id) {
    return this.vectorStore.get(id);
  }

  /**
   * DELETE VECTOR
   */
  deleteVector(id) {
    return this.vectorStore.delete(id);
  }

  /**
   * COSINE SIMILARITY
   * Calculate similarity between two vectors
   */
  _cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }

  /**
   * GET STATISTICS
   */
  getStats() {
    const stats = {
      totalVectors: this.vectorStore.size,
      byType: {},
    };

    for (const record of this.vectorStore.values()) {
      stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * CLEAR ALL VECTORS (FOR TESTING)
   */
  clear() {
    this.vectorStore.clear();
    this.nextId = 1;
  }
}

module.exports = new VectorMemory();
