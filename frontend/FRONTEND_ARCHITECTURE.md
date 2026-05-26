/**
 * FRONTEND ARCHITECTURE GUIDE
 * 
 * This document describes the complete frontend architecture for the
 * Enterprise AI ServiceNow Agent application.
 */

/**
 * ====================================================
 * FOLDER STRUCTURE
 * ====================================================
 * 
 * frontend/src/
 * ├── App.jsx                          # Main app with context provider
 * ├── index.css                        # Global TailwindCSS styles
 * ├── main.jsx                         # React entry point
 * ├── constants/
 * │   └── api.js                       # API endpoints, types, constants
 * ├── services/
 * │   └── api.js                       # API client with 12 endpoints
 * ├── utils/
 * │   └── helpers.js                   # 10+ utility functions
 * ├── context/
 * │   └── ConversationContext.jsx      # Global state management (17 actions)
 * ├── hooks/
 * │   └── useConversation.js           # 8 custom hooks for business logic
 * ├── pages/
 * │   ├── ChatPage.jsx                 # Main chat interface
 * │   └── Layout.jsx                   # Main layout with sidebar
 * └── components/
 *     ├── common/
 *     │   └── CommonComponents.jsx     # 9 reusable UI components
 *     ├── chat/
 *     │   └── ChatComponents.jsx       # 7 chat-specific components
 *     ├── incident/
 *     │   └── IncidentComponents.jsx   # 3 incident components
 *     └── request/
 *         └── RequestComponents.jsx    # 2 request components
 * 
 */

/**
 * ====================================================
 * COMPONENT HIERARCHY
 * ====================================================
 */

/**
 * App (Context Provider Wrapper)
 * ├── ConversationProvider (Global State)
 * │   └── AppContent
 * │       └── Layout (Sidebar + Main Area)
 * │           └── ChatPage
 * │               ├── ChatMessage (repeated)
 * │               ├── TypingIndicator
 * │               ├── SuggestionChips
 * │               ├── ErrorAlert
 * │               ├── KBArticleCard (repeated)
 * │               ├── IncidentConfirmation
 * │               ├── IncidentResult
 * │               ├── CatalogItem (repeated)
 * │               └── ChatInput
 */

/**
 * ====================================================
 * STATE MANAGEMENT (ConversationContext)
 * ====================================================
 * 
 * Global State Properties (16 total):
 * - messages[]                     # Chat message history
 * - loading                        # API call loading state
 * - error                          # Error message
 * - currentResponse                # Latest response data
 * - responseType                   # Type of response (KB, INCIDENT, etc)
 * - conversationId                 # Current conversation ID
 * - messageCount                   # Total messages in conversation
 * - incidentData                   # Pending incident details
 * - awaitingIncidentConfirmation   # Incident confirmation modal state
 * - catalogItems[]                 # Search results from catalog
 * - awaitingCatalogSelection       # Waiting for user to select catalog item
 * - kbArticles[]                   # Knowledge base search results
 * - showKBSolutions                # KB solutions panel visible
 * - userId                         # Current user ID
 * - userProfile                    # User profile data
 * - showSidebar                    # Sidebar visibility (mobile)
 * - isMobile                       # Mobile device state
 * 
 * Dispatch Actions (17 total):
 * - ADD_MESSAGE, SET_MESSAGES, SET_LOADING, SET_ERROR, CLEAR_ERROR
 * - SET_RESPONSE, CLEAR_RESPONSE
 * - SET_INCIDENT_DATA, SET_AWAITING_INCIDENT_CONFIRMATION, CONFIRM_INCIDENT
 * - SET_CATALOG_ITEMS, SET_AWAITING_CATALOG_SELECTION
 * - SET_KB_ARTICLES, SET_SHOW_KB_SOLUTIONS
 * - SET_USER, SET_USER_PROFILE
 * - SET_SHOW_SIDEBAR, SET_IS_MOBILE
 * - RESET_CONVERSATION
 */

