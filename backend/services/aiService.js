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

async function analyzeUserRequest(message) {
  const prompt = `
You are an enterprise ServiceNow AI Agent.

Analyze the user message and return ONLY valid JSON.

Fields:
- type
- category
- subcategory
- urgency
- impact
- assignment_group
- short_description
- description

User Message:
${message}
`;

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      {
        role: "system",
        content: "You are a ServiceNow ITSM AI assistant."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2,
  });

  const text = response.choices[0].message.content;

  return JSON.parse(text);
}

module.exports = {
  analyzeUserRequest,
};