#!/bin/bash

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Private Endpoints Tests Runner      ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC}"
    echo -e "${YELLOW}Please install Bun from https://bun.sh${NC}"
    exit 1
fi

# Check if server is already running
if lsof -i:30000 &> /dev/null; then
    echo -e "${YELLOW}A server is already running on port 30000.${NC}"
    read -p "Do you want to kill it and start a fresh server? (y/n): " kill_server
    if [[ $kill_server == "y" || $kill_server == "Y" ]]; then
        echo -e "${YELLOW}Killing existing server...${NC}"
        kill $(lsof -t -i:30000) 2>/dev/null || true
        sleep 2
    fi
    EXISTING_SERVER=1
else
    EXISTING_SERVER=0
fi

# Start the server if needed
if [ $EXISTING_SERVER -eq 0 ]; then
    echo -e "${YELLOW}Starting the server...${NC}"
    bun run src/index.js &
    SERVER_PID=$!

    # Wait for server to start
    echo -e "${YELLOW}Waiting for server to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:30000/swagger > /dev/null; then
            echo -e "${GREEN}Server is up and running!${NC}"
            break
        fi

        if [ $i -eq 30 ]; then
            echo -e "${RED}Failed to start server within timeout period.${NC}"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi

        echo -e "${YELLOW}Waiting for server to start... ($i/30)${NC}"
        sleep 1
    done

    # Give a bit more time for all routes to be registered
    sleep 3
    echo -e "${GREEN}Server startup completed.${NC}"
fi

# Setup test user
echo -e "${YELLOW}Setting up test user for authentication...${NC}"
bun run setup-test-user.js
SETUP_STATUS=$?

if [ $SETUP_STATUS -ne 0 ]; then
    echo -e "${RED}Failed to set up test user. Aborting tests.${NC}"
    if [ $EXISTING_SERVER -eq 0 ]; then
        echo -e "${YELLOW}Shutting down the server...${NC}"
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit 1
fi

echo -e "${GREEN}Test user setup completed. Proceeding with tests.${NC}"

# Run endpoint tests with authentication
echo -e "${YELLOW}Running private endpoint tests...${NC}"

# Testing private endpoints directly (add your specific endpoints here)
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Testing specific private endpoints  ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Get a token for testing
TOKEN=$(bun run -q get-token.js)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get authentication token. Aborting tests.${NC}"
    if [ $EXISTING_SERVER -eq 0 ]; then
        echo -e "${YELLOW}Shutting down the server...${NC}"
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit 1
fi

echo -e "${GREEN}Obtained authentication token: ${TOKEN:0:20}...${NC}"

# Test specific private endpoints
ENDPOINTS=(
    "/api/projects"
    "/api/students"
    "/api/supervisors"
    "/api/dashboard/stats"
    # Add more endpoints as needed
)

TEST_STATUS=0

for endpoint in "${ENDPOINTS[@]}"; do
    echo -e "${YELLOW}Testing endpoint: ${endpoint}${NC}"

    # Test without token (should fail with 401)
    echo -e "${BLUE}Without token (expected: 401)${NC}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:30000${endpoint}")

    if [ "$STATUS" -eq 401 ]; then
        echo -e "${GREEN}✓ Correctly returned 401 without token${NC}"
    else
        echo -e "${RED}✗ Expected 401, got ${STATUS} without token${NC}"
        TEST_STATUS=1
    fi

    # Test with token (should succeed)
    echo -e "${BLUE}With valid token${NC}"
    RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "http://localhost:30000${endpoint}")
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${TOKEN}" "http://localhost:30000${endpoint}")

    if [ "$STATUS" -lt 400 ]; then
        echo -e "${GREEN}✓ Successfully accessed with token (${STATUS})${NC}"
    else
        echo -e "${RED}✗ Failed with status ${STATUS} using token${NC}"
        TEST_STATUS=1
    fi

    echo -e "Response: ${YELLOW}${RESPONSE:0:100}...${NC}"
    echo ""
done

# Shutdown the server if we started it
if [ $EXISTING_SERVER -eq 0 ]; then
    echo -e "${YELLOW}Shutting down the server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
fi

# Final message
if [ $TEST_STATUS -eq 0 ]; then
    echo -e "${GREEN}All private endpoint tests passed successfully!${NC}"
else
    echo -e "${RED}Some private endpoint tests failed!${NC}"
fi

exit $TEST_STATUS