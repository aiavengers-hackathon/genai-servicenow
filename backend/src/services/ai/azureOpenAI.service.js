/**
 * AZURE OPENAI SERVICE
 * Production-grade Azure OpenAI wrapper
 */

const OpenAI = require("openai");
const logger = require("../../utils/logger");

class AzureOpenAIService {
  constructor() {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentId =
      process.env.AZURE_OPENAI_DEPLOYMENT_ID || "gpt-4o";

    const embeddingDeploymentId =
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_ID ||
      "text-embedding-3-small";

    const apiVersion =
      process.env.AZURE_OPENAI_API_VERSION ||
      "2024-02-15-preview";

    if (!apiKey || !endpoint) {
      throw new Error(
        "Missing AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT"
      );
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments/${deploymentId}`,
      defaultQuery: {
        "api-version": apiVersion,
      },
      defaultHeaders: {
        "api-key": apiKey,
      },
    });

    this.embeddingClient = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments/${embeddingDeploymentId}`,
      defaultQuery: {
        "api-version": apiVersion,
      },
      defaultHeaders: {
        "api-key": apiKey,
      },
    });

    this.deploymentId = deploymentId;
    this.embeddingDeploymentId = embeddingDeploymentId;

    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * CHAT WITH FUNCTION CALLING
   */
  async chatWithFunctions(
    messages,
    functions = [],
    temperature = 0.7
  ) {
    try {
      const response = await this._retryWithBackoff(async () => {
        return await this.client.chat.completions.create({
          model: this.deploymentId,
          messages,
          temperature,
          max_tokens: 2048,
          tools: functions.map((fn) => ({
            type: "function",
            function: fn,
          })),
        });
      });

      const choice = response.choices[0];

      return {
        content: choice.message.content,
        toolCalls: choice.message.tool_calls || [],
        finishReason: choice.finish_reason,
        usage: response.usage,
      };
    } catch (error) {
      logger.error("Azure OpenAI chat error", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * SIMPLE CHAT
   */
  async chat(messages, temperature = 0.7, maxTokens = 2048) {
    try {
      const response = await this._retryWithBackoff(async () => {
        return await this.client.chat.completions.create({
          model: this.deploymentId,
          messages,
          temperature,
          max_tokens: maxTokens,
        });
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
      };
    } catch (error) {
      logger.error("Azure OpenAI chat error", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * SINGLE EMBEDDING
   */
  async getEmbedding(text) {
    try {
      const response = await this._retryWithBackoff(async () => {
        return await this.embeddingClient.embeddings.create({
          model: this.embeddingDeploymentId,
          input: text,
        });
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error("Embedding error", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * MULTIPLE EMBEDDINGS
   */
  async getEmbeddings(texts) {
    try {
      const response = await this._retryWithBackoff(async () => {
        return await this.embeddingClient.embeddings.create({
          model: this.embeddingDeploymentId,
          input: texts,
        });
      });

      return response.data.map((d) => d.embedding);
    } catch (error) {
      logger.error("Embeddings error", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * STREAMING CHAT
   */
  async chatStream(messages, temperature = 0.7, onChunk) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.deploymentId,
        messages,
        temperature,
        stream: true,
      });

      let fullContent = "";

      for await (const chunk of stream) {
        const content =
          chunk.choices?.[0]?.delta?.content || "";

        if (content) {
          fullContent += content;

          if (onChunk) {
            onChunk(content);
          }
        }
      }

      return fullContent;
    } catch (error) {
      logger.error("Streaming error", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * RETRY LOGIC
   */
  async _retryWithBackoff(fn) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        const status = error.status || error.code;

        if (
          status === 401 ||
          status === 403 ||
          (status >= 400 && status < 500)
        ) {
          throw error;
        }

        if (attempt < this.maxRetries - 1) {
          const delay =
            this.retryDelay * Math.pow(2, attempt);

          logger.warn(
            `Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, delay)
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * JSON EXTRACTION
   */
  static extractJSON(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      logger.warn("JSON extraction failed", {
        error: error.message,
      });

      return null;
    }
  }
}

module.exports = new AzureOpenAIService();