#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Model Evaluation Script
-----------------------
This script loads all trained models and evaluates their performance
on the test dataset to determine which model performs best.
"""

import os
import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
import json
from pathlib import Path

# Import project modules
from src.models.xgboost_model import XGBoostModel
from src.models.mlp_model import MLPModel
from src.models.random_forest_model import RandomForestModel
from src.models.lightgbm_model import LightGBMModel
from src.models.ensemble import (
    WeightedEnsembleModel, 
    StackingEnsembleModel,
    StackingCVEnsembleModel,
    BlendingEnsembleModel
)
from src.evaluation.metrics import calculate_regression_metrics
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def load_model(model_path, model_class=None):
    """Load a saved model and wrap it in its proper class if needed."""
    try:
        model = joblib.load(model_path)
        
        # If a model class is specified and the loaded object is a raw model (not a wrapper)
        if model_class is not None and not hasattr(model, 'predict'):
            wrapper = model_class()
            wrapper.model = model
            return wrapper
        return model
    except Exception as e:
        print(f"Error loading model from {model_path}: {e}")
        return None

def evaluate_all_models():
    """Evaluate all available models and determine which performs best."""
    # Load preprocessed test data
    try:
        X_test = np.load('data/processed_data/X_test_processed.npy')
        y_test = np.load('data/processed_data/y_test.npy')
        print(f"Loaded test data: X shape={X_test.shape}, y shape={y_test.shape}")
    except Exception as e:
        print(f"Error loading test data: {e}")
        return
    
    # Define model types and their classes
    model_classes = {
        'xgboost': XGBoostModel,
        'mlp': MLPModel,
        'random_forest': RandomForestModel,
        'lightgbm': LightGBMModel,
        'weighted_ensemble': WeightedEnsembleModel,
        'stacking_ensemble': StackingEnsembleModel,
        'stacking_cv_ensemble': StackingCVEnsembleModel,
        'blending_ensemble': BlendingEnsembleModel
    }
    
    # Define locations to search for models
    model_directories = ['results/models', 'models']
    
    # Find and load all models
    loaded_models = {}
    for directory in model_directories:
        if os.path.exists(directory):
            model_files = [f for f in os.listdir(directory) if f.endswith('_model.pkl')]
            for model_file in model_files:
                model_path = os.path.join(directory, model_file)
                model_name = model_file.replace('_model.pkl', '')
                
                # Skip if already loaded
                if model_name in loaded_models:
                    continue
                
                # Determine model type
                model_type = None
                for key in model_classes.keys():
                    if key in model_name:
                        model_type = key
                        break
                
                # Load the model with the appropriate wrapper class
                model_class = model_classes.get(model_type)
                model = load_model(model_path, model_class)
                if model is not None:
                    loaded_models[model_name] = model
                    print(f"Loaded {model_name} from {model_path}")
    
    if not loaded_models:
        print("No models found for evaluation.")
        return
    
    # Evaluate all models
    results = []
    for name, model in loaded_models.items():
        try:
            print(f"Evaluating {name}...")
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            # Get percentage error (MAPE)
            mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
            
            results.append({
                'name': name,
                'rmse': rmse,
                'mae': mae,
                'r2': r2,
                'mape': mape
            })
            
            print(f"  RMSE: {rmse:.2f}, MAE: {mae:.2f}, R²: {r2:.4f}, MAPE: {mape:.2f}%")
            
            # Create scatter plot of predictions vs actuals
            output_dir = Path("results/model_evaluation")
            output_dir.mkdir(exist_ok=True, parents=True)
            
            plt.figure(figsize=(10, 8))
            plt.scatter(y_test, y_pred, alpha=0.5)
            plt.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], 'r--')
            plt.xlabel('Actual Values')
            plt.ylabel('Predicted Values')
            plt.title(f'Actual vs Predicted - {name}')
            plt.grid(True, alpha=0.3)
            plt.savefig(output_dir / f"{name}_predictions.png")
            plt.close()
            
        except Exception as e:
            print(f"Error evaluating {name}: {e}")
    
    if not results:
        print("No evaluation results generated.")
        return
    
    # Convert results to DataFrame and sort by RMSE (lower is better)
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values('rmse')
    
    # Save results to CSV
    output_path = "results/model_evaluation/model_comparison.csv"
    results_df.to_csv(output_path, index=False)
    print(f"\nModel comparison saved to {output_path}")
    
    # Create bar charts comparing model performance
    create_comparison_visualizations(results_df)
    
    # Print ranking of models from best to worst based on RMSE
    print("\nModel Ranking (by RMSE - lower is better):")
    for i, (_, row) in enumerate(results_df.iterrows()):
        print(f"{i+1}. {row['name']} - RMSE: {row['rmse']:.2f}, R²: {row['r2']:.4f}")
    
    # Identify the best model
    best_model = results_df.iloc[0]
    print(f"\n🏆 Best Model: {best_model['name']}")
    print(f"   RMSE: {best_model['rmse']:.2f}")
    print(f"   MAE: {best_model['mae']:.2f}")
    print(f"   R²: {best_model['r2']:.4f}")
    print(f"   MAPE: {best_model['mape']:.2f}%")

def create_comparison_visualizations(results_df):
    """Create visualizations comparing model performance."""
    output_dir = Path("results/model_evaluation")
    output_dir.mkdir(exist_ok=True, parents=True)
    
    # Set up the figure
    plt.figure(figsize=(14, 10))
    
    # RMSE (lower is better)
    plt.subplot(2, 2, 1)
    plt.barh(results_df['name'], results_df['rmse'], color='skyblue')
    plt.xlabel('RMSE (lower is better)')
    plt.title('RMSE by Model')
    plt.grid(axis='x', linestyle='--', alpha=0.6)
    
    # MAE (lower is better)
    plt.subplot(2, 2, 2)
    plt.barh(results_df['name'], results_df['mae'], color='lightgreen')
    plt.xlabel('MAE (lower is better)')
    plt.title('MAE by Model')
    plt.grid(axis='x', linestyle='--', alpha=0.6)
    
    # R² (higher is better)
    plt.subplot(2, 2, 3)
    plt.barh(results_df['name'], results_df['r2'], color='salmon')
    plt.xlabel('R² (higher is better)')
    plt.title('R² by Model')
    plt.grid(axis='x', linestyle='--', alpha=0.6)
    
    # MAPE (lower is better)
    plt.subplot(2, 2, 4)
    plt.barh(results_df['name'], results_df['mape'], color='orchid')
    plt.xlabel('MAPE % (lower is better)')
    plt.title('MAPE by Model')
    plt.grid(axis='x', linestyle='--', alpha=0.6)
    
    plt.tight_layout()
    plt.savefig(output_dir / 'model_comparison_metrics.png')
    plt.close()
    
    print(f"Performance comparison visualization saved to {output_dir / 'model_comparison_metrics.png'}")

if __name__ == '__main__':
    print("Evaluating model performance...")
    evaluate_all_models()