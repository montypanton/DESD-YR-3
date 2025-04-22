import xgboost as xgb
from xgboost import callback
import numpy as np
import optuna
from .base_model import BaseModel
from sklearn.model_selection import train_test_split

class XGBoostModel(BaseModel):
    """XGBoost regression model implementation."""
    
    def __init__(self, random_state=42, **params):
        super().__init__(model_name="xgboost", random_state=random_state)
        self.params = params
    
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the XGBoost model."""
        if X_val is None or y_val is None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.random_state
            )
        
        # Set default parameters if not provided
        if not self.params:
            self.params = {
                'objective': 'reg:squarederror',
                'n_estimators': 200,
                'max_depth': 6,
                'learning_rate': 0.1,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'random_state': self.random_state
            }
        
        # Train model (without early stopping for now)
        self.model = xgb.XGBRegressor(**self.params)
        self.model.fit(X_train, y_train)
        
        return self
    
    def tune_hyperparameters(self, X_train, y_train, X_val, y_val, n_trials=20):
        """Tune hyperparameters using Optuna."""
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'objective': 'reg:squarederror',
                'random_state': self.random_state
            }
            
            model = xgb.XGBRegressor(**params)
            
            # Basic fit without early stopping
            model.fit(X_train, y_train)
            
            # Evaluate on validation set
            preds = model.predict(X_val)
            rmse = np.sqrt(np.mean((y_val - preds) ** 2))
            return rmse
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)
        
        print(f"Best hyperparameters: {study.best_params}")
        self.params = {**study.best_params, 'objective': 'reg:squarederror', 
                       'random_state': self.random_state}
        
        # Train with best params
        return self.train(X_train, y_train, X_val, y_val)