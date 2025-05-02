# DESD-YR-3 Insurance Claims ML Project

## Quick Start with Docker

The easiest way to get started is to use Docker Compose, which will set up the entire environment for you:

```bash
docker-compose up --build -d
```

This will:
1. Build and start the MySQL database
2. Build and start the Django backend
3. Start the React frontend development server

Once everything is running:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Admin interface: http://localhost:8000/admin/

### Default Admin Credentials
Username: admin@example.com
Password: adminpassword

## Services

The application consists of three main services:

### Database (MySQL)
- Port: 3307 (mapped to 3306 internally)
- Pre-configured with necessary tables and initial data

### Backend (Django)
- Port: 8000
- Automatic migrations
- API endpoints for managing claims and ML predictions

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

## Project Structure

- `/backend` - Django backend application
- `/frontend` - React frontend application

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
