FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for mysqlclient and other packages
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    pkg-config \
    gcc \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir mysql-connector-python gunicorn

# Copy project files
COPY backend/ ./backend/

# Make the startup script executable
RUN chmod +x ./backend/start.sh

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=backend.settings

WORKDIR /app/backend

EXPOSE 8000

# Use the start.sh script as the entrypoint
CMD ["./start.sh"]