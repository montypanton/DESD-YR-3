#!/bin/bash
set -e

# Create models directory if it doesn't exist
mkdir -p /app/models

# Check if any models already exist in the models directory
if [ -z "$(ls -A /app/models/*.joblib 2>/dev/null)" ] && [ -z "$(ls -A /app/models/*.pkl 2>/dev/null)" ]; then
    echo "No existing models found. Creating test models..."
    # Create a test model if needed
    python /app/create_test_model.py
    
    # Optionally create a responsive model if needed
    if [ "${CREATE_RESPONSIVE_MODEL:-yes}" = "yes" ]; then
        python /app/create_responsive_model.py
    fi
    
    echo "Test models created successfully"
fi

# Register models with the ML service
echo "Registering models with the ML service..."
python -c "
import glob
import os
import sys
import importlib.util

# Add current directory to path so we can import app modules
sys.path.append('/app')

# Import the model registry
spec = importlib.util.spec_from_file_location('registry', '/app/app/ml/models.py')
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)

# Get all model files
model_files = glob.glob('/app/models/*.joblib') + glob.glob('/app/models/*.pkl')
print(f'Found {len(model_files)} model files: {model_files}')

# Register each model
for model_file in model_files:
    model_name = os.path.basename(model_file).split('.')[0]
    try:
        registry.register_model(model_name, model_file)
        print(f'Registered model: {model_name} from {model_file}')
    except Exception as e:
        print(f'Error registering model {model_name}: {str(e)}')
"

# Start the application
if [ "${ENVIRONMENT:-production}" = "development" ]; then
    echo "Starting ML service in development mode with hot reload..."
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
else
    echo "Starting ML service in production mode with multiple workers..."
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers ${WORKERS:-4}
fi