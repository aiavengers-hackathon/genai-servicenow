/**
 * ENTERPRISE AI SERVICENOW AGENT
 * Production-Grade Architecture Guide
 * 
 * This file demonstrates the complete production-grade AI agent implementation
 * using the enterprise architecture specified in the requirements.
 */

/**
 * QUICK START - COMPLETE WORKFLOW
 * 
 * This shows how all the services work together
 */

const IncidentOrchestrator = require("../orchestration/incidentOrchestrator");
const TriageEngine = require("../orchestration/triageEngine");
const WorkflowEngine = require("../orchestration/workflowEngine");
const SessionStore = require("../memory/sessionStore");
const RAGService = require("../services/ai/rag.service");
const IntentClassifier = require("../services/ai/intentClassifier.service");
const EntityExtractor = require("../services/ai/entityExtractor.service");
const PriorityEngine = require("../services/ai/priorityEngine.service");
const IncidentService = require("../services/servicenow/incident.service");
const RequestService = require("../services/servicenow/request.service");
const KBService = require("../services/servicenow/kb.service");
const CMDBService = require("../services/servicenow/cmdb.service");

/**
 * EXAMPLE 1: SIMPLE KB QUERY
 * 
 * User: "How do I reset my password?"
 * 
 * Flow:
 * 1. IntentClassifier → KB_QUERY (high confidence from patterns)
 * 2. KBService.searchArticles → Returns password reset guide
 * 3. Return to user with solution
 */
async function example1_KBQuery() {
  const user = { id: "user123", department: "Finance" };
  const message = "How do I reset my password?";

  const result = await IncidentOrchestrator.orchestrateIncident(message, user);

  console.log("Example 1 Result:", result);
  // Expected: KB articles with password reset guides
}

/**
 * EXAMPLE 2: INCIDENT WITH SELF-HEALING
 * 
 * User: "My Outlook email is not working"
 * 
 * Flow:
 * 1. IntentClassifier → INCIDENT (high confidence)
 * 2. EntityExtractor → application: "Outlook", impact: "SINGLE_USER"
 * 3. KBService search → Finds "Outlook Cache Clear" solution
 * 4. Return solution, ask user to try
 * 5. If user says "Still not working" → Create incident
 */
async function example2_IncidentWithSelfHealing() {
  const user = { id: "user456", department: "Sales" };
  const message = "My Outlook email is not working, I cannot send or receive emails";

  const result = await IncidentOrchestrator.orchestrateIncident(message, user);

  console.log("Example 2 Result:", result);
  // Expected: KB solution for Outlook, await user feedback
}

/**
 * EXAMPLE 3: SERVICE REQUEST / ACCESS REQUEST
 * 
 * User: "I need SAP access for the new project"
 * 
 * Flow:
 * 1. IntentClassifier → SERVICE_REQUEST / ACCESS_REQUEST
 * 2. RequestService.searchCatalogItems → Find SAP access items
 * 3. Conversationally ask for details
 * 4. Submit request
 * 5. Notify user of request number
 */
async function example3_ServiceRequest() {
  const user = { id: "user789", department: "Finance" };
  const message = "I need SAP access for the new project";

  const result = await IncidentOrchestrator.orchestrateIncident(message, user);

  console.log("Example 3 Result:", result);
  // Expected: Catalog items available for SAP access
}

/**
 * EXAMPLE 4: MAJOR INCIDENT / OUTAGE
 * 
 * User: "All users in Finance cannot access SAP"
 * 
 * Flow:
 * 1. IntentClassifier → OUTAGE (patterns detect "all users")
 * 2. Check for duplicates/related incidents
 * 3. CMDBService → Get SAP app info and support group
 * 4. PriorityEngine → Calculate P1/P2
 * 5. Create incident immediately
 * 6. Notify assignment group + incident commander
 */
async function example4_Outage() {
  const user = { id: "user999", department: "Finance" };
  const message = "All users in Finance cannot access SAP, system is down";

  const result = await IncidentOrchestrator.orchestrateIncident(message, user);

  console.log("Example 4 Result:", result);
  // Expected: P1 incident created, notifications sent
}

/**
 * EXAMPLE 5: COMPLETE INCIDENT WORKFLOW
 * 
 * User: "VPN connection keeps timing out, blocks my work"
 * 
 * Flow:
 * 1. Classify → INCIDENT
 * 2. Extract → application: VPN, impact: SINGLE_USER, urgency: MEDIUM
 * 3. Search KB → Find solutions
 * 4. If KB found → Offer solutions
 * 5. If KB doesn't help → Create incident with:
 *    - Look up VPN in CMDB
 *    - Get support group
 *    - Calculate priority
 *    - Create incident
 *    - Notify support group
 *    - Update user
 */
