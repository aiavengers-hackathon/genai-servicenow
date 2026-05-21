const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: {
    "api-version": process.env.AZURE_OPENAI_API_VERSION,
  },
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY,
  },
});

async function detectIntent(message) {
  const prompt = `
You are an enterprise ServiceNow AI Agent.

Analyze the message and return ONLY valid JSON.

Possible intents:
- greeting
- incident
- access_request
- service_request

Extract:
- intent
- application
- category
- short_description

Message:
${message}
`;

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: "system",
        content: "You are an intelligent ITSM AI assistant."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2,
  });

  return JSON.parse(
    response.choices[0].message.content
  );
}

module.exports = {
  detectIntent,
};