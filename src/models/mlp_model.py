import numpy as np
import pandas as pd
import joblib
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import optuna
from sklearn.model_selection import train_test_split, KFold
import os

from .base_model import BaseModel


import matplotlib
matplotlib.use('Agg')



class MLPModel(BaseModel):
    """Enhanced MLP regression model implementation with improved architecture and regularization."""
    
    def __init__(self, hidden_layers=(100, 100, 50), max_iter=1000, activation='relu', 
                alpha=0.0001, learning_rate_init=0.001, random_state=42, **params):
        """Initialize with better defaults for faster training."""
        super().__init__(model_name="mlp", random_state=random_state)
        self.hidden_layers = hidden_layers
        self.max_iter = max_iter
        self.activation = activation
        self.alpha = alpha  # L2 regularization parameter
        self.learning_rate_init = learning_rate_init
        self.params = {'batch_size': 128}  # Larger batch size for faster training
        self.params.update(params)  # Add any additional params
        self.training_history = None
        
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the MLP model with early stopping and learning curve tracking."""
        print("Training MLP model...")
        print(f"MLP architecture: {self.hidden_layers}")
        
        if X_val is None or y_val is None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.random_state
            )
        
        # Create parameters dict from attributes, but allow self.params to override them
        params = {
            'hidden_layer_sizes': self.hidden_layers,
            'activation': self.activation,
            'solver': 'adam',
            'alpha': self.alpha,
            'learning_rate': 'adaptive',
            'learning_rate_init': self.learning_rate_init,
            'power_t': 0.5,
            'max_iter': self.max_iter,
            'shuffle': True,
            'early_stopping': True,
            'validation_fraction': 0.1,
            'beta_1': 0.9,
            'beta_2': 0.999,
            'epsilon': 1e-8,
            'n_iter_no_change': 5,  # Reduced from 10 for faster convergence
            'max_fun': 15000,
            'random_state': self.random_state,
            'verbose': True,
            'warm_start': False,
            'momentum': 0.9,
            'nesterovs_momentum': True,
        }
        
        # Override with any params from self.params
        params.update(self.params)
        
        # Create and train the model with combined parameters
        self.model = MLPRegressor(**params)
        
        # Fit the model
        self.model.fit(X_train, y_train)
        
        # Track validation scores after training
        val_pred = self.model.predict(X_val)
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
        val_r2 = r2_score(y_val, val_pred)
        
        print(f"Validation RMSE: {val_rmse:.2f}, R²: {val_r2:.4f}")
        
        # Create learning curve plots if loss curve is available
        self._plot_learning_curves()
        
        print(f"MLP model training complete. Iterations: {self.model.n_iter_}")
        
        return self

    def tune_hyperparameters(self, X_train, y_train, X_val, y_val, n_trials=50):  # Increased from 30
        """Tune hyperparameters using Optuna with more comprehensive search space."""
        def objective(trial):
            # Sample more comprehensive hyperparameters
            n_layers = trial.suggest_int("n_layers", 1, 5)  # Allow for deeper networks
            
            # Sample layer sizes with decreasing width
            hidden_layers = []
            first_layer_size = trial.suggest_int("first_layer_size", 50, 300)
            hidden_layers.append(first_layer_size)
            
            # Create pyramid-like architecture
            for i in range(1, n_layers):
                layer_size = trial.suggest_int(f"layer_{i}_size", 
                                             max(20, first_layer_size // (i+1)), 
                                             first_layer_size)
                hidden_layers.append(layer_size)
            
            # Sample additional hyperparameters
            activation = trial.suggest_categorical("activation", ["relu", "tanh"])
            alpha = trial.suggest_float("alpha", 1e-6, 1e-2, log=True)  # Regularization
            learning_rate = trial.suggest_float("learning_rate", 1e-4, 1e-1, log=True)
            batch_size = trial.suggest_categorical("batch_size", [32, 64, 128, 256, 'auto'])
            
            # Create and train model
            model = MLPRegressor(
                hidden_layer_sizes=tuple(hidden_layers),
                activation=activation,
                solver='adam',
                alpha=alpha,
                batch_size=batch_size,
                learning_rate='adaptive',
                learning_rate_init=learning_rate,
                max_iter=300,  # Reduced for faster optimization
                early_stopping=True,
                validation_fraction=0.1,
                random_state=self.random_state,
                verbose=False
            )
            
            # Use cross-validation for more robust evaluation
            kf = KFold(n_splits=3, shuffle=True, random_state=self.random_state)
            
            cv_scores = []
            for train_idx, test_idx in kf.split(X_train):
                X_fold_train, y_fold_train = X_train[train_idx], y_train[train_idx]
                X_fold_val, y_fold_val = X_train[test_idx], y_train[test_idx]
                
                try:
                    model.fit(X_fold_train, y_fold_train)
                    y_pred = model.predict(X_fold_val)
                    rmse = np.sqrt(mean_squared_error(y_fold_val, y_pred))
                    cv_scores.append(rmse)
                except Exception as e:
                    print(f"Error during cross-validation: {e}")
                    return float('inf')  # Return a large value on error
            
            # Return mean RMSE if we have scores, otherwise infinity
            return np.mean(cv_scores) if cv_scores else float('inf')

        # Run hyperparameter optimization
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)

        print("Best Params:", study.best_params)
        
        # Visualize parameter importance
        try:
            os.makedirs("results/optimization", exist_ok=True)
            
            # Plot optimization history
            plt.figure(figsize=(10, 6))
            optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.title('MLP Hyperparameter Optimization History')
            plt.tight_layout()
            plt.savefig("results/optimization/mlp_optimization_history.png")
            plt.close()
            
            # Plot parameter importances
            plt.figure(figsize=(12, 8))
            optuna.visualization.matplotlib.plot_param_importances(study)
            plt.title('MLP Hyperparameter Importance')
            plt.tight_layout()
            plt.savefig("results/optimization/mlp_param_importances.png")
            plt.close()
            
            print("Optimization visualizations saved to results/optimization/ directory")
        except Exception as e:
            print(f"Error creating optimization visualizations: {e}")

        # Extract best parameters
        best_params = dict(study.best_params)
        
        # Convert from first_layer_size and layer_x_size to hidden_layers tuple
        n_layers = best_params.pop('n_layers')
        first_layer_size = best_params.pop('first_layer_size')
        
        hidden_layers = [first_layer_size]
        for i in range(1, n_layers):
            if f"layer_{i}_size" in best_params:
                hidden_layers.append(best_params.pop(f"layer_{i}_size"))
        
        self.hidden_layers = tuple(hidden_layers)
        
        # Set other hyperparameters
        if 'activation' in best_params:
            self.activation = best_params.pop('activation')
        if 'alpha' in best_params:
            self.alpha = best_params.pop('alpha')
        if 'learning_rate' in best_params:
            self.learning_rate_init = best_params.pop('learning_rate')
        
        # Store remaining parameters
        self.params = best_params
        
        # Train final model with optimized hyperparameters
        return self.train(X_train, y_train, X_val, y_val)
    
    def _plot_learning_curves(self):
        """Plot learning curves from model training."""
        if not hasattr(self, 'model') or self.model is None:
            print("Model not trained yet")
            return
            
        try:
            # Create directory
            os.makedirs("results/models/mlp", exist_ok=True)
            
            # Plot loss curve if available
            if hasattr(self.model, 'loss_curve_'):
                plt.figure(figsize=(10, 6))
                plt.plot(self.model.loss_curve_)
                plt.xlabel('Iterations')
                plt.ylabel('Loss')
                plt.title('MLP Training Loss Curve')
                plt.grid(True, alpha=0.3)
                plt.tight_layout()
                plt.savefig("results/models/mlp/loss_curve.png")
                plt.close()
                print("Loss curve saved to results/models/mlp/loss_curve.png")
                
            # Plot validation scores if available
            if hasattr(self.model, 'validation_scores_'):
                plt.figure(figsize=(10, 6))
                plt.plot(self.model.validation_scores_)
                plt.xlabel('Iterations')
                plt.ylabel('Validation Score')
                plt.title('MLP Validation Scores')
                plt.grid(True, alpha=0.3)
                plt.tight_layout()
                plt.savefig("results/models/mlp/validation_scores.png")
                plt.close()
                print("Validation scores saved to results/models/mlp/validation_scores.png")
                
        except Exception as e:
            print(f"Error creating learning curve plots: {e}")