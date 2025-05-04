FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create models directory
RUN mkdir -p /app/models

# Make scripts executable
RUN chmod +x /app/start.sh
RUN chmod +x /app/test_client.py
RUN chmod +x /app/create_test_model.py

# Expose port for FastAPI
EXPOSE 8001

# Command to run uvicorn directly
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]