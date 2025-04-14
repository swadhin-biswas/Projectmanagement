#!/bin/bash

# Kill any existing bun processes that might be using the port
echo "Checking for existing server processes..."
pkill -f "bun.*src/index.js" || true

# Start the server with Bun on a different port, binding to all interfaces
echo "Starting Research Management API server..."
PORT=30001 HOST=0.0.0.0 bun --watch src/index.js

# Alternative port options if needed
# PORT=30002 HOST=0.0.0.0 bun --watch src/index.js
# PORT=30003 HOST=0.0.0.0 bun --watch src/index.js
