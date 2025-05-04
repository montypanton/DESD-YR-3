# ML Service Usage Guide

This document explains how to use the ML service for insurance claims prediction.

## Getting Started

The ML service runs as a separate container in the Docker Compose stack. It provides a REST API for making predictions and managing ML models.

### Starting the Service

```bash
# Start the entire stack
docker-compose up -d

# Start only the ML service
docker-compose up -d ml-service

# Restart the ML service
docker-compose restart ml-service

# View logs
docker-compose logs -f ml-service
```

## API Endpoints

### Health Check

Check if the ML service is running correctly:

```bash
curl http://localhost:8001/api/v1/health
```

### List Available Models

List all available ML models:

```bash
curl -H "X-API-Key: default-dev-key" http://localhost:8001/api/v1/models
```

### Make a Prediction

Generate a prediction using the default model:

```bash
curl -X POST -H "X-API-Key: default-dev-key" -H "Content-Type: application/json" \
     -d '{"input_data": {"AccidentType": "Rear end", "Driver_Age": 35}}' \
     http://localhost:8001/api/v1/predict
```

Specify a model for prediction:

```bash
curl -X POST -H "X-API-Key: default-dev-key" -H "Content-Type: application/json" \
     -d '{"model_name": "random_forest_model", "input_data": {"AccidentType": "Rear end", "Driver_Age": 35}}' \
     http://localhost:8001/api/v1/predict
```

### Upload a New Model

Upload a new ML model:

```bash
curl -X POST -H "X-API-Key: default-dev-key" \
     -F "model_file=@/path/to/model.pkl" \
     -F "model_name=new_model" \
     http://localhost:8001/api/v1/upload-model
```

## Using the Test Client

A test client is provided for easy interaction with the ML service:

```bash
# Check health
./test_client.py --action health

# List models
./test_client.py --action models

# Make a prediction with the default model
./test_client.py --action predict

# Make a prediction with a specific model
./test_client.py --action predict --model random_forest_model

# Upload a model
./test_client.py --action upload --file /path/to/model.pkl --model model_name
```

## Creating a Test Model

You can create a simple test model using the provided script:

```bash
# Create a dummy random forest model
./create_test_model.py

# Make a prediction with the test model
./test_client.py --action predict --model test_random_forest_model
```

## Integration with Django Backend

The Django backend communicates with the ML service using the `MLServiceClient` class. This client handles authentication, error handling, and request formatting.

Example usage in Django:

```python
from ml_interface.ml_client import ml_client

# Check ML service health
health_status = ml_client.health_check()

# List available models
models = ml_client.list_models()

# Make a prediction
input_data = {...}  # Claim data
result = ml_client.predict(input_data, model_name="random_forest_model")

# Upload a model
result = ml_client.upload_model("/path/to/model.pkl", "new_model")
```

## Troubleshooting

If you encounter issues:

1. Check if the ML service container is running:
   ```bash
   docker-compose ps ml-service
   ```

2. Check the logs for errors:
   ```bash
   docker-compose logs -f ml-service
   ```

3. Verify API connectivity:
   ```bash
   curl http://localhost:8001/api/v1/health
   ```

4. Make sure your models are correctly formatted:
   - Must be compatible with scikit-learn
   - Should be serialized with joblib or pickle
   - Must have a `predict` method
   - Should match the expected feature count (83 features)