# Research Project Management API Documentation

## Overview

This document provides comprehensive documentation for the Research Project Management API. The API allows you to manage research projects, teams, users, and more in an academic environment.

## API Documentation Options

We offer multiple ways to explore and interact with our API:

1. **Interactive Swagger UI Documentation**: Visit [/swagger](/swagger) for a fully interactive API documentation where you can test all endpoints directly in your browser.

2. **User-Friendly Documentation Portal**: Visit [/api-docs](/api-docs) for a beautifully designed documentation portal with examples and guides.

3. **JSON API Description**: If you prefer a machine-readable format, visit [/api-docs/json](/api-docs/json) for a JSON representation of all API endpoints.

## Authentication

Most endpoints require authentication using JSON Web Tokens (JWT). To authenticate:

1. Make a POST request to `/auth/login` with your credentials
2. Use the returned token in the Authorization header for subsequent requests:
   ```
   Authorization: Bearer your_token_here
   ```

## Main API Sections

- **Authentication**: User registration, login, and profile management
- **Teams**: Create and manage research teams
- **Projects**: Create, track, and evaluate research projects
- **Sessions**: Manage academic sessions and deadlines
- **Student Operations**: Submit reports, view results, send messages
- **Supervisor Operations**: Evaluate projects, provide feedback, schedule consultations
- **Admin Operations**: User management, analytics, and system configuration

## Getting Started

The easiest way to get started is to:

1. Create an account via `/auth/register`
2. Log in via `/auth/login` to receive your JWT token
3. Explore the available endpoints using our Swagger UI at `/swagger`

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // The response data
  },
  "timestamp": "2025-04-08T14:30:00.000Z"
}
```

For errors:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-04-08T14:30:00.000Z"
}
```

## Rate Limiting

The API implements rate limiting to protect against abuse. Current limits are 60 requests per minute per IP address. When you exceed this limit, you'll receive a 429 status code.

## Need Help?

If you need further assistance, please contact our support team at support@research-project.example.com.
