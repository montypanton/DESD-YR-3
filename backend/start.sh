#!/bin/bash
set -e

# Function to wait for a service
wait_for_service() {
    echo "Waiting for $1 to be ready..."
    until $2; do
        echo "Waiting for $1... retrying"
        sleep 2
    done
    echo "$1 is ready!"
}

# Wait for database to be ready
wait_for_service "database" "python -c \"
import mysql.connector
import os
try:
    mysql.connector.connect(
        host=os.environ.get('DB_HOST', 'db'),
        user=os.environ.get('DB_USER', 'desd_user'),
        password=os.environ.get('DB_PASSWORD', 'desd_pass_123'),
        database=os.environ.get('DB_NAME', 'desd_db')
    )
    exit(0)
except Exception as e:
    print(f'Database connection error: {e}')
    exit(1)
\""

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if needed
echo "Checking if superuser needs to be created..."
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@example.com').exists():
    User.objects.create_superuser('admin@example.com', 'adminpassword')
    print('Superuser created.')
else:
    print('Superuser already exists.')
"

# Wait for ML service to be ready
wait_for_service "ML service" "python -c \"
import requests
import os
try:
    ml_service_url = os.environ.get('ML_SERVICE_URL', 'http://ml-service:8001')
    health_endpoint = f'{ml_service_url}/api/v1/health'
    response = requests.get(health_endpoint, timeout=5)
    if response.status_code == 200 and response.json().get('status') == 'ok':
        exit(0)
    else:
        exit(1)
except Exception as e:
    print(f'ML service error: {e}')
    exit(1)
\""

# Register ML models
echo "Registering ML models..."
python manage.py register_ml_models

# Create a simple health check endpoint
# First, check if health endpoint is already defined
if ! grep -q "url(r'^api/health/" backend/urls.py; then
    echo "Adding health check endpoint..."
    python -c "
import os
with open('backend/urls.py', 'r') as f:
    content = f.read()
if 'from django.http import JsonResponse' not in content:
    content = content.replace('from django.urls import path, include', 'from django.urls import path, include\\nfrom django.http import JsonResponse')
if 'def health_check' not in content:
    content = content.replace('urlpatterns = [', 'def health_check(request):\\n    return JsonResponse({\"status\": \"ok\"})\\n\\nurlpatterns = [')
if '\"^api/health/' not in content and '/api/health/' not in content:
    content = content.replace('urlpatterns = [', 'urlpatterns = [\\n    path(\"api/health/\", health_check),')
with open('backend/urls.py', 'w') as f:
    f.write(content)
"
fi

# Start server
echo "Starting server..."
if [ "${ENVIRONMENT:-development}" = "production" ]; then
    echo "Starting Gunicorn production server..."
    gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 4
else
    echo "Starting Django development server..."
    python manage.py runserver 0.0.0.0:8000
fi