/**
 * ====================================================
 * CUSTOM HOOKS (useConversation.js)
 * ====================================================
 * 
 * useConversation()
 *   Returns entire context object
 *   Usage: const { messages, loading, ... } = useConversation()
 * 
 * useChatMessage()
 *   Returns: { sendMessage(text) }
 *   Handles: Message dispatch, API call, response parsing
 * 
 * useIncidentWorkflow()
 *   Returns: { incidentData, awaitingIncidentConfirmation, createIncident() }
 *   Handles: Incident creation flow, confirmation, API call
 * 
 * useCatalogSearch()
 *   Returns: { searchCatalog(query, options) }
 *   Handles: Catalog search API, results storage
 * 
 * useKBSearch()
 *   Returns: { searchKB(query, options) }
 *   Handles: Knowledge base search API, results storage
 * 
 * useServiceRequest()
 *   Returns: { createRequest(data) }
 *   Handles: Service request creation, API call
 * 
 * useUserProfile()
 *   Returns: { userProfile, fetchProfile() }
 *   Handles: Profile data fetching and caching
 * 
 * useFeedback()
 *   Returns: { sendFeedback(feedback, sentiment) }
 *   Handles: Feedback submission to backend
 * 
 * useArticleRating()
 *   Returns: { rateArticle(articleId, helpful) }
 *   Handles: KB article rating submission
 */

/**
 * ====================================================
 * API SERVICE (services/api.js)
 * ====================================================
 * 
 * Functions (12 total):
 * - sendChatMessage(message)
 * - getConversationHistory(limit)
 * - getUserProfile()
 * - confirmIncidentCreation(incidentData)
 * - searchCatalog(query, options)
 * - createServiceRequest(requestData)
 * - searchKnowledgeBase(query, options)
 * - getKBArticle(articleId)
 * - rateArticle(articleId, helpful)
 * - sendFeedback(feedback, sentiment)
 * - getStats()
 * - clearSession()
 * 
 * Configuration:
 * - baseURL: http://localhost:5000/api
 * - timeout: 30 seconds
 * - Auto userId injection from helpers.getUserId()
 */

/**
 * ====================================================
 * COMMON COMPONENTS (components/common/CommonComponents.jsx)
 * ====================================================
 * 
 * LoadingSpinner({ size, message })
 *   Shows animated loading indicator with message
 * 
 * ErrorAlert({ error, onDismiss })
 *   Red alert box for error messages with dismiss button
 * 
 * SuccessAlert({ message, onDismiss })
 *   Green alert box for success messages
 * 
 * InfoAlert({ message })
 *   Blue alert box for informational messages
 * 
 * Badge({ label, color, size })
 *   Color-coded badge: gray, blue, green, red, yellow, purple
 *   Sizes: sm, md, lg
 * 
 * Button({ children, variant, size, disabled, loading })
 *   Variants: primary, secondary, danger, success
 *   Sizes: sm, md, lg
 * 
 * Card({ children, className })
 *   White rounded container with border and shadow
 * 
 * Modal({ isOpen, onClose, title, children, size })
 *   Modal dialog with title, content, and close button
 * 
 * Divider({ text })
 *   Horizontal line divider, optionally with centered text
 */

/**
 * ====================================================
 * CHAT COMPONENTS (components/chat/ChatComponents.jsx)
 * ====================================================
 * 
 * ChatMessage({ message })
 *   Displays single message (left for bot, right for user)
 *   Shows timestamp with smart date formatting
 * 
 * TypingIndicator()
 *   Animated three-dot indicator showing AI is thinking
 * 
 * SuggestionChips({ suggestions, onSelect })
 *   Clickable suggestion pills with icons
 *   Predefined suggestions: password reset, VPN access, etc
 * 
 * KBArticleCard({ article, onRate })
 *   Article title, truncated content, rating buttons
 *   Shows helpful/not helpful feedback options
 * 
 * IncidentConfirmation({ incident, onConfirm, onCancel, loading })
 *   Modal-like card for confirming incident creation
 *   Shows incident details before submission
 * 
 * IncidentResult({ incident })
 *   Success card showing created incident number
 *   Displays priority and link to ServiceNow
 * 
 * CatalogItem({ item, onSelect })
 *   Catalog item card with name, description, category, price
 * 
 * ChatInput({ onSend, disabled, loading })
 *   Text input + send button with form submission
 */

/**
 * ====================================================
 * INCIDENT COMPONENTS (components/incident/IncidentComponents.jsx)
 * ====================================================
 * 
 * IncidentCard({ incident, onClick })
 *   Incident number, title, priority badge
 *   Shows application and status
 * 
 * TicketTimeline({ events })
 *   Vertical timeline showing incident events/updates
 * 
 * ImpactIndicator({ impact, count })
 *   Color-coded impact level (INDIVIDUAL to ENTERPRISE)
 *   Shows affected user count
 */

