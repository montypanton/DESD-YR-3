#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
python -c "
import time
import sys
import os
import mysql.connector

start_time = time.time()
timeout = 60

while True:
    try:
        mysql.connector.connect(
            host=os.environ.get('DB_HOST', 'db'),
            user=os.environ.get('DB_USER', 'desd_user'),
            password=os.environ.get('DB_PASSWORD', 'desd_pass_123'),
            database=os.environ.get('DB_NAME', 'desd_db')
        )
        break
    except Exception as e:
        if time.time() - start_time > timeout:
            print(f'Could not connect to database after {timeout} seconds. Error: {e}')
            sys.exit(1)
        time.sleep(2)
"
echo "Database is ready!"

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

# Load initial data if needed
echo "Loading initial data if needed..."
if [ ! -f .initial_data_loaded ]; then
    if [ -d fixtures ]; then
        for fixture in fixtures/*.json; do
            if [ -f "$fixture" ]; then
                echo "Loading fixture: $fixture"
                python manage.py loaddata $fixture
            fi
        done
    fi
    touch .initial_data_loaded
    echo "Initial data loaded."
else
    echo "Initial data already loaded."
fi

# Wait for ML service to be ready
echo "Waiting for ML service to be ready..."
python -c "
import time
import sys
import os
import requests

start_time = time.time()
timeout = 60
ml_service_url = os.environ.get('ML_SERVICE_URL', 'http://ml-service:8001')
health_endpoint = f'{ml_service_url}/api/v1/health'

while True:
    try:
        response = requests.get(health_endpoint, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ok':
                print(f'ML service is ready: {data}')
                break
        print(f'ML service not ready yet, status: {response.status_code}')
    except Exception as e:
        print(f'Waiting for ML service: {str(e)}')
    
    if time.time() - start_time > timeout:
        print(f'Warning: Could not connect to ML service after {timeout} seconds.')
        break
    time.sleep(2)
"

# Register ML models
echo "Registering ML models..."
python manage.py register_ml_models

# Start server
echo "Starting server..."
python manage.py runserver 0.0.0.0:8000