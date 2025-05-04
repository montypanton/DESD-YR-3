import os
import json
import requests
import logging
from typing import Dict, Any, Optional
import traceback
import time

logger = logging.getLogger(__name__)

class MLServiceClient:
    """Client for communicating with the ML service"""
    
    def __init__(self):
        self.base_url = os.environ.get("ML_SERVICE_URL", "http://ml-service:8001")
        self.api_prefix = "/api/v1"
        self.api_key = os.environ.get("ML_SERVICE_API_KEY", "default-dev-key")
        self.timeout = 30  # seconds
        self.max_retries = 3  # Number of retries for requests
        self.retry_delay = 2  # Seconds between retries
    
    def health_check(self) -> Dict[str, Any]:
        """Check if the ML service is available"""
        for attempt in range(self.max_retries):
            try:
                url = f"{self.base_url}{self.api_prefix}/health"
                response = requests.get(url, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except requests.RequestException as e:
                logger.warning(f"ML service health check attempt {attempt+1}/{self.max_retries} failed: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"ML service health check failed after {self.max_retries} attempts: {str(e)}")
                    return {"status": "error", "error": str(e)}
    
    def list_models(self) -> Dict[str, Any]:
        """Get a list of available models"""
        for attempt in range(self.max_retries):
            try:
                url = f"{self.base_url}{self.api_prefix}/models"
                headers = {"X-API-Key": self.api_key}
                response = requests.get(url, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except requests.RequestException as e:
                logger.warning(f"Error listing ML models attempt {attempt+1}/{self.max_retries}: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"Error listing ML models after {self.max_retries} attempts: {str(e)}")
                    return {"error": str(e)}
    
    def predict(self, input_data: Dict[str, Any], model_name: Optional[str] = None) -> Dict[str, Any]:
        """Send data to ML service for prediction"""
        for attempt in range(self.max_retries):
            try:
                url = f"{self.base_url}{self.api_prefix}/predict"
                headers = {
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "input_data": input_data
                }
                
                if model_name:
                    payload["model_name"] = model_name
                
                logger.debug(f"Sending prediction request to ML service: {payload}")
                
                response = requests.post(
                    url, 
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Received prediction from ML service")
                logger.debug(f"ML service response: {result}")
                
                # Extract prediction from response structure
                if 'prediction' in result:
                    return result['prediction']
                return result
                
            except requests.RequestException as e:
                logger.warning(f"Error getting prediction from ML service attempt {attempt+1}/{self.max_retries}: {str(e)}")
                
                # Check if response content is available
                response_content = None
                try:
                    if hasattr(e, 'response') and e.response is not None:
                        response_content = e.response.json()
                        logger.debug(f"Error response content: {response_content}")
                except:
                    pass
                
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"Error getting prediction from ML service after {self.max_retries} attempts: {str(e)}")
                    logger.debug(f"Stack trace: {traceback.format_exc()}")
                    
                    error_detail = {
                        "error": str(e),
                        "response": response_content
                    }
                    
                    raise Exception(f"ML service prediction failed: {str(e)}")
    
    def upload_model(self, model_file_path: str, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Upload a model file to the ML service"""
        for attempt in range(self.max_retries):
            try:
                url = f"{self.base_url}{self.api_prefix}/upload-model"
                headers = {"X-API-Key": self.api_key}
                
                # Prepare file for upload
                files = {"model_file": open(model_file_path, "rb")}
                
                # Add model name if provided
                data = {}
                if model_name:
                    data["model_name"] = model_name
                
                logger.info(f"Uploading model {model_name if model_name else model_file_path} to ML service")
                
                response = requests.post(
                    url,
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=self.timeout
                )
                
                response.raise_for_status()
                return response.json()
                
            except requests.RequestException as e:
                logger.warning(f"Error uploading model to ML service attempt {attempt+1}/{self.max_retries}: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"Error uploading model to ML service after {self.max_retries} attempts: {str(e)}")
                    return {"error": str(e)}
            finally:
                # Close the file regardless of success or failure
                if 'files' in locals() and files and 'model_file' in files:
                    files['model_file'].close()

# Create a global client instance
ml_client = MLServiceClient()