/**
 * ====================================================
 * REQUEST COMPONENTS (components/request/RequestComponents.jsx)
 * ====================================================
 * 
 * RequestCard({ request, onClick })
 *   Request number, title, status badge
 *   Shows category and status
 * 
 * RequestForm({ item, onSubmit, loading })
 *   Dynamic form based on catalog item required fields
 *   Supports text, textarea, select inputs
 */

/**
 * ====================================================
 * UTILITY FUNCTIONS (utils/helpers.js)
 * ====================================================
 * 
 * formatDate(date)                 # "Today", "Yesterday", "Jul 15"
 * formatTime(date)                 # "14:32:05"
 * truncate(text, length)           # "Long text..." (100 char default)
 * extractTicketNumber(text)        # Extracts INC/REQ/CHG numbers
 * isEmpty(value)                   # Check if value is empty
 * debounce(func, delay)            # Returns debounced function
 * getUserId()                      # Gets or generates persistent user ID
 * parseIncidentData(response)      # Extracts incident details from response
 * getResponseColor(type)           # Returns Tailwind classes for response type
 * getResponseIcon(type)            # Returns emoji icon for response type
 */

/**
 * ====================================================
 * CONSTANTS (constants/api.js)
 * ====================================================
 * 
 * ENDPOINTS (6 categories, 12 total)
 * - CHAT_MESSAGE, CHAT_HISTORY, CHAT_PROFILE, CHAT_STATS, CLEAR_SESSION
 * - CREATE_INCIDENT, CONFIRM_INCIDENT, GET_INCIDENTS, GET_INCIDENT
 * - GET_CATALOG, SEARCH_CATALOG, CREATE_REQUEST, GET_REQUESTS
 * - SEARCH_KB, GET_ARTICLE, RATE_ARTICLE, SEND_FEEDBACK
 * 
 * INTENT_TYPES (8 types)
 * - INCIDENT, SERVICE_REQUEST, ACCESS_REQUEST, PASSWORD_RESET
 * - KB_QUERY, OUTAGE, CHANGE_REQUEST, OTHER
 * 
 * RESPONSE_TYPES (8 types)
 * - KB_ARTICLES, SELF_HEAL_OFFERED, SERVICE_REQUEST_OPTIONS
 * - INCIDENT_CONFIRMATION, INCIDENT_CREATED, KNOWN_OUTAGE, ERROR, NO_SOLUTION
 * 
 * PRIORITY_LEVELS (P1-P5)
 * - Each with: value, label, color (hex), icon (emoji)
 * 
 * STATUS_LABELS (8 statuses)
 * - NEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, SUBMITTED, APPROVED, FULFILLED
 * 
 * IMPACT_LEVELS (4 levels)
 * - INDIVIDUAL, DEPARTMENT, DIVISION, ENTERPRISE
 * 
 * SUGGESTION_TOPICS (6 default suggestions)
 * - With icon and predefined phrases
 */

/**
 * ====================================================
 * STYLING
 * ====================================================
 * 
 * Framework: TailwindCSS 3.x
 * Preprocessor: PostCSS
 * 
 * Key Classes Used:
 * - Layout: flex, grid, absolute, fixed, sticky
 * - Colors: bg-*, text-*, border-*, from-*, to-*
 * - Spacing: px-*, py-*, m-*, p-*, gap-*
 * - Sizing: w-*, h-*, max-w-*, min-h-*
 * - Effects: shadow-*, rounded-*, opacity-*, animate-*
 * - Responsive: md:, lg:, mobile-first
 * - Dark mode: dark: prefix (if enabled)
 * 
 * TailwindCSS Configuration:
 * - tailwind.config.js: Extends with custom colors, fonts
 * - postcss.config.js: Processes TailwindCSS, AutoPrefixer
 * 
 * Color Palette:
 * - Primary: Blue (#3b82f6)
 * - Success: Green (#10b981)
 * - Warning: Yellow (#f59e0b)
 * - Error: Red (#ef4444)
 * - Neutral: Gray (50-900)
 */

