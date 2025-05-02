#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Random Forest Model Evaluation Script
-------------------------------------
This script evaluates the performance of the Random Forest model
on the test dataset and reports various metrics including an accuracy measure.
"""

import numpy as np
import joblib
import os
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from src.models.random_forest_model import RandomForestModel

def evaluate_random_forest():
    """Load and evaluate the Random Forest model performance."""
    print("Evaluating Random Forest model performance...")
    
    # Load test data
    try:
        X_test = np.load('data/processed_data/X_test_processed.npy')
        y_test = np.load('data/processed_data/y_test.npy')
        print(f"Loaded test data: X shape={X_test.shape}, y shape={y_test.shape}")
    except Exception as e:
        print(f"Error loading test data: {e}")
        return
    
    # Load the Random Forest model
    model_path = 'models/random_forest_model.pkl'
    try:
        print(f"Loading model from {model_path}...")
        rf_model = RandomForestModel()
        rf_model.load(model_path)
    except Exception as e:
        print(f"Error loading model: {e}")
        return
    
    # Generate predictions
    try:
        print("Generating predictions...")
        y_pred = rf_model.predict(X_test)
    except Exception as e:
        print(f"Error generating predictions: {e}")
        return
    
    # Calculate metrics
    print("\nCalculating performance metrics...")
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    r2_percentage = r2 * 100  # Convert R² to percentage
    
    # Calculate Mean Absolute Percentage Error
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    
    # Calculate accuracy-like metric (1 - normalized error)
    # This is an alternative way to express performance as "accuracy"
    # We'll cap it at 100% to avoid negative values
    error_normalized = np.mean(np.abs((y_test - y_pred) / (np.max(y_test) - np.min(y_test))))
    accuracy_like = min(100, 100 * (1 - error_normalized))
    
    # Print results
    print("\n" + "="*50)
    print("Random Forest Performance Metrics:")
    print("="*50)
    print(f"RMSE: {rmse:.2f}")
    print(f"MAE: {mae:.2f}")
    print(f"R² Score: {r2:.4f} ({r2_percentage:.2f}%)")
    print(f"MAPE: {mape:.2f}%")
    print(f"Relative Accuracy: {accuracy_like:.2f}%")
    print("="*50)
    
    # Create output directory
    os.makedirs('results/rf_evaluation', exist_ok=True)
    
    # Create scatter plot of actual vs predicted values
    plt.figure(figsize=(10, 8))
    plt.scatter(y_test, y_pred, alpha=0.6)
    plt.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], 'r--')
    plt.xlabel('Actual Settlement Value')
    plt.ylabel('Predicted Settlement Value')
    plt.title('Random Forest: Actual vs Predicted Values')
    plt.grid(True, alpha=0.3)
    
    # Add performance metrics as text on the plot
    textstr = f"RMSE: {rmse:.2f}\nMAE: {mae:.2f}\nR²: {r2:.4f}\nMAPE: {mape:.2f}%\nAccuracy: {accuracy_like:.2f}%"
    props = dict(boxstyle='round', facecolor='wheat', alpha=0.5)
    plt.text(0.05, 0.95, textstr, transform=plt.gca().transAxes, fontsize=10,
             verticalalignment='top', bbox=props)
    
    plt.tight_layout()
    plt.savefig('results/rf_evaluation/random_forest_performance.png')
    plt.close()
    
    print(f"\nPerformance visualisation saved to results/rf_evaluation/random_forest_performance.png")
    
    # Create residual plot
    plt.figure(figsize=(10, 6))
    residuals = y_test - y_pred
    plt.scatter(y_pred, residuals, alpha=0.6)
    plt.axhline(y=0, color='r', linestyle='--')
    plt.xlabel('Predicted Values')
    plt.ylabel('Residuals')
    plt.title('Random Forest: Residual Plot')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('results/rf_evaluation/random_forest_residuals.png')
    plt.close()
    
    print(f"Residual plot saved to results/rf_evaluation/random_forest_residuals.png")
    
    # Save performance metrics to a CSV file
    import pandas as pd
    metrics_df = pd.DataFrame({
        'Metric': ['RMSE', 'MAE', 'R²', 'R² Percentage', 'MAPE', 'Relative Accuracy'],
        'Value': [rmse, mae, r2, r2_percentage, mape, accuracy_like]
    })
    metrics_df.to_csv('results/rf_evaluation/random_forest_metrics.csv', index=False)
    
    print(f"Performance metrics saved to results/rf_evaluation/random_forest_metrics.csv")
    
    return r2_percentage, accuracy_like

if __name__ == '__main__':
    r2_percentage, accuracy = evaluate_random_forest()
    print(f"\nSummary: Random Forest explains {r2_percentage:.2f}% of the variance in settlement values")
    print(f"Random Forest relative accuracy: {accuracy:.2f}%")