#!/bin/sh
set -e

# Install dependencies if node_modules doesn't exist or if package.json has changed
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
  echo "Installing dependencies..."
  npm install
  touch node_modules
else
  echo "Dependencies are up to date."
fi

# Set environment variables for better development experience
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true

# Start the development server
echo "Starting the React development server..."
npm start
