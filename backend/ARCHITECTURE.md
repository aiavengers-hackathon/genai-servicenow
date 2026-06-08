# 🎯 Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend/Client                         │
│                    (Chat UI / Web Interface)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Express.js Server                          │
├─────────────────────────────────────────────────────────────────┤
│ Middleware Layer:                                               │
│  ├─ Helmet (Security Headers)                                   │
│  ├─ CORS (Cross-Origin)                                         │
│  ├─ Rate Limiter (100 req/15min)                                │
│  ├─ Request Logger                                              │
│  └─ Body Parser                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Routes:                                                         │
│  └─ POST /api/chat/message                                      │
│     ├─ Input Validation                                         │
│     ├─ PII Detection                                            │
│     ├─ Intent Classification                                    │
│     ├─ Duplicate Check                                          │
│     ├─ Service Creation (Incident/Request)                      │
│     └─ Audit Logging                                            │
├─────────────────────────────────────────────────────────────────┤
│ Utilities:                                                      │
│  ├─ Logger (Winston)                                            │
│  ├─ Validation Service                                          │
│  ├─ PII Protection                                              │
│  ├─ Retry Handler                                               │
│  ├─ Audit Logger                                                │
│  └─ Metrics Collector                                           │
├─────────────────────────────────────────────────────────────────┤
│ Services:                                                       │
│  ├─ Duplicate Detection Service                                 │
│  ├─ Workflow Service                                            │
│  └─ ServiceNow Service                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
┌───────▼──────────┐                    ┌────────▼────────┐
│   ServiceNow     │                    │   File System   │
│   Development    │                    │   (Logs/Audit)  │
│   Instance       │                    │                 │
│                  │                    │  ├─ combined.log│
│ ├─ Incidents     │                    │  ├─ error.log   │
│ ├─ Requests      │                    │  └─ audit/      │
│ ├─ CMDB          │                    │     └─ audit-DD │
│ └─ KB Articles   │                    │        .jsonl   │
└──────────────────┘                    └─────────────────┘
```

---

## Request Flow

```
Client Request
      │
      ▼
Express Server
      │
      ├─► Helmet Security Headers
      ├─► CORS Check
      ├─► Rate Limit Check
      ├─► Body Parser
      └─► Request Logger
             │
             ▼
         Route Handler (/api/chat/message)
             │
             ├─► Input Validation
             │    └─ Check message length
             │    └─ Sanitize input
             │
             ├─► PII Detection
             │    └─ Detect sensitive data
             │    └─ Mask in logs
             │
             ├─► Get Session
             │    └─ Create/retrieve user session
             │
             ├─► Process Message
             │    ├─ Classify Intent
             │    ├─ Extract Entities
             │    └─ Determine Action
             │
             ├─► Check Duplicates
             │    └─ Query ServiceNow
             │    └─ Levenshtein matching
             │
             ├─► Create Service (if needed)
             │    ├─ Incident Creation
             │    │   └─ Retry with backoff
             │    │   └─ Audit Log
             │    │   └─ Record Metrics
             │    │
             │    └─ Request Creation
             │        └─ Validate user
             │        └─ Audit Log
             │        └─ Record Metrics
             │
             └─► Return Response
                  └─ Success/Error Message
                  └─ Next Actions
```

---

## Data Flow - Incident Creation

```
1. User Message
   │
   ├─ "My laptop won't start, URGENT!"
   │
   ▼
2. Validation & Sanitization
   │
   ├─ Length check: ✓
   ├─ XSS protection: ✓
   ├─ PII detection: ✓
   │
   ▼
3. Session Management
   │
   ├─ Get or Create Session
   ├─ Set Workflow: "incident"
   ├─ Track State
   │
   ▼
4. Intent & Entity Extraction
   │
   ├─ Intent: INCIDENT ✓
   ├─ Severity: CRITICAL
   ├─ Application: Laptop
   │
   ▼
5. Duplicate Check
   │
   ├─ Query ServiceNow (last 10 incidents)
   ├─ Levenshtein Similarity: 0.65
   ├─ Result: UNIQUE ✓
   │
   ▼
6. Collect Details
   │
   ├─ Ask for application
   ├─ Ask for issue details
   ├─ Calculate priority
   │
   ▼
7. User Confirmation
   │
   ├─ Show summary
   ├─ Ask: "Type CONFIRM"
   ├─ User: "confirm"
   │
   ▼
8. Create Incident
   │
   ├─ Build payload
   ├─ POST to ServiceNow
   ├─ Retry logic (if needed)
   │
   ▼
9. Logging & Metrics
   │
   ├─ Audit Log Entry
   ├─ Metrics Collection
   ├─ Success Recording
   │
   ▼
10. Response to User
    │
    ├─ Incident Number: INC0010023
    ├─ Priority: Critical
    ├─ Status: New
    ├─ Ticket Link: [URL]
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│           Incoming Request                      │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │  CORS Check     │
        │  (helmet)       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Rate Limiter    │
        │ 100/15min       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Input Validation│
        │ & Sanitization  │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ PII Detection   │
        │ & Masking       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Authentication  │
        │ (Future OAuth)  │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Business Logic  │
        │ Processing      │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Error Handler   │
        │ Safe Messages   │
        └────────┬────────┘
                 │
