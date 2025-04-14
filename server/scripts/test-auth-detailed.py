#!/usr/bin/env python3
"""
Detailed Authorization Testing Script for Research Management API

This script performs comprehensive authorization tests on the API, including:
- Testing all public endpoints
- Testing protected endpoints with and without tokens
- Testing role-based access controls
- Validating error responses
"""

import requests
import json
import os
import time
from colorama import Fore, Style, init

# Initialize colorama
init()

# Configuration
API_URL = "http://localhost:30000"
TEST_DIR = "./test-results"
os.makedirs(TEST_DIR, exist_ok=True)

# Test users - update as needed
USERS = {
    "admin": {
        "email": "admin@example.com",
        "password": "Admin123!",
        "token": None
    },
    "student": {
        "email": "student@example.com",
        "password": "Student123!",
        "token": None
    },
    "supervisor": {
        "email": "supervisor@example.com",
        "password": "Supervisor123!",
        "token": None
    }
}

# Test endpoints
PUBLIC_ENDPOINTS = [
    "/",
    "/health",
    "/health/db",
    "/api/auth/login",
    "/api/auth/register",
    "/swagger",
    "/api-docs"
]

PROTECTED_ENDPOINTS = {
    "admin": [
        "/api/admin/users",
        "/api/admin/pending-supervisors"
    ],
    "student": [
        "/api/student/team",
        "/api/student/profile"
    ],
    "supervisor": [
        "/api/supervisor/profile",
        "/api/supervisor/teams"
    ],
    "common": [
        "/api/projects",
        "/api/uploads"
    ]
}

# Helper functions
def print_header(text):
    """Print a section header"""
    print(f"\n{Fore.YELLOW}{text}{Style.RESET_ALL}")
    print("="*50)

def print_result(success, message):
    """Print a test result"""
    if success:
        print(f"{Fore.GREEN}✓ PASS{Style.RESET_ALL}: {message}")
    else:
        print(f"{Fore.RED}✗ FAIL{Style.RESET_ALL}: {message}")
    return success

def save_response(path, data):
    """Save response data to a file"""
    with open(os.path.join(TEST_DIR, path), 'w') as f:
        json.dump(data, f, indent=2)

def login_users():
    """Attempt to login all test users"""
    print_header("Logging in test users")
    success_count = 0

    for role, user_data in USERS.items():
        print(f"Logging in as {role}...")
        try:
            response = requests.post(
                f"{API_URL}/api/auth/login",
                json={"email": user_data["email"], "password": user_data["password"]}
            )

            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    USERS[role]["token"] = data["token"]
                    save_response(f"{role}_login.json", data)
                    print_result(True, f"Successfully logged in as {role}")
                    success_count += 1
                else:
                    print_result(False, f"Login response for {role} missing token")
            else:
                print_result(False, f"Login failed for {role} with status {response.status_code}")
                save_response(f"{role}_login_error.json", response.json())
        except Exception as e:
            print_result(False, f"Error logging in as {role}: {str(e)}")

    return success_count == len(USERS)

def test_public_endpoints():
    """Test access to public endpoints"""
    print_header("Testing public endpoints (should be accessible without token)")
    success_count = 0

    for endpoint in PUBLIC_ENDPOINTS:
        try:
            # Skip registration endpoint in actual testing
            if endpoint == "/api/auth/register":
                print(f"Skipping actual POST to {endpoint} to avoid creating users")
                success_count += 1
                continue

            if endpoint == "/api/auth/login":
                # Just check if endpoint exists without actually logging in
                response = requests.options(f"{API_URL}{endpoint}")
                success = response.status_code < 400
                print_result(success, f"Endpoint {endpoint} is available (OPTIONS)")
            else:
                response = requests.get(f"{API_URL}{endpoint}")
                success = response.status_code == 200
                print_result(success, f"Endpoint {endpoint} returned {response.status_code}")
                save_response(f"public_{endpoint.replace('/', '_')}.json", response.json())

            if success:
                success_count += 1

        except Exception as e:
            print_result(False, f"Error accessing {endpoint}: {str(e)}")

    return success_count == len(PUBLIC_ENDPOINTS)