async function example5_CompleteWorkflow() {
  const user = { id: "vpnuser", department: "Engineering" };
  const message = "VPN connection keeps timing out, I cannot access company resources";

  // Step 1: Initial triage
  const triageResult = await TriageEngine.process(message, user);

  console.log("Triage Result:", triageResult);

  // Step 2: Handle self-heal if applicable
  if (triageResult.type === "SELF_HEAL") {
    // Offer KB solutions
    console.log("Found KB solutions, asking user...");

    // User says: "I already tried that"
    const confirmation = {
      stillNeedHelp: true,
    };

    if (confirmation.stillNeedHelp) {
      // Step 3: Create incident
      const incidentResult = await IncidentOrchestrator.createConfirmedIncident(
        triageResult.incident,
        user
      );

      console.log("Incident Created:", incidentResult);
    }
  }

  // Expected flow leads to incident creation with proper assignment
}

/**
 * EXAMPLE 6: USING RAG FOR INTELLIGENT SEARCH
 * 
 * Combines KB articles, historical tickets, and vector search
 */
async function example6_RAGSearch() {
  const query = "How to troubleshoot slow VPN connection";

  // Retrieve relevant documents
  const retrieved = await RAGService.retrieveAndAugment(query);

  console.log("Retrieved sources:", retrieved.sources);

  // Generate contextual answer
  const answer = await RAGService.generateAnswer(query, retrieved);

  console.log("Generated answer:", answer.answer);
}

/**
 * EXAMPLE 7: CONVERSATION MEMORY
 * 
 * Multi-turn conversation with context preservation
 */
async function example7_ConversationMemory() {
  const userId = "user555";

  // Turn 1: User asks about VPN
  const session1 = SessionStore.getSession(userId);
  SessionStore.addMessage(userId, "I have a VPN issue", "user");
  console.log("Session after turn 1:", session1);

  // Turn 2: User provides more details
  SessionStore.addMessage(userId, "It times out after 5 minutes", "user");
  SessionStore.setCollectedData(userId, "vpnTimeout", "5_minutes");

  // Get conversation history
  const history = SessionStore.getConversationHistory(userId);
  console.log("Full conversation history:", history);

  // Get user profile for personalization
  const profile = SessionStore.getUserProfile(userId);
  console.log("User profile:", profile);

  // Track application
  SessionStore.trackApplication(userId, "VPN");
  console.log("After tracking VPN:", SessionStore.getUserProfile(userId).history.frequentApplications);
}

/**
 * EXAMPLE 8: PRIORITY CALCULATION
 * 
 * Enterprise priority matrix based on impact × urgency
 */
async function example8_PriorityCalculation() {
  // Scenario: Single user, medium urgency, non-critical system
  const priority1 = PriorityEngine.calculatePriority({
    impact: "INDIVIDUAL",
    urgency: "MEDIUM",
    businessCriticality: "LOW",
    affectedUsers: 1,
  });

  console.log("Priority 1:", priority1);
  // Expected: P4 or P5

  // Scenario: Multiple departments affected, business-critical system
  const priority2 = PriorityEngine.calculatePriority({
    impact: "DIVISION",
    urgency: "HIGH",
    businessCriticality: "CRITICAL",
    affectedUsers: 50,
    isOutage: true,
  });

  console.log("Priority 2:", priority2);
  // Expected: P1 or P2
}

/**
 * ARCHITECTURE SUMMARY
 * 
 * User Input (Chat/Portal/Teams/Slack)
 *     ↓
 * [Intent Classifier] → Classify user intent
 *     ↓
 * [Entity Extractor] → Extract applications, impact, urgency
 *     ↓
 * [Triage Engine] → Route to appropriate handler
 *     ↓
 * ├─ KB Query → [RAG Service] → Return solutions
 * ├─ Access Request → [Request Service] → Conversational fulfillment
 * ├─ Incident → [Duplicate Check] → [KB Self-Heal] → [Create Incident]
 * └─ Outage → [High Priority Incident] → [Notify Command Center]
 *     ↓
 * [Priority Engine] → Calculate P1-P5
 *     ↓
 * [CMDB Service] → Get app info, support group, dependencies
 *     ↓
 * [Workflow Engine] → Orchestrate ticket creation
 *     ↓
 * [Incident/Request Service] → Create in ServiceNow
 *     ↓
 * [Notification Engine] → Email/Teams/Slack to assignees
 *     ↓
 * [Session Store] → Track conversation and user history
 *     ↓
 * [Vector Memory / RAG] → Learn and improve responses
 *
 * Result: User receives resolution or ticket number with tracking
 */

/**
 * DEPLOYMENT CHECKLIST
 * 
 * ✓ Azure OpenAI connection configured
 * ✓ ServiceNow instance URL and credentials set
 * ✓ Vector database initialized
 * ✓ Notification channels configured (Email/Teams/Slack)
 * ✓ Session storage configured
 * ✓ Logger configured
 * ✓ Error handling and retry logic in place
 * ✓ Performance monitoring setup
 * ✓ Security: API authentication, rate limiting
 * ✓ Testing: Unit tests, integration tests, UAT
 */

module.exports = {
  example1_KBQuery,
  example2_IncidentWithSelfHealing,
  example3_ServiceRequest,
  example4_Outage,
  example5_CompleteWorkflow,
  example6_RAGSearch,
  example7_ConversationMemory,
  example8_PriorityCalculation,
};
