# ML Service for DESD Insurance Claims

## Overview

This service provides a dedicated container for ML model hosting and inference, separate from the main Django backend. It handles loading pre-trained ML models and provides prediction endpoints via a REST API built with FastAPI.

## Features

- **Model Management:** Load, store, and manage multiple ML model versions
- **Prediction API:** Make predictions using specified or default models
- **Model Upload:** Upload new model files through API endpoints
- **Health Monitoring:** Check service health and available models
- **API Security:** Simple API key authentication

## API Endpoints

- `GET /api/v1/health`: Check service health
- `GET /api/v1/models`: List available models
- `POST /api/v1/predict`: Generate predictions using a model
- `POST /api/v1/upload-model`: Upload a new model file

## Technology Stack

- **FastAPI:** Modern Python web framework
- **Pydantic:** Data validation and settings management
- **scikit-learn:** For loading and running ML models
- **Pandas/NumPy:** For data preprocessing
- **Joblib/Pickle:** For model serialization
- **uvicorn:** ASGI server for production deployment

## Communication with Django Backend

The Django backend communicates with this service through HTTP requests using a client class (`MLServiceClient`). The client handles all communication details including:

- Authentication
- Error handling
- Model selection
- Data formatting
- Timeouts

## Container Integration

The ML service is integrated with the main application stack via Docker Compose:
- Shares model files through a volume mount
- Communicates over a dedicated network
- Has health checks to ensure availability
- Scales independently from the main application

## Usage for ML Engineers

ML Engineers can:
1. Upload new model files through the API
2. Select which model to use for predictions
3. Monitor model performance
4. Update models without redeploying the main application

## Local Development

```bash
# Build and start the service
docker-compose up --build ml-service

# View logs
docker-compose logs -f ml-service

# Access API documentation
http://localhost:8001/docs
```