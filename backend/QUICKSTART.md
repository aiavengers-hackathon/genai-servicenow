# 🚀 Quick Start Guide

## 60-Second Setup

### 1. Navigate to Backend
```bash
cd d:\genai-servicenow\backend
```

### 2. Install Dependencies (2 min)
```bash
npm install
```

### 3. Create Config File
```bash
copy .env.example .env
```

### 4. Edit `.env` File
Update these 3 lines:
```env
SN_INSTANCE=https://dev123456.service-now.com
SN_USER=your_username
SN_PASS=your_password
```

### 5. Create Log Directories
```bash
mkdir logs
mkdir logs\audit
```

### 6. Start Server
```bash
npm run dev
```

### 7. Test It
```bash
curl http://localhost:3000/health
```

Expected output:
```json
{"status":"healthy","timestamp":"...","uptime":0.123}
```

---

## 📊 Check Everything Works

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Metrics
```bash
curl http://localhost:3000/api/metrics
```

### Create Incident (Test)
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "My laptop is broken", "userId": "testuser"}'
```

---

## 📁 What Got Updated

**New Files (14):**
- 6 utility services (logger, validation, PII, retry, audit, metrics)
- 1 business service (duplicate detection)
- 3 middleware (error handler, request logger, rate limiter)
- 4 config files (.env.example, SETUP.md, UPGRADE_SUMMARY.md, package.json)

**Modified Files (2):**
- `chat.routes.js` - Added validation, PII protection, audit logging, metrics
- `server.js` - Added middleware and health check

---

## 🔑 Key Features

✅ **Input Validation** - All inputs sanitized  
✅ **PII Protection** - Automatic masking of sensitive data  
✅ **Duplicate Detection** - Smart string similarity matching  
✅ **Audit Logging** - Complete compliance trail  
✅ **Metrics** - Real-time performance tracking  
✅ **Rate Limiting** - 100 req/15min protection  
✅ **Error Handling** - Global error handler  
✅ **Structured Logging** - Winston-based logging  

---

## 📝 Common Commands

### Development
```bash
npm run dev          # Start with auto-reload
npm test             # Run tests
npm run lint         # Code lint check
```

### Production
```bash
npm start            # Start production server
npm audit            # Security audit
```

---

## 🆘 Troubleshooting

### Cannot connect to ServiceNow?
1. Check `.env` file for correct credentials
2. Verify `SN_INSTANCE` URL is correct
3. Test with curl:
```bash
curl -u "user:pass" "https://instance.service-now.com/api/now/table/incident?sysparm_limit=1"
```

### Port 3000 already in use?
```bash
# Change port in .env
PORT=3001
```

### npm install fails?
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

---

## 📞 Support

- Check logs: `./logs/error.log`
- Read: `SETUP.md`
- Read: `UPGRADE_SUMMARY.md`
- Review code comments

---

**You're ready!** Start with `npm install` then `npm run dev` 🎉
