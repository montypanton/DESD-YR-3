import numpy as np
import pandas as pd
import os
import joblib

def load_processed_data(base_path='data/processed_data'):
    """Load processed training and test data."""
    X_train = np.load(os.path.join(base_path, 'X_train_processed.npy'))
    X_test = np.load(os.path.join(base_path, 'X_test_processed.npy'))
    y_train = np.load(os.path.join(base_path, 'y_train.npy'))
    y_test = np.load(os.path.join(base_path, 'y_test.npy'))
    return X_train, X_test, y_train, y_test

def load_raw_data(file_path, target_column='SettlementValue'):
    """Load raw data from CSV file."""
    df = pd.read_csv(file_path)
    if target_column in df.columns:
        X = df.drop(columns=[target_column])
        y = df[target_column]
        return X, y, df
    return df, None, df

def load_models(model_names=None):
    """Load trained models by name."""
    if model_names is None:
        model_names = ['xgboost', 'mlp']
    
    models = {}
    model_classes = {
        'xgboost': 'XGBoostModel',
        'lightgbm': 'LightGBMModel',
        'mlp': 'MLPModel',
        'random_forest': 'RandomForestModel'
    }
    
    for name in model_names:
        try:
            # Import the model class dynamically
            model_class_name = model_classes.get(name)
            if not model_class_name:
                print(f"Unknown model type: {name}")
                continue
                
            # Import the model class
            module = __import__(f"src.models.{name}_model", fromlist=[model_class_name])
            model_class = getattr(module, model_class_name)
            
            # Use the load class method
            models[name] = model_class.load(f'models/{name}_model.pkl')
        except (FileNotFoundError, ImportError, AttributeError) as e:
            print(f"Could not load {name} model: {str(e)}")
    
    return models