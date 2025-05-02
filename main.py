#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Main entry point for the ML pipeline
# Contributors:
# - Jakub: Initial setup, data preprocessing, and basic model training (30%)
# - Monty: Added fairness analysis, uncertainty quantification, and model evaluation framework (30%)
# - Alex: Enhanced all models, added ensemble models, hyperparameter tuning, and advanced visualizations (30%)
# The remaining 10% was collaborative work between all team members

import os
import sys
import argparse
import yaml
import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
from datetime import datetime
from sklearn.model_selection import KFold, cross_val_score, train_test_split

# Import project modules
from src.data.preprocessing import preprocess_data
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
from src.analysis.interpret_predictions import generate_shap_explanations
from src.analysis.fairness import analyse_fairness_across_attributes
from src.analysis.uncertainty import quantify_uncertainty
from src.utils.config import load_config
from src.utils.logger import setup_logger

def main(args=None):
    """
    Main entry point for the application.
    
    Parameters:
    -----------
    args : list, optional
        Command line arguments
    """
    # Set up logging
    logger = setup_logger()
    logger.info("Starting the settlement value prediction pipeline")
    
    # Parse arguments
    if args is None:
        args = sys.argv[1:]
    args = parse_args(args)
    
    # Load configuration
    config_path = os.path.join('config', 'default.yaml')
    config = load_config(config_path)
    
    # Print current configuration
    logger.info("Using configuration:")
    for section, params in config.items():
        logger.info(f"  {section}:")
        for param, value in params.items():
            logger.info(f"    {param}: {value}")
    
    # Determine steps to run
    steps_to_run = args.steps
    if 'all' in steps_to_run:
        steps_to_run = ['preprocess', 'train_lgbm', 'train_xgboost', 'train_mlp', 'train_rf', 
                       'tune', 'ensemble', 'evaluate', 'interpret', 'fairness', 'uncertainty']
    
    logger.info(f"Running the following steps: {', '.join(steps_to_run)}")
    
    # Define file paths
    data_path = 'data/Synthetic_Data_For_Students.csv'
    processed_dir = 'data/processed_data'
    
    # Step 1: Preprocess data
    if 'preprocess' in steps_to_run:
        logger.info("Step 1: Preprocessing data")
        
        # Create processed data directory if it doesn't exist
        os.makedirs(processed_dir, exist_ok=True)
        
        # Process data with our enhanced preprocessing pipeline
        X_train, X_test, y_train, y_test, preprocessor = preprocess_data(
            data_path, 
            target_column=config['data']['target_column'],
            test_size=config['data']['test_size'],
            random_state=config['data']['random_state']
        )
        logger.info(f"Preprocessing complete. Training data shape: {X_train.shape}")
    else:
        # Load preprocessed data
        logger.info("Loading preprocessed data")
        X_train = np.load(os.path.join(processed_dir, 'X_train_processed.npy'))
        X_test = np.load(os.path.join(processed_dir, 'X_test_processed.npy'))
        y_train = np.load(os.path.join(processed_dir, 'y_train.npy'))
        y_test = np.load(os.path.join(processed_dir, 'y_test.npy'))
        preprocessor = joblib.load(os.path.join(processed_dir, 'preprocessor.pkl'))
        logger.info(f"Preprocessed data loaded. Training data shape: {X_train.shape}")
    
    # Dictionary to store trained models
    models = {}
    
    # Define a validation set for hyperparameter tuning
    X_train_main, X_val, y_train_main, y_val = train_test_split(
        X_train, y_train, 
        test_size=0.2, 
        random_state=config['data']['random_state']
    )
    
    # Step 2: Train LightGBM model (new addition)
    if 'train_lgbm' in steps_to_run:
        logger.info("Training LightGBM model")
        lgbm_model = LightGBMModel(
            n_estimators=config['models']['lightgbm']['n_estimators'],
            learning_rate=config['models']['lightgbm']['learning_rate'],
            max_depth=config['models']['lightgbm']['max_depth'],
            random_state=config['data']['random_state']
        )
        lgbm_model.train(X_train, y_train)
        lgbm_model.save()
        models['lightgbm'] = lgbm_model
        
        # Evaluate the model
        metrics, _ = lgbm_model.evaluate(X_test, y_test)
        logger.info(f"LightGBM RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
    
    # Step 3: Train XGBoost model
    if 'train_xgboost' in steps_to_run:
        logger.info("Training XGBoost model")
        xgb_model = XGBoostModel(
            n_estimators=config['models']['xgboost']['n_estimators'],
            learning_rate=config['models']['xgboost']['learning_rate'],
            max_depth=config['models']['xgboost']['max_depth'],
            random_state=config['data']['random_state']
        )
        xgb_model.train(X_train, y_train)
        xgb_model.save()
        models['xgboost'] = xgb_model
        
        # Evaluate the model
        metrics, _ = xgb_model.evaluate(X_test, y_test)
        logger.info(f"XGBoost RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
    
    # Step 4: Train MLP model
    if 'train_mlp' in steps_to_run:
        logger.info("Training MLP model")
        mlp_model = MLPModel(
            hidden_layer_sizes=config['models']['mlp']['hidden_layers'],
            max_iter=config['models']['mlp']['max_iter'],
            alpha=config['models']['mlp'].get('alpha', 0.0001),
            random_state=config['data']['random_state']
        )
        mlp_model.train(X_train, y_train)
        mlp_model.save()
        models['mlp'] = mlp_model
        
        # Evaluate the model
        metrics, _ = mlp_model.evaluate(X_test, y_test)
        logger.info(f"MLP RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
    
    # Step 5: Train Random Forest model
    if 'train_rf' in steps_to_run:
        logger.info("Training Random Forest model")
        rf_model = RandomForestModel(
            n_estimators=config['models']['random_forest']['n_estimators'],
            max_depth=config['models']['random_forest']['max_depth'],
            random_state=config['data']['random_state']
        )
        rf_model.train(X_train, y_train)
        rf_model.save()
        models['random_forest'] = rf_model
        
        # Evaluate the model
        metrics, _ = rf_model.evaluate(X_test, y_test)
        logger.info(f"Random Forest RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
    
    # Step 6: Hyperparameter tuning
    if 'tune' in steps_to_run:
        logger.info("Hyperparameter tuning")
        
        if 'lgbm' in config['tune']['models']:
            logger.info("Tuning LightGBM model")
            lgbm_model = LightGBMModel(
                random_state=config['data']['random_state']
            )
            lgbm_model.tune_hyperparameters(
                X_train_main, y_train_main, 
                X_val, y_val,
                n_trials=config['tune']['n_trials']
            )
            lgbm_model.save()
            models['lightgbm'] = lgbm_model
            metrics, _ = lgbm_model.evaluate(X_test, y_test)
            logger.info(f"Tuned LightGBM RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
        
        if 'xgboost' in config['tune']['models']:
            logger.info("Tuning XGBoost model")
            xgb_model = XGBoostModel(
                random_state=config['data']['random_state']
            )
            xgb_model.tune_hyperparameters(
                X_train_main, y_train_main, 
                X_val, y_val,
                n_trials=config['tune']['n_trials']
            )
            xgb_model.save()
            models['xgboost'] = xgb_model
            metrics, _ = xgb_model.evaluate(X_test, y_test)
            logger.info(f"Tuned XGBoost RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
        
        if 'mlp' in config['tune']['models']:
            logger.info("Tuning MLP model")
            mlp_model = MLPModel(
                random_state=config['data']['random_state']
            )
            mlp_model.tune_hyperparameters(
                X_train_main, y_train_main, 
                X_val, y_val,
                n_trials=config['tune']['n_trials']
            )
            mlp_model.save()
            models['mlp'] = mlp_model
            metrics, _ = mlp_model.evaluate(X_test, y_test)
            logger.info(f"Tuned MLP RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
        
        if 'random_forest' in config['tune']['models']:
            logger.info("Tuning Random Forest model")
            rf_model = RandomForestModel(
                random_state=config['data']['random_state']
            )
            rf_model.tune_hyperparameters(
                X_train_main, y_train_main, 
                X_val, y_val,
                n_trials=config['tune']['n_trials']
            )
            rf_model.save()
            models['random_forest'] = rf_model
            metrics, _ = rf_model.evaluate(X_test, y_test)
            logger.info(f"Tuned Random Forest RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
    
    # Load models if not already trained
    if not models:
        logger.info("Loading saved models")
        models_to_load = ['lightgbm', 'xgboost', 'mlp', 'random_forest']
        
        for model_name in models_to_load:
            try:
                if model_name == 'lightgbm':
                    model = LightGBMModel()
                elif model_name == 'xgboost':
                    model = XGBoostModel()
                elif model_name == 'mlp':
                    model = MLPModel()
                elif model_name == 'random_forest':
                    model = RandomForestModel()
                
                # Load the model using the instance method
                model_path = f"models/{model_name}_model.pkl"
                model.load(model_path)
                models[model_name] = model
                logger.info(f"Loaded {model_name} model")
            except Exception as e:
                logger.warning(f"Could not load {model_name} model: {str(e)}")
    
    # Step 7: Ensemble models
    if 'ensemble' in steps_to_run:
        logger.info("Creating ensemble models")
        
        # Make sure we have at least 2 models for ensembling
        if len(models) >= 2:
            # Weighted ensemble
            logger.info("Creating weighted ensemble")
            weighted_ensemble = WeightedEnsembleModel()
            weighted_ensemble.train(models, X_train, y_train)
            weighted_ensemble.save()
            metrics, _ = weighted_ensemble.evaluate(X_test, y_test)
            logger.info(f"Weighted Ensemble RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
            
            # Stacking ensemble
            logger.info("Creating stacking ensemble")
            stacking_ensemble = StackingEnsembleModel()
            stacking_ensemble.train(models, X_train, y_train)
            stacking_ensemble.save()
            metrics, _ = stacking_ensemble.evaluate(X_test, y_test)
            logger.info(f"Stacking Ensemble RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
            
            # Stacking CV ensemble
            logger.info("Creating stacking CV ensemble")
            stacking_cv_ensemble = StackingCVEnsembleModel()
            stacking_cv_ensemble.train(models, X_train, y_train)
            stacking_cv_ensemble.save()
            metrics, _ = stacking_cv_ensemble.evaluate(X_test, y_test)
            logger.info(f"Stacking CV Ensemble RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
            
            # Blending ensemble
            logger.info("Creating blending ensemble")
            blending_ensemble = BlendingEnsembleModel()
            blending_ensemble.train(models, X_train, y_train, blend_ratio=0.2)
            blending_ensemble.save()
            metrics, _ = blending_ensemble.evaluate(X_test, y_test)
            logger.info(f"Blending Ensemble RMSE: {metrics['rmse']:.4f}, R²: {metrics['r2']:.4f}")
        else:
            logger.warning("Not enough trained models for ensembling (need at least 2)")
    
    # Step 8: Comprehensive evaluation
    if 'evaluate' in steps_to_run:
        logger.info("Comprehensive model evaluation")
        
        # Models to evaluate (base models + ensembles)
        all_models = {}
        
        # Load base models if not already in memory
        for model_name in ['lightgbm', 'xgboost', 'mlp', 'random_forest']:
            if model_name in models:
                all_models[model_name] = models[model_name]
            else:
                try:
                    if model_name == 'lightgbm':
                        model = LightGBMModel()
                    elif model_name == 'xgboost':
                        model = XGBoostModel()
                    elif model_name == 'mlp':
                        model = MLPModel()
                    elif model_name == 'random_forest':
                        model = RandomForestModel()
                        
                    # Load the model using the instance method
                    model_path = f"models/{model_name}_model.pkl"
                    model.load(model_path)
                    all_models[model_name] = model
                    logger.info(f"Loaded {model_name} model for evaluation")
                except Exception as e:
                    logger.warning(f"Could not load {model_name} model: {str(e)}")
        
        # Load ensemble models
        for ensemble_name in ['weighted_ensemble', 'stacking_ensemble', 'stacking_cv_ensemble', 'blending_ensemble']:
            try:
                if ensemble_name == 'weighted_ensemble':
                    model = WeightedEnsembleModel()
                elif ensemble_name == 'stacking_ensemble':
                    model = StackingEnsembleModel()
                elif ensemble_name == 'stacking_cv_ensemble':
                    model = StackingCVEnsembleModel()
                elif ensemble_name == 'blending_ensemble':
                    model = BlendingEnsembleModel()
                
                # Load the ensemble model
                model_path = f"models/{ensemble_name}_model.pkl"
                model.load(model_path)
                all_models[ensemble_name] = model
                logger.info(f"Loaded {ensemble_name} model for evaluation")
            except Exception as e:
                logger.warning(f"Could not load {ensemble_name} model: {str(e)}")
        
        # Evaluate all models
        results = []
        for name, model in all_models.items():
            try:
                metrics, _ = model.evaluate(X_test, y_test)
                results.append(metrics)
                logger.info(f"{name}: RMSE={metrics['rmse']:.4f}, MAE={metrics['mae']:.4f}, R²={metrics['r2']:.4f}")
            except Exception as e:
                logger.warning(f"Error evaluating {name}: {str(e)}")
        
        if results:
            # Create comparison DataFrame
            comparison_df = pd.DataFrame(results)
            
            # Sort by RMSE (lower is better)
            comparison_df = comparison_df.sort_values('rmse')
            
            # Save comparison
            os.makedirs('results', exist_ok=True)
            comparison_path = os.path.join('results', 'model_comparison.csv')
            comparison_df.to_csv(comparison_path, index=False)
            logger.info(f"Model comparison saved to {comparison_path}")
            
            # Create comparison visualization
            plt.figure(figsize=(12, 8))
            
            # RMSE
            plt.subplot(2, 2, 1)
            plt.barh(comparison_df['model'], comparison_df['rmse'], color='skyblue')
            plt.xlabel('RMSE (lower is better)')
            plt.title('RMSE by Model')
            plt.grid(axis='x', linestyle='--', alpha=0.6)
            
            # MAE
            plt.subplot(2, 2, 2)
            plt.barh(comparison_df['model'], comparison_df['mae'], color='lightgreen')
            plt.xlabel('MAE (lower is better)')
            plt.title('MAE by Model')
            plt.grid(axis='x', linestyle='--', alpha=0.6)
            
            # R²
            plt.subplot(2, 2, 3)
            plt.barh(comparison_df['model'], comparison_df['r2'], color='salmon')
            plt.xlabel('R² (higher is better)')
            plt.title('R² by Model')
            plt.grid(axis='x', linestyle='--', alpha=0.6)
            
            # MAPE
            if 'mape' in comparison_df.columns:
                plt.subplot(2, 2, 4)
                plt.barh(comparison_df['model'], comparison_df['mape'], color='orchid')
                plt.xlabel('MAPE % (lower is better)')
                plt.title('MAPE by Model')
                plt.grid(axis='x', linestyle='--', alpha=0.6)
            
            plt.tight_layout()
            
            # Save visualization
            vis_path = os.path.join('results', 'model_comparison.png')
            plt.savefig(vis_path)
            plt.close()
            logger.info(f"Model comparison visualization saved to {vis_path}")
    
    # Step 9: Model interpretation with SHAP
    if 'interpret' in steps_to_run:
        logger.info("Model interpretation")
        
        # Select the best model for interpretation (default to XGBoost if available)
        interp_model = None
        for model_name in ['lightgbm', 'xgboost']:  # Prefer tree-based models for SHAP
            if model_name in models:
                interp_model = models[model_name]
                break
        
        if interp_model is None and models:
            # Use the first available model
            interp_model = list(models.values())[0]
        
        if interp_model:
            # Get raw features if preprocessor is available
            raw_features = None
            if 'preprocess' in steps_to_run:
                raw_features = pd.read_csv(data_path).drop(columns=[config['data']['target_column']])
            
            generate_shap_explanations(
                interp_model.model, 
                X_test,
                feature_names=raw_features.columns if raw_features is not None else None
            )
        else:
            logger.warning("No model available for interpretation")
    
    # Step 10: Fairness analysis
    if 'fairness' in steps_to_run:
        logger.info("Fairness analysis")
        
        # Select the best model for fairness analysis
        if 'weighted_ensemble' in models:
            fairness_model = models['weighted_ensemble']
        elif models:
            # Use the first available model
            fairness_model = list(models.values())[0]
        else:
            fairness_model = None
        
        if fairness_model:
            # Read raw data for demographic information
            raw_data = pd.read_csv(data_path)
            
            # Identify sensitive attributes
            sensitive_attributes = config['fairness']['sensitive_attributes']
            
            # Run fairness analysis
            analyse_fairness_across_attributes(
                model=fairness_model,
                X=X_test, 
                y=y_test,
                raw_data=raw_data,
                sensitive_attributes=sensitive_attributes,
                preprocessor=preprocessor if 'preprocess' in steps_to_run else None
            )
        else:
            logger.warning("No model available for fairness analysis")
    
    # Step 11: Uncertainty quantification
    if 'uncertainty' in steps_to_run:
        logger.info("Uncertainty quantification")
        
        # Select a model for uncertainty quantification
        if 'lightgbm' in models:
            uncertainty_model = models['lightgbm']
        elif 'xgboost' in models:
            uncertainty_model = models['xgboost']
        else:
            uncertainty_model = list(models.values())[0]
        
        # Train quantile regression models
        quantify_uncertainty(
            X_train, y_train, X_test, y_test,
            model=uncertainty_model
        )
    
    logger.info("Pipeline completed successfully")
    
    return 0

def parse_args(args):
    """
    Parse command line arguments.
    
    Parameters:
    -----------
    args : list
        Command line arguments
    
    Returns:
    --------
    argparse.Namespace
        Parsed arguments
    """
    parser = argparse.ArgumentParser(description='Settlement Value Prediction System')
    parser.add_argument('--steps', nargs='+', default=['all'],
                        help='Pipeline steps to run: preprocess, train_lgbm, train_xgboost, train_mlp, train_rf, tune, ensemble, evaluate, interpret, fairness, uncertainty')
    
    return parser.parse_args(args)

if __name__ == '__main__':
    sys.exit(main())