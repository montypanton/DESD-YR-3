#!/bin/bash
set -e

# Make improved scripts executable and rename them
echo "Setting up improved Docker configuration..."

# Make sure the scripts are executable
chmod +x backend/start.improved.sh
chmod +x ml-service/start.improved.sh
chmod +x frontend/start.improved.sh

# Replace the original scripts with the improved versions
echo "Replacing startup scripts with improved versions..."
cp backend/start.improved.sh backend/start.sh
cp ml-service/start.improved.sh ml-service/start.sh
cp frontend/start.improved.sh frontend/start.sh

# Replace the docker-compose.yml file with the improved version
echo "Replacing docker-compose.yml with improved version..."
cp docker-compose.improved.yml docker-compose.yml

echo "Setup complete. You can now run Docker Compose with:"
echo "docker-compose up -d"
echo "This will start all services with improved configuration."