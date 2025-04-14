# JWT Security Implementation Guide

This document provides a guide on the JWT authentication implementation for the Research Management System API.

## Overview

The API uses JSON Web Tokens (JWT) for authentication. All private endpoints require a valid JWT token to be accessed. The token must be included in the `Authorization` header with the `Bearer` scheme.

## Implementation Details

The JWT authentication is implemented using:

1. A standalone JWT helper (`src/utils/jwtHelper.js`) that uses the [jose](https://github.com/panva/jose) library for token signing and verification
2. An authentication middleware (`src/middleware/auth.js`) that protects all private endpoints
3. A list of public paths that don't require authentication

## Public Endpoints

The following endpoints do not require authentication:

- `/` - Root health check
- `/health` - Server health
- `/health/db` - Database health
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/reset-password-request` - Password reset request
- `/api/auth/reset-password` - Password reset
- `/api/auth/verify-email` - Email verification
- `/swagger` - API documentation
- `/api-docs` - API documentation

All other endpoints require a valid JWT token in the Authorization header.

## Token Format

JWT tokens include the following claims:

```json
{
  "id": "userId", // User ID
  "email": "user@example.com", // User email
  "role": "admin", // User role
  "timestamp": 1744372456837, // Token creation time
  "iat": 1744372456, // Issued at timestamp
  "exp": 1744977256, // Expiration timestamp (7 days)
  "iss": "research-management-api" // Issuer
}
```

## How to Use JWT Authentication

### Obtaining a Token

To obtain a JWT token, send a POST request to `/api/auth/login` with your credentials:

```bash
curl -X POST http://localhost:30000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

This will return a response with a token:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "_id": "...",
    "email": "test@example.com",
    "role": "admin",
    ...
  },
  "expiresIn": "7d"
}
```

### Using the Token

Include the token in the `Authorization` header of your requests:

```bash
curl -X GET http://localhost:30000/api/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

## Testing the Authentication

We have several test scripts to verify the JWT authentication:

1. **Basic JWT Tests:** Tests the basic JWT functionality without server.

   ```bash
   ./test-jwt-auth.sh simple
   ```

2. **Server Authentication Tests:** Tests JWT authentication with the server running.

   ```bash
   ./test-endpoints.sh
   ```

3. **All Tests:** Runs all JWT tests.
   ```bash
   ./test-jwt-auth.sh all
   ```

## Security Considerations

1. **Secret Key**: The JWT secret key should be kept confidential and never exposed.
2. **Token Expiration**: Tokens expire after 7 days by default.
3. **HTTPS**: Always use HTTPS in production to protect token transmission.
4. **Token Storage**: Clients should store tokens securely, preferably in memory or secure HTTP-only cookies.

## Troubleshooting

If you encounter authentication issues:

1. Verify the token is valid and not expired
2. Ensure the token is included correctly in the Authorization header
3. Check server logs for any JWT verification errors
4. Verify that the endpoint you're accessing is not in the public paths list
