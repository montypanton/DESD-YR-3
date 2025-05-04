# DESD-YR-3 Insurance Claims ML Project

## Quick Start with Docker

The easiest way to get started is to use Docker Compose, which will set up the entire environment for you:

```bash
docker-compose up --build -d
```

This will:
1. Build and start the MySQL database
2. Build and start the ML service
3. Build and start the Django backend
4. Start the React frontend development server

Once everything is running:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Admin interface: http://localhost:8000/admin/
- ML Service API: http://localhost:8001/api/v1/
- ML Service Docs: http://localhost:8001/docs

### Default Admin Credentials
Username: admin@example.com
Password: adminpassword

## Services

The application consists of four main services:

### Database (MySQL)
- Port: 3307 (mapped to 3306 internally)
- Pre-configured with necessary tables and initial data

### ML Service (FastAPI)
- Port: 8001
- Handles ML model loading and prediction
- Provides API endpoints for predictions and model management
- Isolates ML processing from the main backend
- See [ML Service Documentation](./ml-service/README.md) for details

### Backend (Django)
- Port: 8000
- Automatic migrations
- API endpoints for managing claims and ML predictions
- Communicates with ML service for predictions

### Frontend (React)
- Port: 3000
- Modern UI for interacting with the system

## Development Workflow

### Viewing Logs
To see the logs from all services:
```bash
docker-compose logs -f
```

For a specific service:
```bash
docker-compose logs -f backend
```

### Stopping the Application
```bash
docker-compose down
```

To remove volumes (will delete database data):
```bash
docker-compose down -v
```

### Restarting Services
To restart just one service:
```bash
docker-compose restart backend
```

## ML Service Integration

The ML service is a containerized microservice that provides machine learning capabilities to the insurance claims application. It's designed to be scalable, fault-tolerant, and supports hot-swapping models without downtime.

### Architecture

The ML integration consists of three main components:

1. **ML Service Container**:
   - Runs as a separate service in the Docker Compose stack
   - Contains pre-trained ML models
   - Exposes APIs for prediction and model management
   - Handles all ML-related computation

2. **Django Backend Integration**:
   - `ml_interface` app connects to the ML service
   - `MLServiceClient` handles communication with ML service
   - Automatic model registration and synchronization
   - ML prediction results are stored with claims

3. **Shared Model Storage**:
   - Docker volume `ml_models` shared between services
   - Models can be updated without restarting containers
   - Both services access the same model files

### Model Hot-Swapping

The system supports changing ML models without restarting services:

1. **Upload New Models**:
   ```bash
   # Upload a new model via API
   curl -X POST -H "X-API-Key: default-dev-key" \
        -F "model_file=@/path/to/new_model.pkl" \
        -F "model_name=new_model" \
        http://localhost:8001/api/v1/upload-model
   ```

2. **Change Active Model**:
   - Use Django admin to set a different model as active
   - New claims will automatically use the active model
   - Existing claims can be reprocessed with the new model

3. **Direct Volume Access**:
   - Place model files directly in the `ml-service/models/` directory
   - They'll be automatically detected by the ML service
   - Run `python manage.py register_ml_models` to register in Django

### Testing the ML Service

```bash
# Check service health
curl http://localhost:8001/api/v1/health

# List available models
curl -H "X-API-Key: default-dev-key" http://localhost:8001/api/v1/models

# Make a prediction
curl -X POST \
  -H "X-API-Key: default-dev-key" \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"AccidentType": "Rear end", "Driver_Age": 35, "Vehicle Type": "Car", "GeneralFixed": 1000}}' \
  http://localhost:8001/api/v1/predict
```

### Complete Workflow

1. **Startup**: 
   - ML service starts and scans available models
   - Django backend connects to ML service and registers models
   - Default model is set as active

2. **Claim Submission**:
   - User submits a claim through the frontend
   - Backend processes the claim and forwards to ML service
   - ML service makes prediction using the active model
   - Prediction is stored with the claim
   - User sees the claim status update

3. **Model Updates**:
   - New model is uploaded through API or added to volume
   - Backend registers the new model
   - Admin sets new model as active
   - Subsequent claims use the new model

See the [ML Service Usage Guide](./ml-service/USAGE.md) for detailed API documentation.

## Project Structure

- `/backend` - Django backend application
- `/frontend` - React frontend application
- `/ml-service` - FastAPI ML service
- `/models` - ML model files (shared with ML service)

## Technical Implementation Details

### Django-ML Service Communication

The Django backend communicates with the ML service through a dedicated client class:

```python
# backend/ml_interface/ml_client.py
class MLServiceClient:
    def __init__(self):
        self.base_url = os.environ.get("ML_SERVICE_URL", "http://ml-service:8001")
        self.api_key = os.environ.get("ML_SERVICE_API_KEY", "default-dev-key")
        # ...
    
    def health_check(self):
        # Check ML service availability
        
    def list_models(self):
        # Get available models
        
    def predict(self, input_data, model_name=None):
        # Send data for prediction
```

Environment variables in the Docker Compose configuration connect the services:

```yaml
backend:
  environment:
    - ML_SERVICE_URL=http://ml-service:8001
    - ML_SERVICE_API_KEY=default-dev-key
```

### Model Registration Flow

During startup, the backend registers ML models through these steps:

1. Django backend waits for ML service to be ready (health check)
2. `register_ml_models` management command is run
3. Management command queries ML service for available models
4. Models are registered in Django's database
5. One model is set as active for predictions

This registration process synchronizes the models between services and ensures consistency.

### Claim Processing Pipeline

When a claim is processed:

1. Claim data is formatted into ML-ready features (83 feature fields)
2. Active model is loaded (or cached if already loaded)
3. Prediction is generated with settlement amount and confidence score
4. Result is stored with the claim record
5. Claim status is updated to reflect processing

## Troubleshooting

### If the backend fails to start
The backend depends on the database being ready. If it fails, check:
```bash
docker-compose logs db
docker-compose logs backend
```

Then try restarting just the backend:
```bash
docker-compose restart backend
```

### If the ML service fails to start
The ML service may fail if model files are missing or incorrect:
```bash
docker-compose logs ml-service
```

Common ML service issues:
1. **Missing model files**: Ensure model files exist in the `ml-service/models/` directory
2. **Invalid model format**: Models must be compatible with scikit-learn and have a `predict` method
3. **API key mismatch**: Check that API keys match between services

Then try restarting the service:
```bash
docker-compose restart ml-service
```

### If models aren't being registered
Check the Django backend logs for registration issues:
```bash
docker-compose logs backend | grep -i "model"
```

You can manually trigger registration:
```bash
docker-compose exec backend python manage.py register_ml_models
```

### If predictions aren't working
1. Check ML service is healthy: `curl http://localhost:8001/api/v1/health`
2. Verify active model in Django admin: http://localhost:8000/admin/ml_interface/mlmodel/
3. Check claim data formatting in `ClaimViewSet.prepare_ml_input` method

### If the frontend fails to start
The frontend depends on the backend. Check the logs:
```bash
docker-compose logs frontend
```

Then try restarting just the frontend:
```bash
docker-compose restart frontend
```

### If you need to reset the database
```bash
docker-compose down -v
docker-compose up --build -d
```

### If npm install fails in the frontend
Try running:
```bash
docker-compose down
docker volume rm desd-yr-3_frontend_node_modules
docker-compose up --build -d
```