#!/usr/bin/env python3
"""
Create a simple responsive test model for the ML service.
This script creates a random forest model that will respond to input changes.
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
from sklearn.preprocessing import OneHotEncoder
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Synthetic data generation parameters
NUM_SAMPLES = 500
NUM_FEATURES = 83  # Match the expected features from MLProcessor

# Ensure models directory exists
os.makedirs('models', exist_ok=True)

def generate_synthetic_data():
    """Generate synthetic data that mimics real inputs and has correlated outputs"""
    logger.info("Generating synthetic training data...")
    
    # Create synthetic input data for common fields
    accident_types = [
        'Rear end', 'Other side pulled out of side road', 
        'Other side changed lanes and collided with clt\'s vehicle',
        'Other side turned across Clt\'s path', 'Other'
    ]
    
    # Create dataframe
    data = []
    for _ in range(NUM_SAMPLES):
        # Basic categorical inputs
        row = {
            'AccidentType': np.random.choice(accident_types),
            'Vehicle Type': np.random.choice(['Car', 'Motorcycle', 'Truck']),
            'Weather Conditions': np.random.choice(['Sunny', 'Rainy', 'Snowy']),
            'Injury_Prognosis': np.random.choice(['A. 1 month', 'B. 2 months', 'F. 6 months', 'L. 12 months']),
            'Dominant injury': np.random.choice(['Arms', 'Legs', 'Multiple', 'Hips']),
            'Gender': np.random.choice(['Male', 'Female', 'Other']),
            
            # Boolean inputs
            'Whiplash': np.random.choice([True, False]),
            'Police_Report_Filed': np.random.choice([True, False]),
            'Witness_Present': np.random.choice([True, False]),
            'Minor_Psychological_Injury': np.random.choice([True, False]),
            
            # Numerical inputs - Random values within typical ranges
            'Driver_Age': np.random.randint(16, 90),
            'Vehicle_Age': np.random.randint(0, 25),
            'Number_of_Passengers': np.random.randint(0, 5),
            
            # Special damages - generate reasonable values
            'SpecialHealthExpenses': np.random.uniform(0, 10000),
            'SpecialMedications': np.random.uniform(0, 2000),
            'SpecialEarningsLoss': np.random.uniform(0, 5000),
            'SpecialAssetDamage': np.random.uniform(0, 5000),
            'SpecialFixes': np.random.uniform(0, 3000),
            
            # General damages
            'GeneralFixed': np.random.uniform(0, 3000),
            'GeneralUplift': np.random.uniform(0, 2000),
            
            # Dates (dummy values for now)
            'Accident_Date': '2023-01-01',
            'Claim_Date': '2023-01-15',
        }
        
        # Add other fields with zeros
        for field in ['SpecialReduction', 'SpecialOverage', 'GeneralRest', 
                     'SpecialUsageLoss', 'SpecialRehabilitation', 
                     'SpecialLoanerVehicle', 'SpecialTripCosts', 
                     'SpecialJourneyExpenses', 'SpecialTherapy']:
            row[field] = np.random.uniform(0, 500)  # Small random values
            
        data.append(row)
    
    # Create dataframe
    df = pd.DataFrame(data)
    
    # Create response variable that correlates with inputs
    # This will ensure our model responds to changes in inputs
    y = (
        df['SpecialHealthExpenses'] * 0.2 +  # Health expenses have moderate impact
        df['SpecialEarningsLoss'] * 0.3 +    # Earnings loss has large impact
        df['GeneralFixed'] * 0.5 +           # General damages have high impact
        df['GeneralUplift'] * 0.4 +          # Uplift has moderate-high impact
        (df['Driver_Age'] > 65).astype(int) * 500 +  # Older drivers get more
        (df['Whiplash']).astype(int) * 700 +  # Whiplash increases settlement
        (df['Minor_Psychological_Injury']).astype(int) * 900 +  # Psych injury increases settlement
        np.random.normal(500, 200, NUM_SAMPLES)  # Random noise
    )
    
    # Ensure settlements are positive and reasonable
    y = np.maximum(y, 500)  # Minimum settlement
    
    # Add different values based on accident type
    accident_type_values = {
        'Rear end': 500,
        'Other side pulled out of side road': 800,
        'Other side changed lanes and collided with clt\'s vehicle': 700,
        'Other side turned across Clt\'s path': 900,
        'Other': 600
    }
    
    for accident_type, value in accident_type_values.items():
        y += (df['AccidentType'] == accident_type).astype(int) * value
    
    # Add different values based on injury prognosis
    injury_prognosis_values = {
        'A. 1 month': 200, 
        'B. 2 months': 400,
        'F. 6 months': 1200,
        'L. 12 months': 2400
    }
    
    for prognosis, value in injury_prognosis_values.items():
        y += (df['Injury_Prognosis'] == prognosis).astype(int) * value
        
    logger.info(f"Generated {len(df)} synthetic data rows")
    
    return df, y

# Generate synthetic data
df, y = generate_synthetic_data()

# Process the data to match the MLProcessor output format
logger.info("Processing data to match MLProcessor format...")

# One-hot encode categoricals
categorical_columns = ['AccidentType', 'Vehicle Type', 'Weather Conditions', 
                       'Injury_Prognosis', 'Dominant injury', 'Gender']
encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
encoded = encoder.fit_transform(df[categorical_columns])

# Get encoded feature names
encoded_feature_names = []
for i, col in enumerate(categorical_columns):
    for category in encoder.categories_[i]:
        encoded_feature_names.append(f"{col}_{category}")

# Create dataframe with encoded features
encoded_df = pd.DataFrame(encoded, columns=encoded_feature_names)

# Convert boolean columns to integers
boolean_columns = ['Whiplash', 'Police_Report_Filed', 'Witness_Present', 'Minor_Psychological_Injury']
for col in boolean_columns:
    df[col] = df[col].astype(int)

# Create a list of all feature columns (except dates, which will be processed)
numeric_columns = [col for col in df.columns if col not in categorical_columns + ['Accident_Date', 'Claim_Date']]

# Create final dataset
X = pd.concat([encoded_df, df[numeric_columns]], axis=1)

# Ensure we have the expected number of features
if len(X.columns) < NUM_FEATURES:
    logger.warning(f"Expected {NUM_FEATURES} features, but got {len(X.columns)}")
    logger.warning("Adding dummy features to reach expected count")
    
    # Add dummy features to reach 83 total
    for i in range(len(X.columns), NUM_FEATURES):
        X[f'dummy_feature_{i}'] = 0

# Train a random forest model
logger.info("Training random forest model...")
model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
model.fit(X, y)

# Save the model
model_path = os.path.join('models', 'responsive_random_forest_model.pkl')
joblib.dump(model, model_path)
logger.info(f"Model saved to {model_path}")

# Test prediction
logger.info("Testing prediction with a sample input...")

# Create sample test data
test_data = {
    'AccidentType': 'Rear end',
    'Vehicle Type': 'Car',
    'Weather Conditions': 'Sunny',
    'Injury_Prognosis': 'F. 6 months',
    'Dominant injury': 'Multiple',
    'Gender': 'Male',
    'Whiplash': 1,
    'Police_Report_Filed': 1,
    'Witness_Present': 0,
    'Minor_Psychological_Injury': 0,
    'Driver_Age': 35,
    'Vehicle_Age': 5,
    'Number_of_Passengers': 1,
    'SpecialHealthExpenses': 2000,
    'SpecialEarningsLoss': 1500,
    'GeneralFixed': 1000,
    'GeneralUplift': 500,
}

# One-hot encode test data
test_df = pd.DataFrame([test_data])
test_categorical = pd.DataFrame([{col: test_data.get(col, '') for col in categorical_columns}])
test_encoded = encoder.transform(test_categorical)
test_encoded_df = pd.DataFrame(test_encoded, columns=encoded_feature_names)

# Get numeric features
test_numeric = pd.DataFrame([{col: test_data.get(col, 0) for col in numeric_columns}])

# Combine and ensure all required features
test_X = pd.concat([test_encoded_df, test_numeric], axis=1)
for col in X.columns:
    if col not in test_X.columns:
        test_X[col] = 0

# Reorder columns to match training data
test_X = test_X[X.columns]

# Make a prediction
prediction = model.predict(test_X)[0]
logger.info(f"Test prediction result: ${prediction:.2f}")

# Make another prediction with different inputs to verify responsiveness
test_data2 = test_data.copy()
test_data2['SpecialHealthExpenses'] = 5000  # Increase health expenses
test_data2['Whiplash'] = 1  # Add whiplash
test_data2['Injury_Prognosis'] = 'L. 12 months'  # More severe injury

# Process the second test
test_df2 = pd.DataFrame([test_data2])
test_categorical2 = pd.DataFrame([{col: test_data2.get(col, '') for col in categorical_columns}])
test_encoded2 = encoder.transform(test_categorical2)
test_encoded_df2 = pd.DataFrame(test_encoded2, columns=encoded_feature_names)
test_numeric2 = pd.DataFrame([{col: test_data2.get(col, 0) for col in numeric_columns}])
test_X2 = pd.concat([test_encoded_df2, test_numeric2], axis=1)
for col in X.columns:
    if col not in test_X2.columns:
        test_X2[col] = 0
test_X2 = test_X2[X.columns]

# Make second prediction
prediction2 = model.predict(test_X2)[0]
logger.info(f"Second test prediction result: ${prediction2:.2f}")
logger.info(f"Difference: ${prediction2 - prediction:.2f}")

logger.info("Model creation complete. This model will respond to changes in input data.")