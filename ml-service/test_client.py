#!/usr/bin/env python3
"""
Simple test client for the ML service.
This can be used to verify that the service is working correctly.
"""

import argparse
import json
import requests
import os
import sys
from pprint import pprint

# Default values
DEFAULT_URL = "http://localhost:8001"
DEFAULT_API_KEY = "default-dev-key"
API_PREFIX = "/api/v1"

def health_check(base_url):
    """Check if the ML service is available"""
    url = f"{base_url}{API_PREFIX}/health"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}

def list_models(base_url, api_key):
    """Get a list of available models"""
    url = f"{base_url}{API_PREFIX}/models"
    headers = {"X-API-Key": api_key}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def predict(base_url, api_key, input_data, model_name=None):
    """Make a prediction using a model"""
    url = f"{base_url}{API_PREFIX}/predict"
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "input_data": input_data
    }
    
    if model_name:
        payload["model_name"] = model_name
    
    try:
        response = requests.post(
            url, 
            headers=headers,
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        error_message = str(e)
        try:
            if hasattr(e, 'response') and e.response:
                error_message += f"\nResponse: {e.response.text}"
        except:
            pass
        return {"error": error_message}

def upload_model(base_url, api_key, model_file, model_name=None):
    """Upload a model file"""
    url = f"{base_url}{API_PREFIX}/upload-model"
    headers = {"X-API-Key": api_key}
    
    # Prepare file for upload
    files = {"model_file": open(model_file, "rb")}
    
    # Add model name if provided
    data = {}
    if model_name:
        data["model_name"] = model_name
    
    try:
        response = requests.post(
            url,
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def generate_sample_data():
    """Generate a sample claim for testing"""
    return {
        "AccidentType": "Rear end",
        "Accident_Date": "2023-01-15",
        "Claim_Date": "2023-01-20",
        "Driver_Age": 35,
        "Vehicle_Age": 5,
        "Vehicle Type": "Car",
        "Weather Conditions": "Sunny",
        "Dominant injury": "Multiple",
        "Gender": "Male",
        "Injury_Prognosis": "F. 6 months",
        "Number_of_Passengers": 1,
        "Police_Report_Filed": True,
        "Witness_Present": False,
        "Whiplash": True,
        "Minor_Psychological_Injury": False,
        "SpecialHealthExpenses": 2500,
        "SpecialEarningsLoss": 1200,
        "SpecialMedications": 350,
        "GeneralFixed": 1000,
        "GeneralUplift": 500
    }

def main():
    parser = argparse.ArgumentParser(description="Test client for ML service")
    parser.add_argument("--url", default=DEFAULT_URL, help="Base URL of the ML service")
    parser.add_argument("--key", default=DEFAULT_API_KEY, help="API key for authentication")
    parser.add_argument("--action", choices=["health", "models", "predict", "upload"], 
                       default="health", help="Action to perform")
    parser.add_argument("--model", help="Model name for prediction or upload")
    parser.add_argument("--file", help="Model file path for upload")
    parser.add_argument("--input", help="JSON file with input data for prediction")
    args = parser.parse_args()
    
    print(f"Connecting to ML service at {args.url}")
    
    if args.action == "health":
        print("Checking health...")
        result = health_check(args.url)
        pprint(result)
        
    elif args.action == "models":
        print("Listing models...")
        result = list_models(args.url, args.key)
        pprint(result)
        
    elif args.action == "predict":
        print("Making prediction...")
        
        # Get input data
        if args.input:
            try:
                with open(args.input, 'r') as f:
                    input_data = json.load(f)
            except Exception as e:
                print(f"Error loading input file: {e}")
                sys.exit(1)
        else:
            print("Using sample data...")
            input_data = generate_sample_data()
        
        result = predict(args.url, args.key, input_data, args.model)
        pprint(result)
        
    elif args.action == "upload":
        if not args.file:
            print("Error: --file is required for upload action")
            sys.exit(1)
            
        print(f"Uploading model {args.file}...")
        result = upload_model(args.url, args.key, args.file, args.model)
        pprint(result)
    
if __name__ == "__main__":
    main()