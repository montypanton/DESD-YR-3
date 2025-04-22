# main.py
import argparse
import os
import pandas as pd
from src.utils.config import load_config
from src.data.preprocessing import preprocess_data
from src.models.mlp_model import MLPModel
from src.models.xgboost_model import XGBoostModel
from src.models.ensemble import EnsembleModel
from src.evaluation.metrics import calculate_regression_metrics
from src.analysis.interpret_predictions import generate_shap_explanations
from src.analysis.fairness import analyze_fairness_across_attributes
from src.analysis.uncertainty import quantify_uncertainty
from src.utils.io import load_processed_data, load_raw_data

def setup_directories(config):
    """Create necessary directories."""
    directories = [
        config['paths']['processed_data'],
        config['paths']['models'],
        config['paths']['results'],
        os.path.join(config['paths']['results'], 'models'),
        os.path.join(config['paths']['results'], 'analysis')
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

def run_pipeline(config, steps):
    """Run the machine learning pipeline with specified steps."""
    
    # Create directories
    setup_directories(config)
    
    # 1. Preprocessing
    if 'preprocess' in steps:
        print("\n=== Data Preprocessing ===")
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
        print("\n=== Training MLP Model ===")
        mlp_model = MLPModel(**config['models']['mlp'])
        if 'tune' in steps:
            mlp_model.tune_hyperparameters(X_train_split, y_train_split, X_val, y_val)
        else:
            mlp_model.train(X_train, y_train)
        mlp_model.save()
        models['mlp'] = mlp_model
    
    if 'train_xgboost' in steps:
        print("\n=== Training XGBoost Model ===")
        xgb_model = XGBoostModel(**config['models']['xgboost'])
        if 'tune' in steps:
            xgb_model.tune_hyperparameters(X_train_split, y_train_split, X_val, y_val)
        else:
            xgb_model.train(X_train, y_train)
        xgb_model.save()
        models['xgboost'] = xgb_model
    
    # 3. Create ensembles
    if 'ensemble' in steps and len(models) >= 2:
        print("\n=== Creating Ensemble Models ===")
        
        # Create base_models dictionary with only the non-ensemble models
        base_models = {name: model for name, model in models.items() 
                      if not name.endswith('_ensemble')}
        
        print(f"Creating ensembles using {len(base_models)} base models: {list(base_models.keys())}")
        
        # Simple weighted ensemble
        weighted_ensemble = EnsembleModel(base_models, ensemble_type='weighted')
        weighted_ensemble.train(X_train, y_train, X_val, y_val)
        weighted_ensemble.save()
        
        # Stacking ensemble
        stacking_ensemble = EnsembleModel(base_models, ensemble_type='stacking')
        stacking_ensemble.train(X_train, y_train)
        stacking_ensemble.save()
        
        # Add ensembles to models
        models['weighted_ensemble'] = weighted_ensemble
        models['stacking_ensemble'] = stacking_ensemble
    
    # 4. Evaluate models
    if 'evaluate' in steps:
        print("\n=== Evaluating Models ===")
        results = []
        
        for name, model in models.items():
            print(f"\nEvaluating {name} model...")
            metrics, _ = model.evaluate(X_test, y_test)
            results.append(metrics)
        
        # Create comparison table
        comparison_df = pd.DataFrame(results)
        comparison_df.to_csv(os.path.join(config['paths']['results'], 'model_comparison.csv'), index=False)
        print("\nModel comparison saved to results/model_comparison.csv")
    
    # 5. Model interpretation
    if 'interpret' in steps and 'xgboost' in models:
        print("\n=== Generating Model Explanations ===")
        # Load original data to get feature names
        _, _, df = load_raw_data(config['data']['input_path'])
        feature_names = df.drop(columns=[config['data']['target_column']]).columns.tolist()
        
        # Generate SHAP explanations
        generate_shap_explanations(
            models['xgboost'].model, 
            X_test, 
            feature_names=feature_names
        )
    
    # 6. Fairness analysis
    if 'fairness' in steps:
        print("\n=== Analyzing Model Fairness ===")
        # Get best model predictions
        best_model = models.get('weighted_ensemble', next(iter(models.values())))
        y_pred = best_model.predict(X_test)
        
        # Load original data
        raw_df = pd.read_csv(config['data']['input_path'])
        
        # Get the actual column names from your dataset
        categorical_cols = raw_df.select_dtypes(include=['object', 'category']).columns.tolist()
        print(f"Available categorical columns: {categorical_cols}")
        
        # Define sensitive attributes based on the actual columns in your dataset
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
        if 'uncertainty' in steps and 'xgboost' in models:
            print("\n=== Quantifying Prediction Uncertainty ===")
            quantify_uncertainty(X_train, y_train, X_test, y_test, models['xgboost'].model)
        
        print("\n=== Pipeline completed successfully ===")

def main():
    """Parse arguments and run pipeline."""
    parser = argparse.ArgumentParser(description='Run settlement prediction ML pipeline')
    parser.add_argument('--config', type=str, default='config/default.yaml',
                       help='Path to configuration file')
    parser.add_argument('--steps', type=str, default='all',
                       help='Comma-separated list of steps to run')
    
    args = parser.parse_args()
    config = load_config(args.config)
    
    # Parse steps
    if args.steps.lower() == 'all':
        steps = ['preprocess', 'train_mlp', 'train_xgboost', 'tune',
                'ensemble', 'evaluate', 'interpret', 'fairness', 'uncertainty']
    else:
        steps = [step.strip() for step in args.steps.split(',')]
    
    # Run pipeline
    run_pipeline(config, steps)

if __name__ == "__main__":
    main()