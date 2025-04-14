#!/bin/bash

# API Testing Script
# This script runs the API testing suite for private/protected endpoints

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Protected API Endpoints Test Suite   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs/api-tests

# Check if server is running
if ! curl -s http://localhost:30000/api/auth/login -X OPTIONS > /dev/null; then
    echo -e "${YELLOW}WARNING: Server doesn't appear to be running.${NC}"
    echo -e "${YELLOW}The server should be running before executing tests.${NC}"

    read -p "Continue anyway? (y/n): " continue_choice
    if [[ ! $continue_choice =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborting tests.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Running protected API endpoint tests...${NC}"
echo -e "${YELLOW}Testing with credentials: teststudent1@gmail.com / TestUser21@@@${NC}"
echo ""

# Run the tests using bun
bun run ./scripts/api-test.js

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}Tests completed.${NC}"
    echo -e "${BLUE}Logs are available in logs/api-tests/ directory${NC}"
else
    echo -e "${RED}Tests failed with exit code $exit_code${NC}"
    echo -e "${BLUE}Check logs in logs/api-tests/ directory for details${NC}"
fi

exit $exit_code