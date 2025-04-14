#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Base URL for the API
API_URL="http://localhost:30000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!"
STUDENT_EMAIL="student@example.com"
STUDENT_PASSWORD="Student123!"
SUPERVISOR_EMAIL="supervisor@example.com"
SUPERVISOR_PASSWORD="Supervisor123!"

# Function to print test results
print_result() {
    if [ "$1" -eq 0 ]; then
        echo -e "${GREEN}PASS${NC}: $2"
    else
        echo -e "${RED}FAIL${NC}: $2"
    fi
}

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}$1${NC}"
    echo "----------------------------------------"
}

# Create a temp directory for storing tokens and responses
mkdir -p ./test-results

# Test 1: Access without token (public endpoints)
print_section "1. Testing public endpoints (should be accessible without token)"

# Test root endpoint
echo "Testing root endpoint..."
curl -s -o ./test-results/public_root.json "${API_URL}/"
cat ./test-results/public_root.json | grep -q "success"
print_result $? "Root endpoint is accessible without token"

# Test health endpoint
echo "Testing health endpoint..."
curl -s -o ./test-results/public_health.json "${API_URL}/health"
cat ./test-results/public_health.json | grep -q "success"
print_result $? "Health endpoint is accessible without token"

# Test 2: Access protected endpoints without token
print_section "2. Testing protected endpoints without token (should return 401)"

# Try accessing a protected endpoint without a token
echo "Testing admin users endpoint without token..."
curl -s -o ./test-results/protected_no_token.json -w "%{http_code}" "${API_URL}/api/admin/users"
HTTP_CODE=$(tail -n 1 ./test-results/protected_no_token.json)
head -n -1 ./test-results/protected_no_token.json > ./test-results/protected_no_token_response.json
mv ./test-results/protected_no_token_response.json ./test-results/protected_no_token.json

if [ "$HTTP_CODE" -eq 401 ]; then
    print_result 0 "Admin users endpoint returned 401 without token"
else
    print_result 1 "Admin users endpoint returned $HTTP_CODE instead of 401"
fi

# Test 3: Access with invalid token
print_section "3. Testing with invalid token (should return 401)"

# Try with an invalid token
echo "Testing with invalid token..."
INVALID_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

curl -s -o ./test-results/invalid_token.json -w "%{http_code}" -H "Authorization: Bearer $INVALID_TOKEN" "${API_URL}/api/admin/users"
HTTP_CODE=$(tail -n 1 ./test-results/invalid_token.json)
head -n -1 ./test-results/invalid_token.json > ./test-results/invalid_token_response.json
mv ./test-results/invalid_token_response.json ./test-results/invalid_token.json

if [ "$HTTP_CODE" -eq 401 ]; then
    print_result 0 "Request with invalid token returned 401"
else
    print_result 1 "Request with invalid token returned $HTTP_CODE instead of 401"
fi

# Test 4: Login and get valid token
print_section "4. Login and obtain a valid token"