/**
 * ====================================================
 * DATA FLOW
 * ====================================================
 * 
 * User Message Flow:
 * 1. User types in ChatInput
 * 2. ChatInput calls onSend(message)
 * 3. ChatPage calls sendMessage(message)
 * 4. sendMessage (from useChatMessage hook) dispatches ADD_MESSAGE
 * 5. sendMessage calls api.sendChatMessage(message)
 * 6. API sends request to backend
 * 7. Backend processes and returns response
 * 8. Response dispatches ADD_MESSAGE and SET_RESPONSE
 * 9. ChatPage renders new messages and response component
 * 
 * Incident Creation Flow:
 * 1. Backend sends INCIDENT_CONFIRMATION response
 * 2. ChatPage renders IncidentConfirmation component
 * 3. User clicks "Create Incident" button
 * 4. Button calls createIncident (from useIncidentWorkflow hook)
 * 5. createIncident calls api.confirmIncidentCreation(data)
 * 6. API sends to backend
 * 7. Backend creates incident in ServiceNow
 * 8. Response dispatches CONFIRM_INCIDENT and shows result
 * 9. IncidentResult component displays ticket number
 * 
 * KB Search Flow:
 * 1. Backend sends KB_ARTICLES response
 * 2. ChatPage renders KBArticleCard components
 * 3. User clicks "Was this helpful?" rating
 * 4. Rating calls rateArticle hook
 * 5. rateArticle calls api.rateArticle(articleId, helpful)
 * 6. Rating button disabled and feedback shown
 */

/**
 * ====================================================
 * ERROR HANDLING
 * ====================================================
 * 
 * API Errors:
 * - Caught in API service and re-thrown with descriptive message
 * - Caught in hooks and dispatched as SET_ERROR
 * - Displayed by ErrorAlert component with dismiss button
 * 
 * User Actions:
 * - Invalid input detected before API call
 * - CLEAR_ERROR action resets error on new interactions
 * 
 * Network Timeouts:
 * - 30 second timeout on all API calls
 * - Falls back to cached data if available
 * - Shows user-friendly error message
 */

/**
 * ====================================================
 * RESPONSIVE DESIGN
 * ====================================================
 * 
 * Mobile (< 768px):
 * - Sidebar hidden by default (toggle button in header)
 * - Full-width chat
 * - Stacked layout
 * 
 * Tablet (768px - 1024px):
 * - Sidebar visible
 * - Chat takes remaining space
 * 
 * Desktop (> 1024px):
 * - Full layout with sidebar and main content
 * 
 * Responsive Triggers:
 * - window.innerWidth < 768 sets isMobile state
 * - Resize listener updates on window change
 * - Layout component uses isMobile to show/hide sidebar
 * - Media queries in TailwindCSS for component adjustments
 */

/**
 * ====================================================
 * PERFORMANCE OPTIMIZATION
 * ====================================================
 * 
 * Memoization:
 * - useCallback for all action dispatchers in context
 * - Prevents unnecessary re-renders of child components
 * 
 * API Optimization:
 * - Debounce for search inputs
 * - Limit on message history (default: 50 most recent)
 * 
 * Code Splitting:
 * - Components organized by feature (chat, incident, request)
 * - Can be lazy-loaded with React.lazy() if needed
 * 
 * State Management:
 * - Single context reduces prop drilling
 * - Reducer pattern optimizes re-render scope
 */

/**
 * ====================================================
 * FUTURE ENHANCEMENTS
 * ====================================================
 * 
 * Planned Features:
 * - [ ] IncidentsPage: Full incident list with filtering
 * - [ ] RequestsPage: Service request management UI
 * - [ ] KnowledgePage: KB article browser with categories
 * - [ ] ProfilePage: User profile and preferences
 * - [ ] Real-time notifications with WebSocket
 * - [ ] Dark mode theme toggle
 * - [ ] Multi-language support
 * - [ ] Advanced search with filters
 * - [ ] Chat history export (PDF, CSV)
 * - [ ] Analytics dashboard
 * 
 * Integration Points:
 * - Authenticate with Azure AD/Entra
 * - Push notifications via Azure Notification Hub
 * - File upload for attachments
 * - Video/voice call integration
 * - Bot personality customization
 */

export const FRONTEND_ARCHITECTURE = {
  version: "1.0",
  lastUpdated: new Date().toISOString(),
  components: 24,
  hooks: 8,
  utilities: 10,
  constants: "Centralized",
  stateManagement: "Context API with useReducer",
  styling: "TailwindCSS 3.x",
  bundler: "Vite",
  runtime: "React 18+"
};