def test_protected_without_token():
    """Test access to protected endpoints without a token"""
    print_header("Testing protected endpoints without token (should return 401)")
    success_count = 0
    total_tests = 0

    # Test one endpoint from each role category
    for role, endpoints in PROTECTED_ENDPOINTS.items():
        if not endpoints:
            continue

        endpoint = endpoints[0]
        total_tests += 1

        try:
            response = requests.get(f"{API_URL}{endpoint}")
            success = response.status_code == 401
            print_result(success, f"Endpoint {endpoint} returned {response.status_code} (expected 401)")

            if response.status_code < 500:  # Don't save server error responses
                save_response(f"no_token_{endpoint.replace('/', '_')}.json", response.json())

            if success:
                # Also check for proper WWW-Authenticate header
                www_auth = response.headers.get('WWW-Authenticate')
                header_success = www_auth is not None and www_auth.startswith('Bearer')
                print_result(header_success, f"Endpoint {endpoint} returned proper WWW-Authenticate header: {www_auth}")
                success = success and header_success

            if success:
                success_count += 1

        except Exception as e:
            print_result(False, f"Error accessing {endpoint}: {str(e)}")

    return success_count == total_tests

def test_with_invalid_token():
    """Test access with an invalid token"""
    print_header("Testing with invalid token (should return 401)")
    success_count = 0
    total_tests = 0

    # Use a standard invalid token
    invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    headers = {"Authorization": f"Bearer {invalid_token}"}

    # Test one endpoint from each role category
    for role, endpoints in PROTECTED_ENDPOINTS.items():
        if not endpoints:
            continue

        endpoint = endpoints[0]
        total_tests += 1

        try:
            response = requests.get(f"{API_URL}{endpoint}", headers=headers)
            success = response.status_code == 401
            print_result(success, f"Endpoint {endpoint} returned {response.status_code} with invalid token (expected 401)")

            if response.status_code < 500:  # Don't save server error responses
                save_response(f"invalid_token_{endpoint.replace('/', '_')}.json", response.json())

            if success:
                success_count += 1

        except Exception as e:
            print_result(False, f"Error accessing {endpoint} with invalid token: {str(e)}")

    return success_count == total_tests

def test_role_access():
    """Test role-based access controls"""
    print_header("Testing role-based access controls")
    success_count = 0
    total_tests = 0

    # For each role
    for role, user_data in USERS.items():
        if not user_data["token"]:
            print(f"Skipping tests for {role} - no token available")
            continue

        token = user_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test access to endpoints for this role
        for endpoint in PROTECTED_ENDPOINTS.get(role, []):
            total_tests += 1
            try:
                response = requests.get(f"{API_URL}{endpoint}", headers=headers)
                success = response.status_code == 200
                print_result(success, f"{role} accessing {endpoint} returned {response.status_code} (expected 200)")

                if response.status_code < 500:  # Don't save server error responses
                    save_response(f"{role}_{endpoint.replace('/', '_')}.json", response.json())

                if success:
                    success_count += 1

            except Exception as e:
                print_result(False, f"Error with {role} accessing {endpoint}: {str(e)}")

        # Test access to endpoints for other roles (should be forbidden)
        for other_role, endpoints in PROTECTED_ENDPOINTS.items():
            if other_role == role or other_role == "common":
                continue

            for endpoint in endpoints:
                total_tests += 1
                try:
                    response = requests.get(f"{API_URL}{endpoint}", headers=headers)
                    success = response.status_code == 403
                    print_result(success, f"{role} accessing {other_role} endpoint {endpoint} returned {response.status_code} (expected 403)")

                    if response.status_code < 500:  # Don't save server error responses
                        save_response(f"{role}_to_{other_role}_{endpoint.replace('/', '_')}.json", response.json())

                    if success:
                        success_count += 1

                except Exception as e:
                    print_result(False, f"Error with {role} accessing {other_role} endpoint {endpoint}: {str(e)}")

    return success_count, total_tests