# Get admin token
echo "Logging in as admin..."
curl -s -X POST -o ./test-results/admin_login.json -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "${API_URL}/api/auth/login"
ADMIN_TOKEN=$(cat ./test-results/admin_login.json | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$ADMIN_TOKEN" ]; then
    print_result 0 "Successfully obtained admin token"
    echo $ADMIN_TOKEN > ./test-results/admin_token.txt
else
    print_result 1 "Failed to obtain admin token - check credentials"
fi

# Get student token
echo "Logging in as student..."
curl -s -X POST -o ./test-results/student_login.json -H "Content-Type: application/json" -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASSWORD\"}" "${API_URL}/api/auth/login"
STUDENT_TOKEN=$(cat ./test-results/student_login.json | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$STUDENT_TOKEN" ]; then
    print_result 0 "Successfully obtained student token"
    echo $STUDENT_TOKEN > ./test-results/student_token.txt
else
    print_result 1 "Failed to obtain student token - check credentials"
fi

# Get supervisor token
echo "Logging in as supervisor..."
curl -s -X POST -o ./test-results/supervisor_login.json -H "Content-Type: application/json" -d "{\"email\":\"$SUPERVISOR_EMAIL\",\"password\":\"$SUPERVISOR_PASSWORD\"}" "${API_URL}/api/auth/login"
SUPERVISOR_TOKEN=$(cat ./test-results/supervisor_login.json | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$SUPERVISOR_TOKEN" ]; then
    print_result 0 "Successfully obtained supervisor token"
    echo $SUPERVISOR_TOKEN > ./test-results/supervisor_token.txt
else
    print_result 1 "Failed to obtain supervisor token - check credentials"
fi

# Test 5: Access with valid token
print_section "5. Testing access with valid token (should succeed)"

# Try accessing a protected endpoint with admin token
if [ -n "$ADMIN_TOKEN" ]; then
    echo "Testing admin users endpoint with admin token..."
    curl -s -o ./test-results/admin_with_token.json -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "${API_URL}/api/admin/users"
    HTTP_CODE=$(tail -n 1 ./test-results/admin_with_token.json)
    head -n -1 ./test-results/admin_with_token.json > ./test-results/admin_with_token_response.json
    mv ./test-results/admin_with_token_response.json ./test-results/admin_with_token.json

    if [ "$HTTP_CODE" -eq 200 ]; then
        print_result 0 "Admin users endpoint accessible with admin token (200)"
    else
        print_result 1 "Admin users endpoint returned $HTTP_CODE with admin token"
    fi
else
    print_result 1 "Skipping admin endpoint test - no token available"
fi

# Test 6: Role-based access control
print_section "6. Testing role-based access control"

# Test student access to admin endpoint (should fail with 403)
if [ -n "$STUDENT_TOKEN" ]; then
    echo "Testing admin endpoint with student token (should be forbidden)..."
    curl -s -o ./test-results/student_admin_access.json -w "%{http_code}" -H "Authorization: Bearer $STUDENT_TOKEN" "${API_URL}/api/admin/users"
    HTTP_CODE=$(tail -n 1 ./test-results/student_admin_access.json)
    head -n -1 ./test-results/student_admin_access.json > ./test-results/student_admin_access_response.json
    mv ./test-results/student_admin_access_response.json ./test-results/student_admin_access.json

    if [ "$HTTP_CODE" -eq 403 ]; then
        print_result 0 "Student correctly denied access to admin endpoint (403)"
    else
        print_result 1 "Student access to admin endpoint returned $HTTP_CODE instead of 403"
    fi
else
    print_result 1 "Skipping student role test - no token available"
fi

# Test admin access to student endpoint (should fail with 403)
if [ -n "$ADMIN_TOKEN" ] && [ -n "$STUDENT_TOKEN" ]; then
    echo "Testing student endpoint with admin token (should be forbidden)..."
    # First find a valid student endpoint from the docs
    curl -s -o ./test-results/admin_student_access.json -w "%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "${API_URL}/api/student/team"
    HTTP_CODE=$(tail -n 1 ./test-results/admin_student_access.json)
    head -n -1 ./test-results/admin_student_access.json > ./test-results/admin_student_access_response.json
    mv ./test-results/admin_student_access_response.json ./test-results/admin_student_access.json

    if [ "$HTTP_CODE" -eq 403 ]; then
        print_result 0 "Admin correctly denied access to student endpoint (403)"
    else
        print_result 1 "Admin access to student endpoint returned $HTTP_CODE instead of 403"
    fi
else
    print_result 1 "Skipping admin-to-student role test - tokens not available"
fi

# Test 7: Logout/token revocation
print_section "7. Testing token revocation (logout)"

# Test logout endpoint
if [ -n "$STUDENT_TOKEN" ]; then
    echo "Testing logout endpoint..."
    curl -s -X POST -o ./test-results/logout.json -H "Authorization: Bearer $STUDENT_TOKEN" "${API_URL}/api/auth/logout"
    cat ./test-results/logout.json | grep -q "success"
    print_result $? "Logout endpoint returned success response"

    # Try using the revoked token
    echo "Testing access with revoked token (should be denied)..."
    curl -s -o ./test-results/revoked_token.json -w "%{http_code}" -H "Authorization: Bearer $STUDENT_TOKEN" "${API_URL}/api/student/team"
    HTTP_CODE=$(tail -n 1 ./test-results/revoked_token.json)
    head -n -1 ./test-results/revoked_token.json > ./test-results/revoked_token_response.json
    mv ./test-results/revoked_token_response.json ./test-results/revoked_token.json

    if [ "$HTTP_CODE" -eq 401 ]; then
        print_result 0 "Request with revoked token correctly returned 401"
    else
        print_result 1 "Request with revoked token returned $HTTP_CODE instead of 401"
    fi
else
    print_result 1 "Skipping logout test - no token available"
fi

print_section "Authorization Tests Complete"
echo "Detailed responses saved to ./test-results/ directory"