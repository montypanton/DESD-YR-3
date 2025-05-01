import os
import joblib
import pandas as pd
import numpy as np
import logging
import time
from typing import Dict, Any
import traceback

logger = logging.getLogger(__name__)

class MLProcessor:
    def __init__(self):
        self.model = None
        self.model_path = None
        
        # Define the categorical fields that need one-hot encoding
        self.categorical_fields = [
            'Gender', 'AccidentType', 'VehicleType',
            'WeatherConditions', 'DominantInjury', 'Injury_Prognosis'
        ]
        
        # Map the actual values to training data values
        self.field_mappings = {
            'AccidentType': {
                'RearEnd': 'Rear end',
                'SingleVehicle': 'Other',
                'Rear end - 3 car - Clt at front': 'Rear end - 3 car - Clt at front',
                'Other side pulled out of side road': 'Other side pulled out of side road'
            },
            'DominantInjury': {
                'Sprain': 'Arms',
                'Fracture': 'Arms',
                'Concussion': 'Arms',
                'Laceration': 'Arms',
                'Whiplash': 'Multiple'
            },
            'WeatherConditions': {
                'Snow': 'Snowy',
                'Rain': 'Rainy',
                'Sun': 'Sunny'
            },
            'VehicleType': {
                'Car': 'Car',
                'Truck': 'Truck',
                'Motorcycle': 'Motorcycle',
                'Luxury': 'Car'
            }
        }

    def load_model(self, model_path: str) -> None:
        """Load the ML model"""
        try:
            logger.info(f"Attempting to load model from {model_path}")
            if not os.path.exists(model_path):
                logger.error(f"Model file not found at {model_path}")
                raise ValueError(f"Model file not found at {model_path}")

            self.model_path = model_path
            start_time = time.time()

            try:
                self.model = joblib.load(model_path)
                if not hasattr(self.model, 'predict'):
                    raise ValueError("Loaded model does not have predict method")
                
                load_time = time.time() - start_time
                logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
                
            except Exception as e:
                error_msg = f"Failed to load model: {str(e)}"
                logger.error(error_msg)
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise ValueError(error_msg)

        except Exception as e:
            logger.error(f"Error loading model from {model_path}: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            raise ValueError(f"Failed to load model: {str(e)}")

    def preprocess_data(self, input_data: Dict[str, Any]) -> pd.DataFrame:
        """Preprocess the input data for prediction"""
        try:
            logger.info("Starting data preprocessing")
            claim_data = input_data.get('claim_data', {})
            
            # Create a dictionary for processed values
            processed_data = {
                'DriverAge': float(claim_data.get('DriverAge', 0)),
                'NumberOfPassengers': float(claim_data.get('NumberOfPassengers', 0)),
                'VehicleAge': float(claim_data.get('VehicleAge', 0)),
                'SpecialHealthExpenses': float(claim_data.get('SpecialHealthExpenses', 0)),
                'SpecialMedications': float(claim_data.get('SpecialMedications', 0)),
                'SpecialRehabilitation': float(claim_data.get('SpecialRehabilitation', 0)),
                'SpecialTherapy': float(claim_data.get('SpecialTherapy', 0)),
                'SpecialEarningsLoss': float(claim_data.get('SpecialEarningsLoss', 0)),
                'SpecialUsageLoss': float(claim_data.get('SpecialUsageLoss', 0)),
                'SpecialAssetDamage': float(claim_data.get('SpecialAssetDamage', 0)),
                'SpecialLoanerVehicle': float(claim_data.get('SpecialLoanerVehicle', 0)),
                'SpecialTripCosts': float(claim_data.get('SpecialTripCosts', 0)),
                'SpecialJourneyExpenses': float(claim_data.get('SpecialJourneyExpenses', 0)),
                'SpecialFixes': float(claim_data.get('SpecialFixes', 0)),
                'SpecialReduction': float(claim_data.get('SpecialReduction', 0)),
                'SpecialOverage': float(claim_data.get('SpecialOverage', 0)),
                'GeneralRest': float(claim_data.get('GeneralRest', 0)),
                'GeneralFixed': float(claim_data.get('GeneralFixed', 0)),
                'GeneralUplift': float(claim_data.get('GeneralUplift', 0)),
                'Whiplash': 1 if str(claim_data.get('Whiplash')).lower() in ['true', 'yes', '1'] else 0,
                'Minor_Psychological_Injury': 1 if str(claim_data.get('MinorPsychologicalInjury')).lower() in ['true', 'yes', '1'] else 0,
                'PoliceReportFiled': 1 if str(claim_data.get('PoliceReportFiled')).lower() in ['true', 'yes', '1'] else 0,
                'WitnessPresent': 1 if str(claim_data.get('WitnessPresent')).lower() in ['true', 'yes', '1'] else 0,
            }

            # Create one-hot encoded features for all possible categorical values
            def create_onehot_features(field, value, possible_values):
                """Helper to create one-hot encoded features for a field"""
                value = str(value).strip().lower() if value else ''
                for possible_value in possible_values:
                    column_name = f"{field}_{possible_value.replace(' ', '_').replace('-', '_').replace('.', '')}"
                    processed_data[column_name] = 1 if value == possible_value.lower() else 0

            # Gender
            gender = claim_data.get('Gender', 'Unknown')
            create_onehot_features('Gender', gender, ['Male', 'Female', 'Other'])

            # Accident Type
            accident_type = claim_data.get('AccidentType', 'Unknown')
            create_onehot_features('AccidentType', accident_type, [
                'Rear end', 'Other side pulled out of side road', 'Other',
                'Rear end - 3 car - Clt at front', 'Other side changed lanes and collided with clt\'s vehicle',
                'Other side reversed into Clt\'s vehicle', 'Other side turned across Clt\'s path',
                'Rear end - Clt pushed into next vehicle', 'Other side pulled on to roundabout',
                'Other side drove on wrong side of the road',
                'Other side changed lanes on a roundabout colliding with clt\'s vehicle',
                'Other side reversed into clt\'s stationary vehicle',
                'Other side collided with Clt\'s parked vehicle'
            ])

            # Injury Prognosis
            injury_prognosis = claim_data.get('InjuryPrognosis', 'Unknown')
            create_onehot_features('Injury_Prognosis', injury_prognosis, [
                'A. 1 month', 'B. 2 months', 'C. 3 months', 'D. 4 months', 'E. 5 months',
                'F. 6 months', 'G. 7 months', 'H. 8 months', 'I. 9 months', 'J. 10 months',
                'K. 11 months', 'L. 12 months', 'M. 13 months', 'N. 14 months', 'O. 15 months',
                'P. 16 months', 'Q. 17 months', 'R. 18 months'
            ])

            # Dominant Injury
            dominant_injury = claim_data.get('DominantInjury', 'Unknown')
            create_onehot_features('DominantInjury', dominant_injury, ['Arms', 'Legs', 'Hips', 'Multiple'])

            # Vehicle Type
            vehicle_type = claim_data.get('VehicleType', 'Unknown')
            create_onehot_features('VehicleType', vehicle_type, ['Car', 'Truck', 'Motorcycle'])

            # Weather Conditions
            weather = claim_data.get('WeatherConditions', 'Unknown')
            create_onehot_features('WeatherConditions', weather, ['Sunny', 'Rainy', 'Snowy'])

            # Convert to DataFrame
            df = pd.DataFrame([processed_data])
            
            logger.info("Data preprocessing completed successfully")
            logger.debug(f"Final preprocessed data shape: {df.shape}")
            logger.debug(f"Final columns: {df.columns.tolist()}")
            
            return df

        except Exception as e:
            logger.error(f"Error preprocessing data: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            logger.debug(f"Problematic input data: {input_data}")
            raise ValueError(f"Error preprocessing data: {str(e)}")

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make a prediction using the loaded model"""
        try:
            if self.model is None:
                logger.error("Model not loaded")
                raise ValueError("Model not loaded")

            start_time = time.time()
            logger.info("Starting prediction process")

            # Preprocess the data
            processed_data = self.preprocess_data(input_data)
            
            if processed_data.empty:
                logger.error("No valid data after preprocessing")
                raise ValueError("No valid data after preprocessing")

            # Make prediction
            prediction = self.model.predict(processed_data)
            confidence = 0.8  # Default confidence for regression model
            
            settlement_amount = float(prediction[0])
            
            if not np.isfinite(settlement_amount):
                logger.error(f"Invalid prediction value: {settlement_amount}")
                raise ValueError("Invalid prediction value")
            
            processing_time = time.time() - start_time
            
            result = {
                'prediction': settlement_amount,
                'confidence': confidence,
                'processing_time': processing_time
            }
            
            logger.info(f"Prediction completed in {processing_time:.2f} seconds")
            logger.debug(f"Prediction result: {result}")
            
            return result

        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            raise