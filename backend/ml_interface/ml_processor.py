from typing import Dict, Any
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MLProcessor:
    NUMERIC_FIELDS = [
        'SpecialHealthExpenses', 'SpecialReduction', 'SpecialOverage',
        'GeneralRest', 'SpecialEarningsLoss', 'SpecialUsageLoss',
        'SpecialMedications', 'SpecialAssetDamage', 'SpecialRehabilitation',
        'SpecialFixes', 'GeneralFixed', 'GeneralUplift', 'SpecialLoanerVehicle',
        'SpecialTripCosts', 'SpecialJourneyExpenses', 'SpecialTherapy',
        'Vehicle_Age', 'Driver_Age', 'Number_of_Passengers',
        # Additional numeric fields needed for 83 features
        'TotalSpecialDamages', 'TotalGeneralDamages', 'SpecialToGeneralRatio', 
        'Injury_Severity_Score', 'Injury_Prognosis_Months',
        'Vehicle_Driver_Age_Ratio', 'Whiplash_Psychological',
        'ClaimProfile_Cluster'
    ]  # 27 features

    BOOLEAN_FIELDS = [
        'Whiplash', 'Police_Report_Filed', 'Witness_Present',
        # Additional boolean fields
        'Accident_Date_IsWeekend', 'Accident_Date_IsSummer', 'Accident_Date_IsWinter',
        'Claim_Date_IsWeekend', 'Claim_Date_IsSummer', 'Claim_Date_IsWinter'
    ]  # 9 features
    
    DATE_FIELDS = ['Accident_Date', 'Claim_Date']  # 2 features -> multiple derived features
    
    DATE_DERIVED_FIELDS = [
        'Accident_Date_Year', 'Accident_Date_Month', 'Accident_Date_Day',
        'Accident_Date_DayOfWeek', 'Accident_Date_Quarter', 'Accident_Date_DaysSinceRef',
        'Claim_Date_Year', 'Claim_Date_Month', 'Claim_Date_Day',
        'Claim_Date_DayOfWeek', 'Claim_Date_Quarter', 'Claim_Date_DaysSinceRef',
        'Accident_Date_to_Claim_Date_days'
    ]  # 13 date-derived features
    
    # These must match EXACTLY what's in the training data - 34 binary features total
    CATEGORICAL_MAPPING = {
        'AccidentType': {  # 13 features
            'default': 'Rear end',
            'categories': [
                'Rear end',
                'Other side pulled out of side road',
                'Other side changed lanes and collided with clt\'s vehicle',
                'Other side turned across Clt\'s path',
                'Other side reversed into Clt\'s vehicle',
                'Rear end - Clt pushed into next vehicle',
                'Other side pulled on to roundabout',
                'Other side drove on wrong side of the road',
                'Rear end - 3 car - Clt at front',
                'Other side changed lanes on a roundabout colliding with clt\'s vehicle',
                'Other side reversed into clt\'s stationary vehicle', 
                'Other side collided with Clt\'s parked vehicle',
                'Other'
            ]
        },
        'Injury_Prognosis': {  # 8 features - reduced from original 14 to match trained model
            'default': 'F. 6 months',
            'categories': [
                'A. 1 month', 'B. 2 months', 'C. 3 months', 'D. 4 months',
                'E. 5 months', 'F. 6 months', 'L. 12 months', 'R. 18 months'
            ]
        },
        'Dominant injury': {  # 4 features
            'default': 'Multiple',
            'categories': ['Arms', 'Legs', 'Multiple', 'Hips']
        },
        'Vehicle Type': {  # 3 features
            'default': 'Car',
            'categories': ['Car', 'Motorcycle', 'Truck']
        },
        'Weather Conditions': {  # 3 features
            'default': 'Sunny',
            'categories': ['Sunny', 'Rainy', 'Snowy']
        },
        'Gender': {  # 3 features
            'default': 'Male',
            'categories': ['Male', 'Female', 'Other']
        }
    }

    def __init__(self):
        self.model = None
        self.processing_start_time = None

    def load_model(self, model_path: str) -> None:
        """Load the ML model from the given path."""
        try:
            # Try to load with joblib first
            try:
                self.model = joblib.load(model_path)
                logger.info(f"Successfully loaded model with joblib from {model_path}")
                return
            except Exception as joblib_err:
                logger.warning(f"Failed to load model with joblib: {str(joblib_err)}")
                
            # Try with pickle with different protocols
            import pickle
            for protocol in range(5, 0, -1):  # Try pickle protocols from newest to oldest
                try:
                    with open(model_path, 'rb') as f:
                        self.model = pickle.load(f, fix_imports=True, encoding='bytes')
                    logger.info(f"Successfully loaded model with pickle protocol {protocol} from {model_path}")
                    
                    # If successful, convert to joblib for future use
                    try:
                        # Save a converted copy for future use
                        joblib_path = f"{model_path.rsplit('.', 1)[0]}_converted.joblib"
                        joblib.dump(self.model, joblib_path)
                        logger.info(f"Converted pickle model to joblib at {joblib_path}")
                    except Exception as conv_err:
                        logger.warning(f"Could not convert model to joblib: {str(conv_err)}")
                    
                    return
                except Exception as pickle_err:
                    logger.warning(f"Failed to load model with pickle protocol {protocol}: {str(pickle_err)}")
                    continue
                    
            # If we get here, all attempts failed
            raise ValueError(f"Failed to load model with any protocol. Last error: {str(joblib_err)}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise

    def preprocess_input(self, input_data: Dict[str, Any]) -> pd.DataFrame:
        """Preprocess the input data into the format expected by the model."""
        try:
            processed_data = input_data.copy()
            
            # ---- Handle basic numeric fields ----
            for field in self.NUMERIC_FIELDS[:19]:  # Original numeric fields
                try:
                    processed_data[field] = float(processed_data.get(field, 0))
                except (TypeError, ValueError):
                    processed_data[field] = 0.0
            
            # ---- Calculate derived numeric fields ----
            
            # Total Special Damages
            special_damage_cols = [col for col in processed_data.keys() 
                                 if col.startswith('Special') and col != 'SpecialReduction']
            special_values = [float(processed_data.get(col, 0)) for col in special_damage_cols]
            processed_data['TotalSpecialDamages'] = sum(special_values)
            if 'SpecialReduction' in processed_data:
                processed_data['TotalSpecialDamages'] -= float(processed_data.get('SpecialReduction', 0))
            
            # Total General Damages
            general_damage_cols = [col for col in processed_data.keys() if col.startswith('General')]
            general_values = [float(processed_data.get(col, 0)) for col in general_damage_cols]
            processed_data['TotalGeneralDamages'] = sum(general_values)
            
            # Special to General Ratio
            if processed_data['TotalGeneralDamages'] > 0:
                processed_data['SpecialToGeneralRatio'] = processed_data['TotalSpecialDamages'] / processed_data['TotalGeneralDamages']
            else:
                processed_data['SpecialToGeneralRatio'] = processed_data['TotalSpecialDamages']
            
            # Injury Severity Score based on Injury_Prognosis
            injury_severity_mapping = {
                'A. 1 month': 1, 'B. 2 months': 2, 'C. 3 months': 3, 'D. 4 months': 4,
                'E. 5 months': 5, 'F. 6 months': 6, 'G. 7 months': 7, 'H. 8 months': 8,
                'I. 9 months': 9, 'J. 10 months': 10, 'K. 11 months': 11, 'L. 12 months': 12,
                'O. 15 months': 15, 'R. 18 months': 18, 'S. 19 months': 19
            }
            prognosis = processed_data.get('Injury_Prognosis', 'F. 6 months')
            processed_data['Injury_Severity_Score'] = injury_severity_mapping.get(prognosis, 6)
            
            # Extract months from Injury_Prognosis
            if prognosis in injury_severity_mapping:
                processed_data['Injury_Prognosis_Months'] = injury_severity_mapping[prognosis]
            else:
                processed_data['Injury_Prognosis_Months'] = 6  # Default to 6 months
            
            # Vehicle Driver Age Ratio
            vehicle_age = float(processed_data.get('Vehicle_Age', 0))
            driver_age = max(float(processed_data.get('Driver_Age', 30)), 0.1)  # Avoid division by zero
            processed_data['Vehicle_Driver_Age_Ratio'] = vehicle_age / driver_age
            
            # Whiplash + Psychological interaction
            whiplash = str(processed_data.get('Whiplash', '')).lower() in ['true', 'yes', '1']
            psych_injury = str(processed_data.get('Minor_Psychological_Injury', '')).lower() in ['true', 'yes', '1']
            processed_data['Whiplash_Psychological'] = 1 if (whiplash and psych_injury) else 0
            
            # Default value for ClaimProfile_Cluster (would normally be from a clustering algorithm)
            processed_data['ClaimProfile_Cluster'] = 0
            
            # ---- Process date fields and their derivatives ----
            reference_date = pd.Timestamp('2020-01-01')
            
            # Process each date field
            for field in self.DATE_FIELDS:
                try:
                    date_value = pd.to_datetime(processed_data.get(field, pd.Timestamp.now()))
                except (TypeError, ValueError):
                    date_value = pd.Timestamp.now()
                
                # Calculate core date-derived fields
                processed_data[f'{field}_Year'] = date_value.year
                processed_data[f'{field}_Month'] = date_value.month
                processed_data[f'{field}_Day'] = date_value.day
                processed_data[f'{field}_DayOfWeek'] = date_value.dayofweek
                processed_data[f'{field}_Quarter'] = (date_value.month - 1) // 3 + 1
                processed_data[f'{field}_DaysSinceRef'] = (date_value - reference_date).days
                
                # Weekend flags
                processed_data[f'{field}_IsWeekend'] = 1 if date_value.dayofweek >= 5 else 0  # 5 = Saturday, 6 = Sunday
                
                # Season flags
                month = date_value.month
                processed_data[f'{field}_IsSummer'] = 1 if (month >= 6 and month <= 8) else 0
                processed_data[f'{field}_IsWinter'] = 1 if (month == 12 or month <= 2) else 0
                
                # Remove original date field as we've processed it into features
                processed_data.pop(field, None)
            
            # Calculate days between Accident_Date and Claim_Date
            try:
                accident_date = pd.to_datetime(input_data.get('Accident_Date', pd.Timestamp.now()))
                claim_date = pd.to_datetime(input_data.get('Claim_Date', pd.Timestamp.now()))
                processed_data['Accident_Date_to_Claim_Date_days'] = (claim_date - accident_date).days
            except (TypeError, ValueError):
                processed_data['Accident_Date_to_Claim_Date_days'] = 0
            
            # ---- Process boolean fields ----
            for field in self.BOOLEAN_FIELDS[:3]:  # Original boolean fields
                val = str(processed_data.get(field, '')).lower()
                processed_data[field] = 1 if val in ['true', 'yes', '1'] else 0
            
            # ---- Create DataFrame and handle categorical variables ----
            df = pd.DataFrame([processed_data])
            
            # One-hot encode categorical fields
            for field, mapping in self.CATEGORICAL_MAPPING.items():
                current_value = str(processed_data.get(field, '')).strip()
                
                # If value is missing or invalid, use the default
                if current_value == '' or current_value.lower() == 'nan' or current_value not in mapping['categories']:
                    current_value = mapping['default']
                
                # Create binary columns for each possible category
                for category in mapping['categories']:
                    column_name = f"{field}_{category}"
                    df[column_name] = 1 if current_value == category else 0
                
                # Remove original categorical column
                if field in df.columns:
                    df.drop(field, axis=1, inplace=True)
            
            # ---- Ensure all expected columns are present in correct order ----
            expected_columns = (
                # Date-derived features (13)
                self.DATE_DERIVED_FIELDS +
                # Boolean features (9)
                self.BOOLEAN_FIELDS +
                # Numeric features (27)
                self.NUMERIC_FIELDS +
                # Categorical features (34)
                [f"{field}_{cat}" 
                 for field, mapping in self.CATEGORICAL_MAPPING.items()
                 for cat in mapping['categories']]
            )
            
            # Add any missing columns with 0s
            for col in expected_columns:
                if col not in df.columns:
                    df[col] = 0
            
            # Ensure exact column order
            df = df[expected_columns]
            
            # Convert all to float64
            df = df.astype('float64')
            
            # Verify feature count
            if len(df.columns) != 83:
                raise ValueError(f"Expected 83 features, but got {len(df.columns)}")
            
            logger.info("Successfully preprocessed input data")
            logger.debug(f"Final feature count: {len(df.columns)}")
            logger.debug(f"Features: {sorted(df.columns.tolist())}")
            
            return df
        
        except Exception as e:
            logger.error(f"Error preprocessing input: {str(e)}")
            logger.debug(f"Input data: {input_data}")
            raise

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make a prediction using the loaded model."""
        try:
            self.processing_start_time = datetime.now()

            if self.model is None:
                raise ValueError("Model not loaded")

            # Preprocess input
            processed_input = self.preprocess_input(input_data)

            # Verify feature count
            if len(processed_input.columns) != 83:
                raise ValueError(f"Expected 83 features, but got {len(processed_input.columns)}")

            # Make prediction
            prediction = self.model.predict(processed_input)[0]
            
            # Get confidence score if available
            confidence_score = 0.0
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(processed_input)
                confidence_score = float(np.max(probabilities))

            processing_time = (datetime.now() - self.processing_start_time).total_seconds()

            result = {
                'settlement_amount': float(prediction),
                'confidence_score': confidence_score,
                'processing_time': processing_time,
                'input_data': input_data,
                'timestamp': datetime.now().isoformat()
            }

            logger.info(f"Successfully generated prediction: {result}")
            return result

        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            raise