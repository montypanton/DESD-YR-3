#!/bin/sh
# Create public directory if it doesn't exist
mkdir -p public

# Install dependencies with specific flags to avoid version issues
npm install --no-package-lock --force

# Start the application
npm start