┌────────────────▼────────────────┐
│     Audit & Logging             │
│ - Structured logging (Winston)  │
│ - PII-protected logs            │
│ - Daily audit trails            │
│ - Compliance ready              │
└─────────────────────────────────┘
```

---

## Data Storage

### Log Files Structure

```
logs/
├── combined.log
│   └─ All application logs
│   └─ Format: [timestamp] [level]: message {metadata}
│
├── error.log
│   └─ Error logs only
│   └─ Rolling file (5MB max, 5 files)
│
└── audit/
    ├── audit-2024-01-15.jsonl
    ├── audit-2024-01-16.jsonl
    └── audit-2024-01-17.jsonl
        └─ One JSON per line format
        └─ Action, userId, timestamp, result
```

### Audit Log Entry Example

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "action": "INCIDENT_CREATED",
  "userId": "john.doe",
  "incidentNumber": "INC0010023",
  "incidentId": "abc123def456",
  "priority": "1",
  "application": "Windows",
  "description": "Laptop won't start after update",
  "status": "SUCCESS"
}
```

---

## Metrics Architecture

```
┌─────────────────────────────────────┐
│    Application Start                │
│    Initialize MetricsCollector      │
└────────────┬────────────────────────┘
             │
             ├─► Record: Incident Created
             ├─► Record: Incident Failed
             ├─► Record: Request Created
             ├─► Record: Request Failed
             ├─► Record: KB Search
             ├─► Record: Duplicate Detected
             ├─► Record: Chat Message
             │
             ▼ (On Demand)
        GET /api/metrics
             │
             ├─► Calculate Success Rate
             ├─► Calculate Avg Response Time
             ├─► Calculate Uptime
             │
             ▼
        Return Metrics JSON
```

---

## Error Handling Flow

```
API Call to ServiceNow
      │
      ▼
┌─────────────────┐
│ Is Error?       │
└────┬────────┬──┘
     │        │
   No│        │Yes
     ▼        ▼
  Return   Is Retry?
  Success   Needed?
            │
       ┌────┴────┐
       │          │
      No         Yes (429,503,504)
       │          │
       ▼          ▼
    Return    Retry with
    Error     Exponential Backoff
               │
               ├─ Attempt 1 (wait 1000ms)
               ├─ Attempt 2 (wait 2000ms)
               ├─ Attempt 3 (wait 4000ms)
               │
               ▼
            Success? ──Yes──> Return Data
               │
              No
               │
               ▼
            Final Error
               │
               ├─► Audit Log Failure
               ├─► Metrics Record Failure
               ├─► Return Error Response
               └─► Safe Error Message
```

---

## Duplicate Detection Algorithm

```
Input: Incident short_description

Step 1: Exact Match
  └─ Query ServiceNow for exact description
  └─ If found: Return EXACT_MATCH

Step 2: Similar Incidents
  └─ Query by cmdb_ci (application)
  └─ For each incident:
     ├─ Calculate Levenshtein Distance
     ├─ Calculate Similarity (0-1)
     └─ If > 0.7: Add to similar list
  └─ If found: Return SIMILAR_INCIDENTS

Step 3: No Duplicates
  └─ Return UNIQUE

Levenshtein Algorithm:
  Distance = min(
    insertions,
    deletions,
    replacements
  )
  Similarity = (len - distance) / len
```

---

## Request Retry Logic

```
Initial Request
      │
      ├─► Attempt 1
      │   └─ Retry: No
      │   └─ Error? → Throw
      │
      ├─► Attempt 2 (if 429, 503, 504)
      │   └─ Wait: 1000ms
      │   └─ Exponential Backoff: 2x
      │   └─ Error? → Continue
      │
      ├─► Attempt 3
      │   └─ Wait: 2000ms
      │   └─ Exponential Backoff: 2x
      │   └─ Error? → Continue
      │
      └─► Attempt 4
          └─ Wait: 4000ms
          └─ Exponential Backoff: 2x
          └─ Max Delay: 10000ms
          └─ Error? → Throw Final Error

Result:
  └─ Success → Return Data
  └─ Failure → Error Response + Audit Log
```

---

## Technology Stack

```
Frontend
├─ Chat UI (Existing)
│
Backend (Node.js + Express)
├─ Express.js (Web Framework)
├─ Winston (Logging)
├─ Helmet (Security)
├─ CORS (Cross-origin)
├─ Express-rate-limit (Rate limiting)
├─ Axios (HTTP Client)
├─ Sanitize-html (XSS Protection)
├─ Validator (Input Validation)
└─ dotenv (Config)

External Services
├─ ServiceNow APIs (Incidents, Requests, KB)
│
Storage
├─ File System (Logs)
├─ ServiceNow (Data)
└─ Memory (Sessions)
```

---

## Environment & Config

```
Development
├─ NODE_ENV=development
├─ LOG_LEVEL=debug
├─ Console output enabled
└─ Detailed error messages

Production
├─ NODE_ENV=production
├─ LOG_LEVEL=warn
├─ Console output disabled
└─ Generic error messages
```

---

## Deployment Checklist

```
✓ Dependencies installed (npm install)
✓ .env configured with credentials
✓ Log directories created
✓ Health check passing
✓ Metrics endpoint working
✓ Incident creation tested
✓ Duplicate detection tested
✓ PII protection verified
✓ Error handling verified
✓ Audit logs being written
```

---

**For detailed implementation, see: SETUP.md and UPGRADE_SUMMARY.md**
