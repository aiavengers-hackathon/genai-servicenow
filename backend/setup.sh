#!/bin/bash
# Installation and startup script for GenAI ServiceNow

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     GenAI ServiceNow Enterprise Platform - Setup Script        ║"
echo "║                      Version 2.0.0                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Navigate to backend
echo -e "${BLUE}Step 1: Navigating to backend directory...${NC}"
cd d:\genai-servicenow\backend || { echo "❌ Backend directory not found"; exit 1; }
echo -e "${GREEN}✅ Backend directory found${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}Step 2: Installing dependencies (this may take 2-3 minutes)...${NC}"
if npm install > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    echo "Try: npm cache clean --force && npm install"
    exit 1
fi
echo ""

# Step 3: Create .env file
echo -e "${BLUE}Step 3: Checking for .env configuration...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  .env file created from .env.example${NC}"
        echo -e "${YELLOW}   Please edit .env with your ServiceNow credentials:${NC}"
        echo -e "${YELLOW}   - SN_INSTANCE${NC}"
        echo -e "${YELLOW}   - SN_USER${NC}"
        echo -e "${YELLOW}   - SN_PASS${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Step 4: Create log directories
echo -e "${BLUE}Step 4: Creating log directories...${NC}"
mkdir -p logs
mkdir -p logs/audit
echo -e "${GREEN}✅ Log directories created${NC}"
echo ""

# Step 5: Verify installation
echo -e "${BLUE}Step 5: Verifying installation...${NC}"
if [ -d node_modules ] && [ -f package.json ] && [ -d src ]; then
    echo -e "${GREEN}✅ Installation verified successfully${NC}"
else
    echo -e "${RED}❌ Installation verification failed${NC}"
    exit 1
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo -e "║${GREEN}          ✅ SETUP COMPLETE - READY TO START!${NC}             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Edit .env file with your ServiceNow credentials"
echo "2. Run: ${YELLOW}npm run dev${NC}"
echo "3. Test: ${YELLOW}curl http://localhost:3000/health${NC}"
echo ""

echo -e "${BLUE}Documentation:${NC}"
echo "- Quick Start:     ${YELLOW}QUICKSTART.md${NC}"
echo "- Setup Guide:     ${YELLOW}SETUP.md${NC}"
echo "- Architecture:    ${YELLOW}ARCHITECTURE.md${NC}"
echo "- Production:      ${YELLOW}DEPLOYMENT_CHECKLIST.md${NC}"
echo ""

echo -e "${GREEN}Happy coding! 🚀${NC}"
