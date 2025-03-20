#!/bin/bash

# Read the setup key from .env file
SETUP_KEY=$(grep SUPER_ADMIN_SETUP_KEY .env | cut -d '=' -f2)

# Make the curl request
curl -X POST http://localhost:3000/api/setup/superadmin \
  -H "Content-Type: application/json" \
  -H "X-Setup-Key: $SETUP_KEY" \
  -d '{}'
