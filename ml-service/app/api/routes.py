from fastapi import APIRouter, Depends, HTTPException, Security, Body, Path, Query, status, UploadFile, File
from fastapi.security.api_key import APIKeyHeader
from typing import List, Dict, Any, Optional

import os
import logging
import traceback
from pathlib import Path
import shutil

from app.api.models import (
    PredictionInput,
    PredictionOutput,
    PredictionResult,
    ModelInfo,
    ModelsResponse,
    ErrorResponse,
    HealthResponse
)
from app.ml.processor import MLProcessor
from app.ml.models import model_manager
from app.config import API_KEY, API_KEY_NAME, MODELS_DIR, DEFAULT_MODEL_PATH, logger

# Security
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )
    return api_key

# Router
router = APIRouter()

# ML Processor instance
ml_processor = MLProcessor()

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint"""
    try:
        models = model_manager.scan_models()
        return {
            "status": "ok",
            "version": "1.0.0",
            "models_available": len(models)
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}",
        )

@router.get("/models", response_model=ModelsResponse, dependencies=[Depends(get_api_key)], tags=["Models"])
async def list_models():
    """List all available ML models"""
    try:
        models = model_manager.scan_models()
        default_model = os.path.basename(DEFAULT_MODEL_PATH).split(".")[0]
        
        return {
            "models": models,
            "default_model": default_model
        }
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing models: {str(e)}",
        )

@router.post("/predict", response_model=PredictionResult, dependencies=[Depends(get_api_key)], tags=["Predictions"])
async def predict(prediction_input: PredictionInput):
    """Generate a prediction using an ML model"""
    try:
        # Get the model (use default if not specified)
        model_name = prediction_input.model_name
        model = model_manager.get_model(model_name)
        
        # If model_name wasn't provided, get the default model name
        if not model_name:
            model_name = os.path.basename(DEFAULT_MODEL_PATH).split(".")[0]
        
        # Load model into processor
        if ml_processor.model is None or model_name != getattr(ml_processor, 'current_model_name', None):
            model_path = model_manager.default_model_path
            if model_name:
                # Find the model path
                for model_info in model_manager.scan_models():
                    if model_info["name"] == model_name:
                        model_path = model_info["path"]
                        break
            
            ml_processor.load_model(model_path)
            ml_processor.current_model_name = model_name
        
        # Make prediction
        result = ml_processor.predict(prediction_input.input_data)
        
        # Format response
        prediction_output = PredictionOutput(
            settlement_amount=result["settlement_amount"],
            confidence_score=result["confidence_score"],
            processing_time=result["processing_time"],
            model_name=model_name,
        )
        
        return PredictionResult(
            prediction=prediction_output,
            input_data=prediction_input.input_data,
        )
        
    except FileNotFoundError as e:
        logger.error(f"Model not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model not found: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        logger.debug(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}",
        )

@router.post("/upload-model", dependencies=[Depends(get_api_key)], tags=["Models"])
async def upload_model(
    model_file: UploadFile = File(...),
    model_name: Optional[str] = Query(None, description="Custom name for the model")
):
    """Upload a new ML model file"""
    try:
        # Determine file name and path
        file_name = model_name
        if not file_name:
            file_name = model_file.filename
        
        # Ensure .pkl extension if not present
        if not file_name.endswith((".pkl", ".joblib")):
            file_name = f"{file_name}.pkl"
        
        file_path = os.path.join(MODELS_DIR, file_name)
        
        # Save the file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(model_file.file, f)
        
        # Try to load the model to validate it
        try:
            model_manager.get_model(file_path)
            
            # Refresh the model list
            models = model_manager.scan_models()
            
            return {
                "message": "Model uploaded successfully",
                "file_name": file_name,
                "file_path": file_path,
                "status": "success"
            }
        except Exception as val_err:
            # If model fails to load, delete the file
            if os.path.exists(file_path):
                os.remove(file_path)
            raise val_err
                
    except Exception as e:
        logger.error(f"Error uploading model: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading model: {str(e)}",
        )