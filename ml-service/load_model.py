#!/usr/bin/env python3
"""
Utility script to ensure ML models are loaded correctly in the ml-service.
This script loads the models and ensures they are working properly by making a test prediction.
"""

import os
import sys
import json
import joblib
import pickle
import numpy as np
import pandas as pd
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
DEFAULT_MODEL = 'xgboost_model.pkl'

def load_model(model_path):
    """Load an ML model from a file.
    
    Tries multiple methods to load the model:
    1. joblib.load
    2. pickle.load
    
    Args:
        model_path: Path to the model file
        
    Returns:
        The loaded model
    """
    logger.info(f"Attempting to load model from {model_path}")
    
    # First try joblib
    try:
        model = joblib.load(model_path)
        logger.info(f"Successfully loaded model with joblib")
        return model
    except Exception as e:
        logger.warning(f"Failed to load with joblib: {str(e)}")
    
    # Then try pickle
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
            logger.info(f"Successfully loaded model with pickle")
            return model
    except Exception as e:
        logger.error(f"Failed to load with pickle: {str(e)}")
        
    raise ValueError(f"Could not load model from {model_path}")

def test_prediction(model, model_name):
    """Test model prediction with sample data."""
    logger.info(f"Testing prediction with model: {model_name}")
    
    # Create sample input data similar to what would be provided by the claims form
    sample_data = {
        'AccidentType': 'Rear end',
        'Vehicle Type': 'Car',
        'Weather Conditions': 'Sunny',
        'Injury_Prognosis': 'F. 6 months',
        'Dominant injury': 'Multiple',
        'Gender': 'Male',
        
        'Whiplash': True,
        'Police_Report_Filed': True,
        'Witness_Present': False,
        'Minor_Psychological_Injury': False,
        'Exceptional_Circumstances': False,
        
        'SpecialHealthExpenses': 1500.0,
        'SpecialReduction': 0.0,
        'SpecialOverage': 0.0,
        'GeneralRest': 500.0,
        'SpecialEarningsLoss': 2000.0,
        'SpecialUsageLoss': 700.0,
        'SpecialMedications': 350.0,
        'SpecialAssetDamage': 5000.0,
        'SpecialRehabilitation': 800.0,
        'SpecialFixes': 1200.0,
        'GeneralFixed': 3000.0,
        'GeneralUplift': 1500.0,
        'SpecialLoanerVehicle': 600.0,
        'SpecialTripCosts': 200.0,
        'SpecialJourneyExpenses': 150.0,
        'SpecialTherapy': 900.0,
        
        'Vehicle_Age': 5.0,
        'Driver_Age': 35.0,
        'Number_of_Passengers': 2.0,
        
        'Accident_Date': '2023-05-15',
        'Claim_Date': '2023-05-25'
    }
    
    # Process sample data to match model input format
    # This is a simplified version of preprocessing - actual preprocessing in ml_interface/ml_processor.py
    df = pd.DataFrame([sample_data])
    
    try:
        # Make prediction
        if hasattr(model, 'predict'):
            prediction = model.predict(df)
            logger.info(f"Raw prediction result: {prediction}")
            
            # Get confidence score if available
            confidence = 0.85  # default
            if hasattr(model, 'predict_proba'):
                try:
                    probabilities = model.predict_proba(df)
                    confidence = float(np.max(probabilities))
                    logger.info(f"Confidence score: {confidence}")
                except Exception as e:
                    logger.warning(f"Could not get prediction probability: {str(e)}")
            
            # Format result
            prediction_result = {
                'settlement_amount': float(prediction[0]),
                'confidence_score': confidence,
                'model_name': model_name
            }
            
            logger.info(f"Prediction result: {json.dumps(prediction_result, indent=2)}")
            return prediction_result
        else:
            logger.error("Model does not have predict method")
            return None
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        return None

def main():
    """Main function to load and test models."""
    # Check if models directory exists
    if not os.path.isdir(MODELS_DIR):
        logger.error(f"Models directory not found: {MODELS_DIR}")
        sys.exit(1)
    
    # Find available models
    model_files = [f for f in os.listdir(MODELS_DIR) if f.endswith('.pkl') or f.endswith('.joblib')]
    if not model_files:
        logger.error(f"No model files found in {MODELS_DIR}")
        sys.exit(1)
    
    logger.info(f"Found {len(model_files)} model files: {', '.join(model_files)}")
    
    # Load and test each model
    successful_models = []
    for model_file in model_files:
        model_path = os.path.join(MODELS_DIR, model_file)
        try:
            model = load_model(model_path)
            result = test_prediction(model, model_file)
            if result:
                logger.info(f"✅ Model {model_file} loaded and tested successfully")
                successful_models.append((model_file, result))
            else:
                logger.error(f"❌ Model {model_file} testing failed")
        except Exception as e:
            logger.error(f"❌ Error with model {model_file}: {str(e)}")
    
    # Summary
    if successful_models:
        logger.info("\n===== SUMMARY =====")
        logger.info(f"Successfully loaded and tested {len(successful_models)} models:")
        for name, result in successful_models:
            logger.info(f"  - {name}: ${result['settlement_amount']:.2f} (confidence: {result['confidence_score']:.2f})")
        logger.info("ML models are ready for use!")
    else:
        logger.error("No models were successfully loaded and tested")
        sys.exit(1)

if __name__ == "__main__":
    main()