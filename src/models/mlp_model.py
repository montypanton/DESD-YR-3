import numpy as np
import pandas as pd
import joblib
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import optuna
from sklearn.model_selection import train_test_split

from .base_model import BaseModel

class MLPModel(BaseModel):
    """MLP regression model implementation."""
    
    def __init__(self, hidden_layers=(100, 50), max_iter=1000, random_state=42, **params):
        super().__init__(model_name="mlp", random_state=random_state)
        self.hidden_layers = hidden_layers
        self.max_iter = max_iter
        self.params = params
    
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the MLP model."""
        print("Training MLP model...")
        print(f"MLP architecture: {self.hidden_layers}")
        
        if X_val is None or y_val is None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.random_state
            )
        
        # Create and train mlp
        self.model = MLPRegressor(
            hidden_layer_sizes=self.hidden_layers,
            activation='relu',
            solver='adam',
            alpha=0.0001,
            batch_size='auto',
            learning_rate='adaptive',
            learning_rate_init=0.001,
            max_iter=self.max_iter,
            early_stopping=True,
            validation_fraction=0.1,
            random_state=self.random_state,
            verbose=True,
            **self.params
        )
        
        # Combine training and validation data for sklearn's internal validation
        X_train_combined = np.vstack((X_train, X_val))
        y_train_combined = np.concatenate((y_train, y_val))
        
        self.model.fit(X_train_combined, y_train_combined)
        
        print(f"MLP model training complete. Iterations: {self.model.n_iter_}")
        
        return self
    
    def tune_hyperparameters(self, X_train, y_train, X_val, y_val, n_trials=30):
        """Tune hyperparameters using Optuna."""
        def objective(trial):
            # Sample hyperparameters
            n_layers = trial.suggest_int("n_layers", 1, 3)
            hidden_layers = tuple(
                trial.suggest_int(f"units_layer_{i}", 20, 200) for i in range(n_layers)
            )
            
            # Create and train model
            model = MLPRegressor(
                hidden_layer_sizes=hidden_layers,
                activation='relu',
                solver='adam',
                alpha=0.0001,
                batch_size='auto',
                learning_rate='adaptive',
                learning_rate_init=0.001,
                max_iter=200,  # Reduced for faster optimization
                early_stopping=True,
                validation_fraction=0.1,
                random_state=self.random_state,
                verbose=False
            )
            
            # Combine training and validation data for sklearn's internal validation
            X_train_combined = np.vstack((X_train, X_val))
            y_train_combined = np.concatenate((y_train, y_val))
            
            model.fit(X_train_combined, y_train_combined)
            
            # Evaluate on validation set
            val_preds = model.predict(X_val)
            val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
            
            return val_rmse

        # Run hyperparameter optimization
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)

        print("Best Params:", study.best_params)

        # Extract best parameters
        best_n_layers = study.best_params['n_layers']
        best_hidden_layers = tuple(
            study.best_params[f'units_layer_{i}'] for i in range(best_n_layers)
        )
        
        self.hidden_layers = best_hidden_layers
        
        # Train final model with optimized hyperparameters
        return self.train(X_train, y_train, X_val, y_val)