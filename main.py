# main.py
import argparse
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, r2_score

from src.utils.config import load_config
from src.data.preprocessing import preprocess_data
from src.models.mlp_model import MLPModel
from src.models.xgboost_model import XGBoostModel
from src.models.random_forest_model import RandomForestModel  # New model
from src.models.ensemble import EnsembleModel
from src.evaluation.metrics import calculate_regression_metrics
from src.analysis.interpret_predictions import generate_shap_explanations
from src.analysis.fairness import analyze_fairness_across_attributes
from src.analysis.uncertainty import quantify_uncertainty
from src.utils.io import load_processed_data, load_raw_data




# Configure logging for cleaner output
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Suppress verbose warnings
import warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', module='sklearn.neural_network')










def setup_directories(config):
    """Create necessary directories."""
    directories = [
        config['paths']['processed_data'],
        config['paths']['models'],
        config['paths']['results'],
        os.path.join(config['paths']['results'], 'models'),
        os.path.join(config['paths']['results'], 'analysis'),
        os.path.join(config['paths']['results'], 'explanations'),
        os.path.join(config['paths']['results'], 'uncertainty'),
        os.path.join(config['paths']['results'], 'fairness'),
        os.path.join(config['paths']['results'], 'optimization')
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

def run_pipeline(config, steps):
    """Run the machine learning pipeline with specified steps."""
    
    # Create directories
    setup_directories(config)
    
    # 1. Preprocessing
    if 'preprocess' in steps:
        print("\n=== Enhanced Data Preprocessing ===")
        preprocess_data(
            config['data']['input_path'], 
            target_column=config['data']['target_column'],
            test_size=config['data']['test_size'],
            random_state=config['data']['random_state']
        )
    
    # Load data for subsequent steps
    X_train, X_test, y_train, y_test = load_processed_data(config['paths']['processed_data'])
    
    # Split train data for validation
    from sklearn.model_selection import train_test_split
    X_train_split, X_val, y_train_split, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=config['data']['random_state']
    )
    
    # 2. Train models
    models = {}
    
    if 'train_mlp' in steps:
        print("\n=== Training Enhanced MLP Model ===")
        mlp_model = MLPModel(
            hidden_layers=(100, 100, 50),  # Default to deeper architecture
            max_iter=1000,
            activation='relu',
            alpha=0.001,  # Regularization
            learning_rate_init=0.001, 
            random_state=config['data']['random_state']
        )
        if 'tune' in steps:
            mlp_model.tune_hyperparameters(X_train_split, y_train_split, X_val, y_val, n_trials=50)
        else:
            mlp_model.train(X_train, y_train)
        mlp_model.save()
        models['mlp'] = mlp_model
    
    if 'train_xgboost' in steps:
        print("\n=== Training Enhanced XGBoost Model ===")
        xgb_model = XGBoostModel(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,  # Default to slower learning rate
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=config['data']['random_state']
        )
        if 'tune' in steps:
            xgb_model.tune_hyperparameters(X_train_split, y_train_split, X_val, y_val, n_trials=50)
        else:
            xgb_model.train(X_train, y_train)
        xgb_model.save()
        models['xgboost'] = xgb_model
    
    if 'train_random_forest' in steps:
        print("\n=== Training Random Forest Model ===")
        rf_model = RandomForestModel(
            n_estimators=200,
            max_depth=None,
            min_samples_split=2,
            min_samples_leaf=1,
            random_state=config['data']['random_state']
        )
        if 'tune' in steps:
            rf_model.tune_hyperparameters(X_train_split, y_train_split, X_val, y_val, n_trials=50)
        else:
            rf_model.train(X_train, y_train)
        rf_model.save()
        models['random_forest'] = rf_model
    
    # 3. Create ensembles
    if 'ensemble' in steps and len(models) >= 2:
        print("\n=== Creating Enhanced Ensemble Models ===")
        
        # Create base_models dictionary with only the non-ensemble models
        base_models = {name: model for name, model in models.items() 
                      if not name.endswith('_ensemble')}
        
        print(f"Creating ensembles using {len(base_models)} base models: {list(base_models.keys())}")
        
        # Simple weighted ensemble
        weighted_ensemble = EnsembleModel(base_models, ensemble_type='weighted')
        weighted_ensemble.train(X_train, y_train, X_val, y_val)
        weighted_ensemble.save()
        models['weighted_ensemble'] = weighted_ensemble
        
        # Stacking ensemble
        stacking_ensemble = EnsembleModel(base_models, ensemble_type='stacking')
        stacking_ensemble.train(X_train, y_train, X_val, y_val)
        stacking_ensemble.save()
        models['stacking_ensemble'] = stacking_ensemble
        
        # New: Stacking with cross-validation (prevents data leakage)
        stacking_cv_ensemble = EnsembleModel(base_models, ensemble_type='stacking_cv')
        stacking_cv_ensemble.train(X_train, y_train)
        stacking_cv_ensemble.save()
        models['stacking_cv_ensemble'] = stacking_cv_ensemble
        
        # New: Blending ensemble
        blending_ensemble = EnsembleModel(base_models, ensemble_type='blending')
        blending_ensemble.train(X_train, y_train, X_val, y_val)
        blending_ensemble.save()
        models['blending_ensemble'] = blending_ensemble
    
    # 4. Evaluate models
    if 'evaluate' in steps:
        print("\n=== Evaluating Models ===")
        results = []
        predictions = {}
        
        for name, model in models.items():
            print(f"\nEvaluating {name} model...")
            metrics, y_pred = model.evaluate(X_test, y_test)
            results.append(metrics)
            predictions[name] = y_pred
            
            # Additional evaluation
            rmse = np.sqrt(mean_squared_error(y_test, y_pred))
            r2 = r2_score(y_test, y_pred)
            print(f"RMSE: {rmse:.2f}, R²: {r2:.4f}")
        
        # Create comparison table
        comparison_df = pd.DataFrame(results)
        comparison_df.to_csv(os.path.join(config['paths']['results'], 'model_comparison.csv'), index=False)
        print("\nModel comparison saved to results/model_comparison.csv")
        
        # Create performance visualization
        create_performance_visualization(comparison_df, os.path.join(config['paths']['results'], 'model_comparison.png'))
        
        # If we have multiple models, create prediction correlation analysis
        if len(predictions) > 1:
            create_prediction_correlation_analysis(predictions, os.path.join(config['paths']['results'], 'prediction_correlation.png'))
    
    # 5. Model interpretation
    if 'interpret' in steps:
        print("\n=== Generating Model Explanations ===")
        # Load original data to get feature names
        _, _, df = load_raw_data(config['data']['input_path'])
        feature_names = df.drop(columns=[config['data']['target_column']]).columns.tolist()
        
        # SHAP explanations for each model type
        for name, model in models.items():
            # Only generate SHAP for tree-based models and the best ensemble
            if name in ['xgboost', 'random_forest', 'stacking_cv_ensemble']:
                try:
                    print(f"Generating SHAP explanations for {name}...")
                    if hasattr(model, 'model'):
                        base_model = model.model
                        if name.endswith('_ensemble'):
                            # For ensembles, use the meta-model or first base model
                            if hasattr(model, 'meta_model') and model.meta_model is not None:
                                base_model = model.meta_model
                            elif len(model.base_models) > 0:
                                first_model_name = list(model.base_models.keys())[0]
                                base_model = model.base_models[first_model_name].model
                        
                        generate_shap_explanations(
                            base_model, 
                            X_test, 
                            feature_names=feature_names,
                            output_dir=f"results/explanations/{name}"
                        )
                except Exception as e:
                    print(f"Error generating SHAP for {name}: {e}")
    
    # 6. Fairness analysis
    if 'fairness' in steps:
        print("\n=== Analyzing Model Fairness ===")
        # Get best model predictions (preferring stacking_cv_ensemble if available)
        best_model_name = 'stacking_cv_ensemble' if 'stacking_cv_ensemble' in models else 'weighted_ensemble'
        if best_model_name not in models:
            best_model_name = next(iter(models.keys()))
        
        best_model = models[best_model_name]
        y_pred = best_model.predict(X_test)
        
        print(f"Using {best_model_name} for fairness analysis")
        
        # Load original data
        raw_df = pd.read_csv(config['data']['input_path'])
        
        # Get the actual column names from dataset
        categorical_cols = raw_df.select_dtypes(include=['object', 'category']).columns.tolist()
        print(f"Available categorical columns: {categorical_cols}")
        
        # Define sensitive attributes based on the actual columns in dataset
        sensitive_attributes = []
        
        # Try to add common sensitive attributes if they exist
        potential_attributes = [
            'Gender', 'AccidentType', 'Vehicle Type', 'Injury_Prognosis', 
            'Weather Conditions', 'Dominant injury', 'Whiplash'
        ]
        
        for attr in potential_attributes:
            if attr in raw_df.columns:
                sensitive_attributes.append(attr)
                print(f"Found sensitive attribute: {attr}")
        
        if not sensitive_attributes:
            # If none of the common attributes are found, use the first few categorical columns
            for col in categorical_cols[:3]:  # Use the first 3 categorical columns
                if col != config['data']['target_column']:
                    sensitive_attributes.append(col)
                    print(f"Using categorical column as sensitive attribute: {col}")
        
        if sensitive_attributes:
            # Analyze fairness
            analyze_fairness_across_attributes(y_test, y_pred, raw_df, sensitive_attributes)
        else:
            print("No suitable sensitive attributes found for fairness analysis.")
        
    # 7. Uncertainty quantification
    if 'uncertainty' in steps:
        print("\n=== Quantifying Prediction Uncertainty ===")
        # Preferring XGBoost for quantile regression, fallback to best model
        uncertainty_model = models.get('xgboost', next(iter(models.values()))).model
        
        # Use model with best average performance if we have ensembles
        if 'stacking_cv_ensemble' in models or 'weighted_ensemble' in models:
            best_model_name = 'stacking_cv_ensemble' if 'stacking_cv_ensemble' in models else 'weighted_ensemble'
            print(f"Using {best_model_name} for prediction base values")
            
            # Get base predictions to calibrate uncertainty bounds
            base_predictions = models[best_model_name].predict(X_test)
            
            # Quantify uncertainty using XGBoost but calibrated to best model
            quantify_uncertainty(
                X_train, y_train, 
                X_test, y_test, 
                uncertainty_model,
                base_predictions=base_predictions
            )
        else:
            # Regular uncertainty quantification
            quantify_uncertainty(
                X_train, y_train, 
                X_test, y_test, 
                uncertainty_model
            )
        
    print("\n=== Pipeline completed successfully ===")
    return models

