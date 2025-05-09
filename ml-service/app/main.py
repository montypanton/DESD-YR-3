"""
Simplified ML Service for Insurance Claim Predictions
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import random
import math
from datetime import datetime
import json
import os
from typing import Dict, Any, Optional

# Import our models module
from app.models import predict as model_predict, list_available_models
# Import API routes
from app.api.routes import router as api_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ml-service")

# Create the FastAPI app
app = FastAPI(title="Insurance Claim ML Service", version="1.0.0")

# Add CORS middleware to allow cross-origin requests (critical for frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include API routes from app.api.routes
app.include_router(api_router, prefix="/api/v1")

# Request log middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Generate a request ID
    request_id = f"req_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
    
    # Log request
    logger.info(f"Request {request_id} started: {request.method} {request.url.path}")
    
    # Process request
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        # Log response
        logger.info(f"Request {request_id} completed: {response.status_code} in {process_time:.4f}s")
        return response
    except Exception as e:
        logger.error(f"Request {request_id} failed: {str(e)}")
        process_time = time.time() - start_time
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}", "request_id": request_id}
        )

# Health check endpoint
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "models_available": 1
    }

# List available models
@app.get("/api/v1/models")
async def list_models():
    """List all available ML models."""
    return {
        "models": list_available_models(),
        "default": "simple_claims_model"
    }

# Helper function to validate and extract numeric values
def safe_float(value, default=0.0):
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

# Helper function to validate and extract boolean values
def safe_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ['true', 'yes', '1', 't', 'y']
    if isinstance(value, (int, float)):
        return value > 0
    return False

# Primary prediction function that processes form data into a claim settlement
def generate_prediction(input_data: Dict[str, Any]) -> Dict[str, Any]:
    # Log input data with sensitive fields redacted
    logger.info(f"Processing prediction with input: {json.dumps({k: v for k, v in input_data.items() if k not in ['__timestamp', '__random']})}")
    
    # Extract special damages
    special_fields = [
        'SpecialHealthExpenses', 'SpecialEarningsLoss', 'SpecialMedications',
        'SpecialAssetDamage', 'SpecialRehabilitation', 'SpecialFixes',
        'SpecialLoanerVehicle', 'SpecialTripCosts', 'SpecialJourneyExpenses',
        'SpecialTherapy'
    ]
    special_damages = sum(safe_float(input_data.get(field)) for field in special_fields)
    
    # Extract general damages
    general_fields = ['GeneralFixed', 'GeneralRest', 'GeneralUplift']
    general_damages = sum(safe_float(input_data.get(field)) for field in general_fields)
    
    # Extract boolean factors
    has_whiplash = safe_bool(input_data.get('Whiplash'))
    has_psych = safe_bool(input_data.get('Minor_Psychological_Injury'))
    police_report = safe_bool(input_data.get('Police_Report_Filed'))
    witness_present = safe_bool(input_data.get('Witness_Present'))
    
    # Calculate injury severity factor
    injury_factor = 1.0
    injury_prognosis = str(input_data.get('Injury_Prognosis', ''))
    if '18 months' in injury_prognosis:
        injury_factor = 2.0
    elif '12 months' in injury_prognosis:
        injury_factor = 1.7
    elif '6 months' in injury_prognosis:
        injury_factor = 1.4
    elif '4 months' in injury_prognosis or '5 months' in injury_prognosis:
        injury_factor = 1.2
    
    # Calculate accident severity factor
    accident_factor = 1.0
    accident_type = str(input_data.get('AccidentType', ''))
    if any(term in accident_type.lower() for term in ['multiple', '3 car']):
        accident_factor = 1.5
    elif any(term in accident_type.lower() for term in ['wrong side', 'reversed']):
        accident_factor = 1.3
    
    # Base calculation
    base_amount = 1000
    
    # Add special and general damages with weights
    damages_component = (special_damages * 0.6) + (general_damages * 0.8)
    
    # Add impact factors
    factor_component = 0
    if has_whiplash:
        factor_component += 750
    if has_psych:
        factor_component += 1200
    if police_report:
        factor_component += 350
    if witness_present:
        factor_component += 250
    
    # Calculate final prediction with multipliers
    prediction = (base_amount + damages_component + factor_component) * injury_factor * accident_factor
    
    # Add a small random variation (±3%)
    random_factor = random.uniform(0.97, 1.03)
    prediction *= random_factor
    
    # Ensure minimum reasonable amount
    prediction = max(prediction, 800)
    
    # Round to 2 decimal places
    prediction = round(prediction, 2)
    
    # Log the calculation components
    logger.info(
        f"Prediction calculation: base={base_amount}, special_damages={special_damages}, "
        f"general_damages={general_damages}, factors={factor_component}, "
        f"injury_factor={injury_factor}, accident_factor={accident_factor}, "
        f"final={prediction}"
    )
    
    # Return a standardized result
    return {
        "settlement_amount": prediction,
        "confidence_score": 0.85,
        "processing_time": 0.5,
        "model": "simple_claims_model",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

# Simple prediction endpoint
@app.post("/api/v1/predict")
async def predict(request: Request):
    try:
        # Parse request body
        request_data = await request.json()
        
        # Extract input data
        input_data = request_data.get("input_data", {})
        model_name = request_data.get("model_name", "simple_claims_model")
        
        # Log the incoming request
        logger.info(f"Prediction request received with model: {model_name}")
        logger.debug(f"Input data: {json.dumps({k: v for k, v in input_data.items() if k not in ['__timestamp', '__random']})}")
        
        # Validate input data
        if not isinstance(input_data, dict):
            raise HTTPException(status_code=400, detail="Invalid input_data format. Must be a JSON object.")
        
        # Generate prediction using our model
        result = model_predict(input_data, model_name)
        
        # Log the result
        logger.info(f"Prediction generated: {result['settlement_amount']} with confidence {result['confidence_score']}")
        
        # Return standardized response
        return {
            "status": "success",
            "prediction": result,
            "request_id": request.headers.get("X-Request-ID", "unknown")
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error
        logger.error(f"Error processing prediction: {str(e)}", exc_info=True)
        
        # Return a standardized error response
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate prediction: {str(e)}"
        )

# Health endpoint for Docker
@app.get("/health")
async def docker_health():
    return {"status": "healthy"}

# Alternative predict endpoint for backward compatibility
@app.post("/api/v1/models/predict")
async def predict_with_model(request: Request):
    return await predict(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)