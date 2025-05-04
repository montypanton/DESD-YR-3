from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime

class PredictionInput(BaseModel):
    """Model for prediction input data"""
    model_name: Optional[str] = None
    input_data: Dict[str, Any]
    
    @validator('input_data')
    def validate_input_data(cls, v):
        if not v:
            raise ValueError("Input data cannot be empty")
        return v

class PredictionOutput(BaseModel):
    """Model for prediction output data"""
    settlement_amount: float
    confidence_score: float
    processing_time: float
    model_name: str
    timestamp: datetime = Field(default_factory=datetime.now)
    
class PredictionResult(BaseModel):
    """Model for prediction result (with optional details/original input)"""
    prediction: PredictionOutput
    input_data: Optional[Dict[str, Any]] = None
    details: Optional[Dict[str, Any]] = None

class ModelInfo(BaseModel):
    """Model for ML model information"""
    name: str
    file_name: str
    path: str
    size: int
    last_modified: float
    
class ModelsResponse(BaseModel):
    """Response model for listing available models"""
    models: List[ModelInfo]
    default_model: str
    
class ErrorResponse(BaseModel):
    """Model for error responses"""
    error: str
    details: Optional[Dict[str, Any]] = None
    
class HealthResponse(BaseModel):
    """Model for health check response"""
    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)
    models_available: int