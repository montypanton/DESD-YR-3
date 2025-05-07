#!/bin/sh
set -e

# Function to wait for a service
wait_for_service() {
  echo "Waiting for $1 to be ready..."
  for i in $(seq 1 30); do
    if curl -s -o /dev/null $2; then
      echo "$1 is ready!"
      return 0
    fi
    echo "Waiting for $1... ($i/30)"
    sleep 2
  done
  echo "Error: $1 is not available after 60 seconds. Continuing anyway..."
  return 1
}

# Install dependencies if node_modules doesn't exist or if package.json has changed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.install-stamp" ] || [ package.json -nt "node_modules/.install-stamp" ]; then
  echo "Installing dependencies..."
  # Use the proper installation script - try the fixed version first
  if [ -f "reinstall-deps_fixed.sh" ]; then
    echo "Using fixed reinstall script..."
    chmod +x reinstall-deps_fixed.sh
    ./reinstall-deps_fixed.sh
  else
    echo "Using standard npm install..."
    npm install
  fi
  touch node_modules/.install-stamp
else
  echo "Dependencies are up to date."
fi

# Wait for backend service to be available
wait_for_service "backend API" "http://backend:8000/api/health/"

# Set environment variables for better development experience
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export FAST_REFRESH=true

# Start the development server
echo "Starting the React development server..."
npm start