FROM python:3.11-slim

WORKDIR /app

# Install dependencies and clean up in a single layer
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && rm -rf /root/.cache/pip

# Create models directory
RUN mkdir -p /app/models

# Copy application code
COPY . .

# Make scripts executable (combined into a single layer)
RUN chmod +x /app/start.sh /app/test_client.py /app/create_test_model.py

# Expose port for FastAPI
EXPOSE 8001

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8001/api/v1/health || exit 1

# Command to run uvicorn directly
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]