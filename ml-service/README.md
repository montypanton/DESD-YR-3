# ML Service for DESD Insurance Claims

## Overview

This service provides a dedicated containerized ML model hosting and inference API, separate from the main Django backend. It enables hot-swapping of models, automated model registration, and parallel scaling of ML capabilities without disrupting the main application.

## Features

- **Dynamic Model Management:** Load, store, and switch between multiple ML models
- **Hot-Swappable Models:** Change active models without restarting services
- **RESTful Prediction API:** Generate predictions using any available model
- **Model Upload:** Add new models via API without service interruption
- **Health Monitoring:** Real-time health checks and model availability
- **API Security:** API key authentication and validation
- **Containerized Deployment:** Isolated service with dedicated resources

## Architecture

The ML service follows a modular architecture with these key components:

1. **API Layer** (`app/api/`): 
   - REST API endpoints for predictions and model management
   - Request validation and authentication
   - Error handling and response formatting

2. **ML Processing Layer** (`app/ml/`):
   - Model loading and caching mechanism
   - Input data preprocessing and feature engineering
   - Prediction generation with confidence scores

3. **Model Management Layer** (`app/ml/models.py`):
   - Scans and catalogs available models
   - Handles model selection and loading
   - Maintains a model registry with metadata

## Hot-Swapping Models

The ML service supports runtime model switching through several mechanisms:

### 1. Default Model Configuration

The default model is configured in environment variables:
```
DEFAULT_MODEL_PATH=/app/models/random_forest_model.pkl
```

This can be overridden at container startup or in the docker-compose.yml file.

### 2. Per-Request Model Selection

Each prediction request can specify which model to use:
```json
{
  "model_name": "xgboost_model",
  "input_data": {...}
}
```

### 3. Admin API for Model Upload

New models can be uploaded at runtime:
```bash
curl -X POST -H "X-API-Key: your-key" \
     -F "model_file=@/path/to/new_model.pkl" \
     -F "model_name=new_model" \
     http://localhost:8001/api/v1/upload-model
```

### 4. Shared Volume for Model Files

Models are stored in a shared Docker volume (`ml_models`) accessible by both:
- The ML service for predictions
- The Django backend for model management

```yaml
volumes:
  - ml_models:/app/models  # In docker-compose.yml
```

## API Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/v1/health` | GET | Service health check | No |
| `/api/v1/models` | GET | List all available models | Yes |
| `/api/v1/predict` | POST | Generate a prediction | Yes |
| `/api/v1/upload-model` | POST | Upload a new model | Yes |

See the [USAGE.md](./USAGE.md) file for detailed endpoint documentation and examples.

## Integration with Django Backend

The Django backend communicates with this service through the `MLServiceClient` class, which provides:

1. **Automatic Model Registration**: 
   - New models are automatically detected and registered in Django
   - The `register_ml_models` management command syncs models at startup

2. **Claim Processing Integration**:
   - When a claim is submitted, it's sent to ML service for processing
   - Prediction results are stored with the claim record
   - Settlement amounts can be automatically calculated or manually adjusted

3. **Fault Tolerance**:
   - Client implements retry mechanisms for temporary service outages
   - Errors are gracefully handled to prevent cascade failures
   - Health checks ensure service availability

## Deployment

### Production Deployment

For production, use the provided Dockerfile which includes:
- Multi-worker uvicorn setup for concurrent processing
- Health checks for container orchestration
- Environment variable configuration
- Volume mounts for persistent model storage

```bash
# Build and deploy with the full stack
docker-compose up -d
```

### Local Development

For local development:

```bash
# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Testing and Utilities

The ML service includes utilities for testing and development:

1. **Test Client** (`test_client.py`):
   - Command-line utility for testing API endpoints
   - Supports all major operations (health checks, predictions, model uploads)

2. **Model Creation** (`create_test_model.py`):
   - Creates simple test models for development
   - Demonstrates proper model formatting and serialization

```bash
# Run the test client
./test_client.py --action predict --model random_forest_model
```

## Monitoring and Maintenance

- View logs: `docker-compose logs -f ml-service`
- Check health: `curl http://localhost:8001/api/v1/health`
- API documentation: `http://localhost:8001/docs`

## Further Documentation

See additional documentation files:
- [USAGE.md](./USAGE.md): Detailed usage examples and API documentation
- [Docker Compose Integration](../docker-compose.yml): Service configuration