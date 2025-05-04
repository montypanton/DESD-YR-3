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

## ML Service Usage

The ML service provides endpoints for model management and predictions:

### Testing the ML Service
```bash
# Check service health
curl http://localhost:8001/api/v1/health

# List available models
curl -H "X-API-Key: default-dev-key" http://localhost:8001/api/v1/models

# Make a prediction (requires API key)
curl -X POST \
  -H "X-API-Key: default-dev-key" \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"AccidentType": "Rear end", "Driver_Age": 35}}' \
  http://localhost:8001/api/v1/predict
```

See the [ML Service Usage Guide](./ml-service/USAGE.md) for more details.

## Project Structure

- `/backend` - Django backend application
- `/frontend` - React frontend application
- `/ml-service` - FastAPI ML service
- `/models` - ML model files (shared with ML service)

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

Then try restarting the service:
```bash
docker-compose restart ml-service
```

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