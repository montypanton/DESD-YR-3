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

# Ensure proper script permissions with explicit path and multiple checks
COPY backend/ ./backend/
RUN chmod +x /app/backend/start.sh && \
    ls -la /app/backend/start.sh && \
    # Convert possible CRLF line endings to LF
    sed -i 's/\r$//' /app/backend/start.sh

WORKDIR /app/backend

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=backend.settings

EXPOSE 8000

# Use the start.sh script as the entrypoint
CMD ["./start.sh"]