def create_performance_visualization(comparison_df, output_path):
    """Create visualization of model performance metrics."""
    try:
        # Prepare data
        models = comparison_df['model'].tolist()
        rmse = comparison_df['rmse'].tolist()
        r2 = comparison_df['r2'].tolist()
        
        # Sort by RMSE (ascending)
        sorted_idx = np.argsort(rmse)
        sorted_models = [models[i] for i in sorted_idx]
        sorted_rmse = [rmse[i] for i in sorted_idx]
        sorted_r2 = [r2[i] for i in sorted_idx]
        
        # Create figure with two subplots
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # RMSE plot (lower is better)
        bars1 = ax1.bar(sorted_models, sorted_rmse, color='skyblue')
        ax1.set_title('Model Comparison - RMSE (lower is better)')
        ax1.set_xlabel('Model')
        ax1.set_ylabel('RMSE')
        ax1.grid(axis='y', alpha=0.3)
        ax1.set_xticklabels(sorted_models, rotation=45, ha='right')
        
        # Add value labels
        for i, bar in enumerate(bars1):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height + 5,
                    f'{sorted_rmse[i]:.2f}', ha='center', va='bottom')
        
        # R² plot (higher is better)
        # Sort by R² (descending)
        sorted_idx_r2 = np.argsort([-x for x in r2])
        sorted_models_r2 = [models[i] for i in sorted_idx_r2]
        sorted_r2_desc = [r2[i] for i in sorted_idx_r2]
        
        bars2 = ax2.bar(sorted_models_r2, sorted_r2_desc, color='lightgreen')
        ax2.set_title('Model Comparison - R² (higher is better)')
        ax2.set_xlabel('Model')
        ax2.set_ylabel('R²')
        ax2.grid(axis='y', alpha=0.3)
        ax2.set_xticklabels(sorted_models_r2, rotation=45, ha='right')
        
        # Add value labels
        for i, bar in enumerate(bars2):
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                    f'{sorted_r2_desc[i]:.4f}', ha='center', va='bottom')
        
        plt.tight_layout()
        plt.savefig(output_path)
        plt.close()
        
        print(f"Performance visualization saved to {output_path}")
    except Exception as e:
        print(f"Error creating performance visualization: {e}")

