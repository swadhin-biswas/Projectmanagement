#!/bin/bash

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Research Project Management System =====${NC}"
echo -e "${YELLOW}===== Super Admin Account Setup =====${NC}"
echo ""

# Check if server is running by pinging the health endpoint
echo -e "Checking if server is running..."
SERVER_URL=${API_URL:-"http://localhost:30000"}

SERVER_RUNNING=false
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Server is running at $SERVER_URL${NC}"
  SERVER_RUNNING=true
else
  echo -e "${RED}❌ Server is not running at $SERVER_URL${NC}"

  # Ask if user wants to start the server
  read -p "Do you want to start the server? (y/n): " START_SERVER

  if [[ $START_SERVER == "y" || $START_SERVER == "Y" ]]; then
    echo -e "Starting server..."
    # Start server in background
    bun src/index.js > /dev/null 2>&1 &
    SERVER_PID=$!

    # Wait a bit for server to start
    sleep 3

    # Check again if server is running
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $SERVER_URL 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
      echo -e "${GREEN}✅ Server started successfully${NC}"
      SERVER_RUNNING=true
    else
      echo -e "${RED}❌ Failed to start server automatically${NC}"
      echo "Please start the server manually and run this script again"
      # Kill the started process if it didn't work
      kill $SERVER_PID 2>/dev/null
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️ You need to start the server before running this setup${NC}"
    exit 1
  fi
fi

# If server is running, run the setup script
if [ "$SERVER_RUNNING" = true ]; then
  echo -e "\nRunning super admin setup script..."
  bun setup-superadmin.js
fi