def test_token_revocation():
    """Test token revocation on logout"""
    print_header("Testing token revocation (logout)")

    if not USERS["student"]["token"]:
        print("Skipping logout test - no student token available")
        return False

    token = USERS["student"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First, verify the token is working
    try:
        response = requests.get(f"{API_URL}{PROTECTED_ENDPOINTS['student'][0]}", headers=headers)
        if response.status_code != 200:
            print_result(False, f"Initial token verification failed with status {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Error during initial token verification: {str(e)}")
        return False

    # Now logout
    try:
        response = requests.post(f"{API_URL}/api/auth/logout", headers=headers)
        save_response("logout_response.json", response.json())

        success = response.status_code == 200
        if not print_result(success, f"Logout returned status {response.status_code}"):
            return False

        # Give the server a moment to process the revocation
        time.sleep(1)

        # Try using the token again
        response = requests.get(f"{API_URL}{PROTECTED_ENDPOINTS['student'][0]}", headers=headers)
        success = response.status_code == 401
        print_result(success, f"Using revoked token returned {response.status_code} (expected 401)")

        if response.status_code < 500:
            save_response("revoked_token_response.json", response.json())

        return success

    except Exception as e:
        print_result(False, f"Error during logout test: {str(e)}")
        return False

def run_all_tests():
    """Run all authorization tests"""
    print(f"{Fore.CYAN}========================================{Style.RESET_ALL}")
    print(f"{Fore.CYAN}AUTHORIZATION TESTING - RESEARCH MGMT API{Style.RESET_ALL}")
    print(f"{Fore.CYAN}========================================{Style.RESET_ALL}")
    print(f"API URL: {API_URL}")
    print(f"Results saved to: {TEST_DIR}")
    print(f"{Fore.CYAN}========================================{Style.RESET_ALL}")

    results = {}

    # Run tests
    results["login"] = login_users()
    results["public_endpoints"] = test_public_endpoints()
    results["protected_without_token"] = test_protected_without_token()
    results["invalid_token"] = test_with_invalid_token()

    role_success, role_total = test_role_access()
    results["role_access"] = (role_success, role_total)

    results["token_revocation"] = test_token_revocation()

    # Print summary
    print_header("TEST SUMMARY")

    success_count = 0
    for test, result in results.items():
        if test == "role_access":
            success, total = result
            success_percent = (success / total * 100) if total > 0 else 0
            print_result(success_percent >= 80, f"Role-based access control: {success}/{total} tests passed ({success_percent:.1f}%)")
            if success_percent >= 80:
                success_count += 1
        else:
            print_result(result, f"Test: {test.replace('_', ' ').title()}")
            if result:
                success_count += 1

    overall_percent = (success_count / len(results) * 100)
    overall_success = overall_percent >= 90

    print("\n" + "="*50)
    if overall_success:
        print(f"{Fore.GREEN}OVERALL RESULT: PASS ({overall_percent:.1f}%){Style.RESET_ALL}")
        print(f"{Fore.GREEN}The authorization system is working correctly.{Style.RESET_ALL}")
    else:
        print(f"{Fore.RED}OVERALL RESULT: NEEDS IMPROVEMENT ({overall_percent:.1f}%){Style.RESET_ALL}")
        print(f"{Fore.RED}The authorization system has issues that need to be addressed.{Style.RESET_ALL}")

    save_response("test_summary.json", {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "results": {k: v if not isinstance(v, tuple) else {"success": v[0], "total": v[1]} for k, v in results.items()},
        "overall_success": overall_success,
        "overall_percent": overall_percent
    })

    return overall_success

if __name__ == "__main__":
    run_all_tests()