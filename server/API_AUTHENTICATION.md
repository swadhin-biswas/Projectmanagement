# API Authentication & Authorization Guide

## Overview

This API uses JWT (JSON Web Tokens) for authentication and role-based authorization. All private endpoints require a valid JWT token to be included in the `Authorization` header with the `Bearer` scheme.

## Authentication

### How It Works

1. **Registration/Login**: Users obtain a JWT token by registering or logging in
2. **Token Usage**: For all protected endpoints, include the token in the Authorization header
3. **Token Verification**: The server validates the token before processing requests
4. **Token Expiration**: Tokens expire after 7 days by default
5. **Token Revocation**: Tokens can be revoked on logout

### Public Endpoints

The following endpoints are accessible without authentication:

- `/` - Root endpoint (health check)
- `/health` - Server health check
- `/health/db` - Database health check
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/reset-password-request` - Password reset request
- `/api/auth/reset-password` - Password reset
- `/api/auth/verify-email` - Email verification
- `/swagger` and `/api-docs` - API documentation

### All Other Endpoints

All other API endpoints require authentication with a valid JWT token.

## Using JWT Authentication

### Headers

To authenticate requests, include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Obtaining a Token

You can obtain a token by calling the login endpoint:

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response will include the token:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "123456",
    "email": "user@example.com",
    "role": "student",
    ...
  },
  "expiresIn": "7d"
}
```

### Logging Out

To invalidate a token, call the logout endpoint:

```
POST /api/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

## Authorization & Role-Based Access

The API implements role-based access control with the following roles:

- `student` - Student users
- `supervisor` - Supervisor users
- `admin` - Admin users
- `superadmin` - Super admin users

### Role-Based Endpoint Access

- `/api/student/*` - Only accessible to users with the `student` role
- `/api/supervisor/*` - Only accessible to users with the `supervisor` role
- `/api/admin/*` - Only accessible to users with the `admin` or `superadmin` role

## Security Features

The API implements several security features for JWT management:

1. **Token Blacklisting**: Revoked tokens are added to a blacklist
2. **Token Validation**: Tokens are validated for required claims and expiration
3. **Proper Error Responses**: 401 Unauthorized with WWW-Authenticate headers
4. **Secure Token Generation**: Tokens include essential security claims (jti, iat, exp, iss, aud)
5. **Role-Based Authorization**: Consistent role checks across all endpoints

## Common Authentication Errors

| Status Code | Error                    | Description                                                          |
| ----------- | ------------------------ | -------------------------------------------------------------------- |
| 401         | Missing token            | The Authorization header is missing or does not start with "Bearer " |
| 401         | Invalid token            | The token signature is invalid or the token is malformed             |
| 401         | Token expired            | The token has expired and a new one must be obtained                 |
| 403         | Insufficient permissions | The user does not have the required role to access the resource      |

## Implementation Details

The authentication system consists of:

1. **JWT Middleware**: Located in `src/middleware/auth.js`, applies to all non-public routes
2. **Authorization Utilities**: Located in `src/utils/authUtils.js`, provides role-based authorization
3. **Route Protection**: Located in `src/utils/routeAuth.js`, provides helpers for protecting routes
4. **JWT Helper**: Located in `src/utils/jwtHelper.js`, handles token signing and verification

## Best Practices for Clients

1. Store the JWT token securely (HttpOnly cookies for web clients)
2. Include the token in every API request to protected endpoints
3. Handle 401 responses by redirecting to login
4. Implement token refresh logic if required
5. Never store tokens in local storage or session storage for production applications