def create_prediction_correlation_analysis(predictions, output_path):
    """Create correlation analysis of model predictions."""
    try:
        # Convert predictions to DataFrame
        pred_df = pd.DataFrame(predictions)
        
        # Calculate correlation matrix
        corr_matrix = pred_df.corr()
        
        # Create correlation heatmap
        plt.figure(figsize=(10, 8))
        plt.imshow(corr_matrix, cmap='coolwarm', interpolation='none', aspect='equal')
        plt.colorbar(label='Correlation')
        plt.title('Correlation Between Model Predictions')
        
        # Add correlation values
        for i in range(len(corr_matrix)):
            for j in range(len(corr_matrix)):
                plt.text(j, i, f'{corr_matrix.iloc[i, j]:.2f}',
                        ha='center', va='center', color='white')
        
        # Set axis labels
        plt.xticks(range(len(corr_matrix)), corr_matrix.columns, rotation=45, ha='right')
        plt.yticks(range(len(corr_matrix)), corr_matrix.index)
        
        plt.tight_layout()
        plt.savefig(output_path)
        plt.close()
        
        print(f"Prediction correlation analysis saved to {output_path}")
        
        # Also look for highly correlated models (candidates for removal)
        print("\nModel correlation analysis:")
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                col1, col2 = corr_matrix.columns[i], corr_matrix.columns[j]
                correlation = corr_matrix.loc[col1, col2]
                if correlation > 0.95:
                    print(f"  High correlation ({correlation:.4f}) between {col1} and {col2}")
                    print(f"  Consider removing one of these models from the ensemble")
    except Exception as e:
        print(f"Error creating prediction correlation analysis: {e}")

def main():
    """Parse arguments and run pipeline."""
    parser = argparse.ArgumentParser(description='Run enhanced settlement prediction ML pipeline')
    parser.add_argument('--config', type=str, default='config/default.yaml',
                       help='Path to configuration file')
    parser.add_argument('--steps', type=str, default='all',
                       help='Comma-separated list of steps to run')
    
    args = parser.parse_args()
    config = load_config(args.config)
    
    # Parse steps
    if args.steps.lower() == 'all':
        steps = ['preprocess', 'train_mlp', 'train_xgboost', 'train_random_forest', 'tune',
                'ensemble', 'evaluate', 'interpret', 'fairness', 'uncertainty']
    else:
        steps = [step.strip() for step in args.steps.split(',')]
    
    # Run pipeline
    run_pipeline(config, steps)

if __name__ == "__main__":
    main()