#!/bin/bash
set -e

# Create models directory if it doesn't exist
mkdir -p /app/models

# Copy models from shared volume if they don't exist
if [ -d "/models" ] && [ -z "$(ls -A /app/models)" ]; then
    echo "Copying models from shared volume..."
    cp -r /models/* /app/models/ || echo "No models found in shared volume"
fi

# Start the application with hot reload in development mode
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Starting ML service in development mode..."
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
else
    echo "Starting ML service in production mode..."
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
fi