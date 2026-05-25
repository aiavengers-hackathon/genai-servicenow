const OpenAI = require("openai");

require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,

  baseURL:
    `${process.env.AZURE_OPENAI_ENDPOINT}` +
    `/openai/deployments/` +
    `${process.env.AZURE_OPENAI_DEPLOYMENT}`,

  defaultQuery: {
    "api-version":
      process.env.AZURE_OPENAI_API_VERSION,
  },

  defaultHeaders: {
    "api-key":
      process.env.AZURE_OPENAI_API_KEY,
  },
});

/**
 * ENTERPRISE AI UNDERSTANDING ENGINE
 */
async function detectIntent(
  message,
  context = {}
) {

  const prompt = `
You are an enterprise ServiceNow GenAI assistant.

Your job is to:
1. Understand user intent
2. Extract ITSM entities
3. Determine business domain
4. Decide best action
5. Determine if:
   - KB lookup required
   - CMDB lookup required
   - Catalog lookup required
   - Incident lookup required
6. Ask clarification if needed

IMPORTANT:
Return ONLY valid JSON.
Do NOT return markdown.
Do NOT explain anything.

================================================
SUPPORTED DOMAINS
================================================

- conversation
- incident_management
- access_management
- service_request
- knowledge
- cmdb
- catalog
- hr_support
- security
- unknown

================================================
SUPPORTED INTENTS
================================================

CONVERSATION:
- greeting
- goodbye
- thanks
- affirmation
- denial
- confused
- human_agent_request

INCIDENT MANAGEMENT:
- incident_create
- incident_update
- incident_status
- incident_resolve
- incident_reopen
- outage_report
- major_incident_check
- vpn_issue
- login_issue
- network_issue
- email_issue
- application_issue
- hardware_issue
- software_issue
- printer_issue
- performance_issue
- security_issue

ACCESS MANAGEMENT:
- access_request
- access_remove
- role_request
- permission_request
- vpn_access
- database_access
- admin_access
- shared_drive_access
- application_access

SERVICE REQUEST:
- password_reset
- account_unlock
- software_install_request
- hardware_request
- laptop_request
- vm_request
- mobile_request
- equipment_request
- email_alias_request
- distribution_list_request

KNOWLEDGE:
- kb_help
- how_to
- faq_lookup
- troubleshooting
- policy_lookup
- process_lookup

CMDB:
- application_lookup
- ci_lookup
- support_group_lookup
- environment_lookup
- dependency_lookup

CATALOG:
- catalog_lookup
- request_status
- request_cancel
- request_update

SECURITY:
- phishing_report
- malware_issue
- account_compromise
- compliance_help

HR:
- onboarding_help
- offboarding_help
- payroll_help
- leave_policy
- benefits_help

================================================
SUPPORTED ACTIONS
================================================

- assist_with_kb
- create_incident
- create_request
- create_change
- create_problem
- lookup_application
- lookup_ci
- lookup_catalog
- lookup_incident
- show_catalog
- ask_clarification
- escalate_to_human
- no_action

================================================
IMPORTANT RULES
================================================

ACCESS REQUEST RULES:
- "need access"
- "request access"
- "grant access"
- "provide access"
→ access_request

INCIDENT RULES:
- "not working"
- "issue"
- "down"
- "unable to"
- "failing"
- "error"
- "problem"
→ incident-related

KNOWLEDGE RULES:
- "how to"
- "steps"
- "guide"
- "help"
→ knowledge

APPLICATION LOOKUP RULES:
- "check application"
- "is app available"
- "does app exist"
- "find application"
→ application_lookup

PASSWORD RULES:
- "forgot password"
- "reset password"
→ password_reset

================================================
ENTITY EXTRACTION
================================================

Extract:
- applications
- users
- locations
- groups
- ticket numbers
- KB numbers

================================================
CURRENT CONTEXT
================================================

${JSON.stringify(context, null, 2)}

================================================
USER MESSAGE
================================================

${message}

================================================
RETURN JSON FORMAT
================================================

{
  "domain": "",
  "intent": "",
  "sub_intent": "",

  "action": "",

  "application": "",
  "applications": [],

  "configuration_item": "",

  "category": "",
  "subcategory": "",

  "short_description": "",
  "description": "",

  "assignment_group": "",

  "urgency": "",
  "impact": "",
  "priority": "",

  "confidence": 0,

  "requires_kb_lookup": false,
  "requires_cmdb_lookup": false,
  "requires_catalog_lookup": false,
  "requires_incident_lookup": false,

  "entities": {
    "applications": [],
    "users": [],
    "groups": [],
    "locations": [],
    "tickets": [],
    "kb_articles": []
  },

  "clarification_question": ""
}
`;

  try {

    const response =
      await client.chat.completions.create({

      model:
        process.env.AZURE_OPENAI_DEPLOYMENT,

      messages: [

        {
          role: "system",

          content:
            `You are an enterprise-grade ServiceNow AI assistant.
             Always return strict JSON only.`,
        },

        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.1,

      response_format: {
        type: "json_object",
      },
    });

    const content =
      response.choices[0].message.content;

    const parsed =
      JSON.parse(content);

    return parsed;

  } catch (err) {

    console.error(
      "AI ERROR:",
      err.message
    );

    return {

      domain: "unknown",

      intent: "unknown",

      sub_intent: "",

      action: "ask_clarification",

      application: "",

      applications: [],

      configuration_item: "",

      category: "",

      subcategory: "",

      short_description:
        "Unable to determine request",

      description: "",

      assignment_group: "",

      urgency: "3",

      impact: "3",

      priority: "3",

      confidence: 0,

      requires_kb_lookup: false,

      requires_cmdb_lookup: false,

      requires_catalog_lookup: false,

      requires_incident_lookup: false,

      entities: {
        applications: [],
        users: [],
        groups: [],
        locations: [],
        tickets: [],
        kb_articles: [],
      },

      clarification_question:
        "Could you provide more details about your request?",
    };
  }
}

module.exports = {
  detectIntent,
};