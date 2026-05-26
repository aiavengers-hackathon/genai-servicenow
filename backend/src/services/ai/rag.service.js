/**
 * RAG (RETRIEVAL AUGMENTED GENERATION) SERVICE
 * 
 * Combines vector search with LLM for intelligent retrieval:
 * - Search knowledge base
 * - Combine multiple sources
 * - Re-rank by relevance
 * - Generate contextual responses
 */

const azureOpenAI = require("../services/ai/azureOpenAI.service");
const KBService = require("../services/servicenow/kb.service");
const VectorMemory = require("../memory/vectorMemory");
const logger = require("../utils/logger");

class RAGService {
  /**
   * RETRIEVE AND AUGMENT
   * 
   * Retrieves relevant documents and augments LLM prompt
   */
  async retrieveAndAugment(query, options = {}) {
    try {
      const { maxResults = 5, threshold = 0.7 } = options;

      logger.debug("RAG retrieval started", { query: query.substring(0, 50) });

      // Parallel retrieval from multiple sources
      const [kbArticles, vectorResults] = await Promise.all([
        KBService.searchArticles(query, { maxResults }),
        VectorMemory.search(query, { topK: maxResults, threshold }),
      ]);

      logger.debug("RAG retrieval completed", {
        kbArticles: kbArticles.length,
        vectorResults: vectorResults.length,
      });

      // Combine and deduplicate
      const combined = this._combineResults(kbArticles, vectorResults);

      return {
        query,
        sources: combined,
        context: this._buildContext(combined),
        count: combined.length,
      };
    } catch (error) {
      logger.error("RAG retrieval error", { error: error.message });
      return {
        query,
        sources: [],
        context: "",
        count: 0,
      };
    }
  }

  /**
   * GENERATE ANSWER WITH CONTEXT
   */
  async generateAnswer(query, retrievedContext) {
    try {
      logger.debug("RAG answer generation", { query: query.substring(0, 50) });

      const contextText = this._buildContext(retrievedContext.sources);

      const systemPrompt = `You are a helpful IT service desk assistant. 
Use the provided context to answer the user's question accurately and concisely.
If the context doesn't contain relevant information, say so and provide general guidance.
Always cite the source when possible.`;

      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Context:\n${contextText}\n\nQuestion: ${query}`,
        },
      ];

      const response = await azureOpenAI.chat(messages, 0.7);

      return {
        answer: response.content,
        sources: retrievedContext.sources,
        confidence: retrievedContext.count > 0 ? "HIGH" : "LOW",
      };
    } catch (error) {
      logger.error("Answer generation error", { error: error.message });
      throw error;
    }
  }

  /**
   * SEMANTIC SEARCH
   * Enhanced search combining keyword and semantic similarity
   */
  async semanticSearch(query, options = {}) {
    try {
      const { maxResults = 10, algorithm = "hybrid" } = options;

      // Get vector embedding
      const queryEmbedding = await azureOpenAI.getEmbedding(query);

      // Search vector DB
      const vectorResults = await VectorMemory.search(query, { topK: maxResults });

      // Search KB with keywords
      const kbResults = await KBService.searchArticles(query, { maxResults });

      // Combine based on algorithm
      let results;
      switch (algorithm) {
        case "semantic":
          results = vectorResults;
          break;
        case "keyword":
          results = kbResults;
          break;
        case "hybrid":
        default:
          results = this._combineResults(kbResults, vectorResults);
          break;
      }

      return results.slice(0, maxResults);
    } catch (error) {
      logger.error("Semantic search error", { error: error.message });
      return [];
    }
  }

  /**
   * COMBINE RESULTS FROM MULTIPLE SOURCES
   */
  _combineResults(kbResults, vectorResults) {
    const combined = new Map();

    // Add KB results
    kbResults.forEach((item) => {
      combined.set(item.id, {
        ...item,
        source: "kb",
        score: item.helpfulCount ? (item.helpfulCount / (item.helpfulCount + item.notHelpfulCount)) : 0.5,
      });
    });

    // Add/merge vector results
    vectorResults.forEach((item) => {
      if (combined.has(item.id)) {
        // Boost score if in both
        combined.get(item.id).score *= 1.5;
        combined.get(item.id).sources = ["kb", "vector"];
      } else {
        combined.set(item.id, {
          ...item,
          source: "vector",
          score: item.similarity,
        });
      }
    });

    // Sort by score
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * BUILD CONTEXT STRING
   */
  _buildContext(sources) {
    if (sources.length === 0) {
      return "";
    }

    const context = sources
      .map((source, index) => {
        const title = source.title || source.name;
        const content = source.fullContent || source.content || source.text;
        const truncated = content ? content.substring(0, 300) : "";

        return `[${index + 1}] ${title}
${truncated}...
Source: ${source.source || "Unknown"}
`;
      })
      .join("\n---\n");

    return context;
  }

  /**
   * INDEX DOCUMENT FOR RAG
   * Add new documents to vector store
   */
  async indexDocument(doc) {
    try {
      logger.debug("Indexing document for RAG", { title: doc.title });

      return await VectorMemory.storeVector({
        text: `${doc.title}\n${doc.content}`,
        type: doc.type || "document",
        metadata: {
          title: doc.title,
          source: doc.source,
          url: doc.url,
        },
      });
    } catch (error) {
      logger.error("Document indexing error", { error: error.message });
      throw error;
    }
  }

  /**
   * BATCH INDEX DOCUMENTS
   */
  async indexBatch(documents) {
    try {
      logger.debug("Batch indexing documents", { count: documents.length });

      const items = documents.map((doc) => ({
        text: `${doc.title}\n${doc.content}`,
        type: doc.type || "document",
        metadata: {
          title: doc.title,
          source: doc.source,
          url: doc.url,
        },
      }));

      return await VectorMemory.storeBatch(items);
    } catch (error) {
      logger.error("Batch indexing error", { error: error.message });
      throw error;
    }
  }
}

module.exports = new RAGService();
