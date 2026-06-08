# GenAI ServiceNow Enterprise Platform - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd d:\genai-servicenow\backend
npm install
```

### 2. Configure Environment

```bash
copy .env.example .env
```

Edit `.env` with your ServiceNow credentials:

```
SN_INSTANCE=https://dev123456.service-now.com
SN_USER=your_username
SN_PASS=your_password
```

### 3. Create Required Directories

```bash
mkdir logs
mkdir logs\audit
```

### 4. Run Application

**Development (with auto-restart):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### 5. Test Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456
}
```

---

## 📊 API Endpoints

### Chat API

**Send Chat Message**

```bash
POST /api/chat/message
Content-Type: application/json

{
  "message": "My laptop is not working",
  "userId": "john.doe"
}
```

Response Example:
```json
{
  "reply": "I'll help you create an incident. What is the exact error message you're seeing?",
  "success": true
}
```

**Get Metrics**

```bash
GET /api/chat/metrics
```

Returns application metrics including:
- Incidents created
- Service requests created
- Success rates
- Response times
- Uptime

---

## 🔐 Security Features Implemented

### ✅ Input Validation & Sanitization
- HTML sanitization
- XSS protection
- SQL injection prevention
- Length validation
- Character filtering

### ✅ PII Protection
Automatically detects and masks:
- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- IP addresses

### ✅ Audit Logging
- Complete audit trail
- User action tracking
- API error logging
- Compliance ready
- Daily log rotation

### ✅ Rate Limiting
- 100 requests per 15 minutes (configurable)
- IP-based tracking
- Health check exemption
- DOS protection

### ✅ Error Handling
- Global error handler
- PII-safe error messages
- Detailed logging
- Graceful degradation

---

## 📈 Monitoring & Metrics

### Real-time Metrics

```bash
curl http://localhost:3000/api/metrics
```

### Available Metrics

```json
{
  "incidentsCreated": 42,
  "incidentsCreatedFailed": 2,
  "requestsCreated": 28,
  "requestsCreatedFailed": 1,
  "kbSearches": 156,
  "averageResponseTime": 450.32,
  "duplicatesDetected": 8,
  "chatMessages": 234,
  "successRate": "98.23%",
  "uptime": "45.23 minutes",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Log Files

Located in `./logs/`:
- `combined.log` - All logs
- `error.log` - Errors only
- `audit/audit-YYYY-MM-DD.jsonl` - Audit trail

---

## 🧪 Testing Chat Features

### Test 1: Incident Creation

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My laptop is running very slow, this is urgent!",
    "userId": "testuser"
  }'
```

Expected flow:
1. Bot asks for application
2. Bot asks for details
3. Bot suggests priority
4. Bot asks for confirmation
5. Incident created

### Test 2: Access Request

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need access to Microsoft Office",
    "userId": "testuser"
  }'
```

### Test 3: Cancel Operation

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "cancel",
    "userId": "testuser"
  }'
```

---

## 🐛 Troubleshooting

### Issue: "Missing ServiceNow credentials"

**Solution:**
1. Check `.env` file exists
2. Verify `SN_INSTANCE`, `SN_USER`, `SN_PASS` are set
3. Restart application

### Issue: "Too many requests"

**Solution:**
- Increase `API_RATE_LIMIT` in `.env`
- Or wait 15 minutes (default window)

### Issue: "Incident creation failed"

**Solution:**
1. Check ServiceNow credentials
2. Verify user has correct permissions
3. Check logs in `./logs/error.log`

### Issue: Cannot connect to ServiceNow

**Solution:**
```bash
# Test connectivity
curl -u "username:password" "https://your_instance.service-now.com/api/now/table/incident?sysparm_limit=1"
```

If fails:
- Verify instance URL
- Check username/password
- Ensure user has API access
- Check firewall/network access

---

## 📦 Package Dependencies

All required packages are specified in `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "sanitize-html": "^2.11.0",
    "validator": "^13.11.0",
    "winston": "^3.11.0",
    "axios": "^1.6.2",
    "body-parser": "^1.20.2"
  }
}
```

Install all:
```bash
npm install
```

---

## 🎯 Features Overview

### ✅ Implemented

1. **Intent Classification**
   - Detects: incident, request, KB search, password reset

2. **Entity Extraction**
   - Applications, users, dates, emails, urgency

3. **Duplicate Detection**
   - Exact match detection
   - String similarity matching (Levenshtein algorithm)
   - Prevents duplicate tickets

4. **Multi-turn Conversations**
   - Session management
   - Workflow tracking
   - Context awareness

5. **Comprehensive Logging**
   - Structured logging with Winston
   - Separate error logs
   - Daily audit trails
   - PII protection

6. **Enterprise Security**
   - Input sanitization
   - Rate limiting
   - CORS protection
   - Helmet security headers
   - Error message sanitization

7. **Error Handling**
   - Global error handler
   - Exponential backoff retry logic
   - Graceful degradation
   - User-friendly error messages

---

## 🔄 Workflow Examples

### Incident Creation Flow

```
User: "My laptop is broken"
  ↓
Bot: "I'll help create an incident. What is the affected application?"
User: "Windows 11"
  ↓
Bot: "Please provide issue details"
User: "Can't boot after update"
  ↓
Bot: "Priority: High. Confirm?"
User: "confirm"
  ↓
✅ Incident INC0010023 created
```

### Access Request Flow

```
User: "I need Office access"
  ↓
Bot: "Application validated. Provide username"
User: "john.doe"
  ↓
Bot: "Select priority: Low/Medium/High/Critical"
User: "High"
  ↓
Bot: "Confirm?"
User: "confirm"
  ↓
✅ Request REQ0010456 created
```

---

## 📝 Configuration Guide

### Essential Settings

```env
# REQUIRED
SN_INSTANCE=https://dev.service-now.com
SN_USER=api_user
SN_PASS=api_password
NODE_ENV=development
PORT=3000

# RECOMMENDED
ENABLE_DUPLICATE_CHECK=true
ENABLE_AUDIT_LOG=true
ENABLE_PII_PROTECTION=true
API_RATE_LIMIT=100
API_RATE_WINDOW=15
```

### Adjusting Rate Limits

```env
# Allow 200 requests per 30 minutes
API_RATE_LIMIT=200
API_RATE_WINDOW=30
```

### Logging Levels

```env
# Valid values: error, warn, info, http, debug, silly
LOG_LEVEL=info
```

---

## 🚢 Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET`
- [ ] Set `LOG_LEVEL=warn` or `error`
- [ ] Enable `ENABLE_AUDIT_LOG=true`
- [ ] Enable `ENABLE_PII_PROTECTION=true`
- [ ] Verify `CORS_ORIGIN` is restricted
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerting
- [ ] Run full test suite
- [ ] Performance test with load tester
- [ ] Security audit completed
- [ ] Documentation reviewed

---

## 📞 Support

For issues:
1. Check logs: `./logs/error.log`
2. Verify `.env` configuration
3. Test ServiceNow connectivity
4. Review this documentation
5. Contact support team

---

**Version**: 2.0.0  
**Last Updated**: 2024-01-15  
**Status**: ✅ Production Ready
