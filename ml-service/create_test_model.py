#!/usr/bin/env python3
"""
Create a simple test model for the ML service.
This script creates a dummy random forest model and saves it to disk.
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

# Ensure models directory exists
os.makedirs('models', exist_ok=True)

# Create a dummy random forest model
print("Creating test random forest model...")
X = np.random.rand(100, 83)  # 83 features to match our processor
y = np.random.rand(100) * 10000  # Settlement values ranging from 0-10000

# Create and fit the model
model = RandomForestRegressor(n_estimators=10, random_state=42)
model.fit(X, y)

# Save the model
model_path = os.path.join('models', 'test_random_forest_model.pkl')
joblib.dump(model, model_path)
print(f"Model saved to {model_path}")

# Print some info about the model
print(f"Model type: {type(model)}")
print(f"Model file size: {os.path.getsize(model_path) / (1024*1024):.2f} MB")
print(f"Number of estimators: {model.n_estimators}")
print(f"Number of features: {model.n_features_in_}")

print("\nYou can now use this model with the ML service.")
print("Example command: ./test_client.py --action predict --model test_random_forest_model")