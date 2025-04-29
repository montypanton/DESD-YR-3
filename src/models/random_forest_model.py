import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import KFold, train_test_split
import optuna

from .base_model import BaseModel

import matplotlib
matplotlib.use('Agg')



class RandomForestModel(BaseModel):
    """Random Forest regression model implementation."""
    
    def __init__(self, n_estimators=200, max_depth=None, min_samples_split=2, 
                 min_samples_leaf=1, random_state=42, **params):
        super().__init__(model_name="random_forest", random_state=random_state)
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.params = params
        self.feature_importances_ = None
    
# File: src/models/random_forest_model.py

    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the Random Forest model."""
        print("Training Random Forest model...")
        print(f"RF parameters: n_estimators={self.n_estimators}, max_depth={self.max_depth}")
        
        if X_val is None or y_val is None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.random_state
            )
        
        # Create parameters dict from attributes, but allow self.params to override them
        params = {
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'min_samples_split': self.min_samples_split,
            'min_samples_leaf': self.min_samples_leaf,
            'max_features': 'sqrt',  # Traditional RF uses sqrt(n_features)
            'bootstrap': True,
            'n_jobs': -1,  # Use all available processors
            'random_state': self.random_state,
            'verbose': 0,
            'warm_start': False,
        }
        
        # Override with any params from self.params
        params.update(self.params)
        
        # Only set oob_score if bootstrap is True
        if params.get('bootstrap', True):
            params['oob_score'] = True
        else:
            # Ensure oob_score is False if bootstrap is False
            params['oob_score'] = False
        
        # Create and train model with combined parameters
        self.model = RandomForestRegressor(**params)
        
        # Fit the model
        self.model.fit(X_train, y_train)
        
        # Store feature importances
        self.feature_importances_ = self.model.feature_importances_
        
        # Evaluate on validation set
        val_pred = self.model.predict(X_val)
        val_rmse = np.sqrt(np.mean((y_val - val_pred) ** 2))
        val_r2 = 1 - np.sum((y_val - val_pred) ** 2) / np.sum((y_val - np.mean(y_val)) ** 2)
        
        print(f"Validation RMSE: {val_rmse:.2f}")
        print(f"Validation R²: {val_r2:.4f}")
        
        # Only print OOB score if available
        if params.get('oob_score', False):
            print(f"Out-of-bag score: {self.model.oob_score_:.4f}")
        
        # Plot feature importance
        self._plot_feature_importance()
        
        return self
    
    def tune_hyperparameters(self, X_train, y_train, X_val, y_val, n_trials=50):
        """Tune hyperparameters using Optuna."""
        def objective(trial):
            # Sample hyperparameters
            n_estimators = trial.suggest_int('n_estimators', 50, 500)
            max_depth = trial.suggest_int('max_depth', 5, 30)
            min_samples_split = trial.suggest_int('min_samples_split', 2, 20)
            min_samples_leaf = trial.suggest_int('min_samples_leaf', 1, 10)
            max_features = trial.suggest_categorical('max_features', ['sqrt', 'log2', None])
            bootstrap = trial.suggest_categorical('bootstrap', [True, False])
            
            # Create model with sampled hyperparameters
            model = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                min_samples_leaf=min_samples_leaf,
                max_features=max_features,
                bootstrap=bootstrap,
                oob_score=bootstrap,  # Only if bootstrap=True
                n_jobs=-1,
                random_state=self.random_state
            )
            
            # Use cross-validation for more robust evaluation
            kf = KFold(n_splits=3, shuffle=True, random_state=self.random_state)
            
            # Convert to numpy arrays to avoid pandas indexing issues
            X_train_array = X_train.values if hasattr(X_train, 'values') else X_train
            y_train_array = y_train.values if hasattr(y_train, 'values') else y_train
            
            cv_scores = []
            for train_idx, test_idx in kf.split(X_train_array):
                X_fold_train, y_fold_train = X_train_array[train_idx], y_train_array[train_idx]
                X_fold_val, y_fold_val = X_train_array[test_idx], y_train_array[test_idx]
                
                model.fit(X_fold_train, y_fold_train)
                y_pred = model.predict(X_fold_val)
                rmse = np.sqrt(np.mean((y_fold_val - y_pred) ** 2))
                cv_scores.append(rmse)
            
            return np.mean(cv_scores)
        
        # Run hyperparameter optimization
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)
        
        print("Best hyperparameters:", study.best_params)
        
        # Visualize optimization results
        try:
            os.makedirs("results/optimization", exist_ok=True)
            
            # Plot optimization history
            plt.figure(figsize=(10, 6))
            optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.title('Random Forest Hyperparameter Optimization History')
            plt.tight_layout()
            plt.savefig("results/optimization/rf_optimization_history.png")
            plt.close()
            
            # Plot parameter importances
            plt.figure(figsize=(12, 8))
            optuna.visualization.matplotlib.plot_param_importances(study)
            plt.title('Random Forest Hyperparameter Importance')
            plt.tight_layout()
            plt.savefig("results/optimization/rf_param_importances.png")
            plt.close()
            
            print("Optimization visualizations saved to results/optimization/ directory")
        except Exception as e:
            print(f"Error creating optimization visualizations: {e}")
        
        # Set best parameters
        best_params = study.best_params
        self.n_estimators = best_params.get('n_estimators', self.n_estimators)
        self.max_depth = best_params.get('max_depth', self.max_depth)
        self.min_samples_split = best_params.get('min_samples_split', self.min_samples_split)
        self.min_samples_leaf = best_params.get('min_samples_leaf', self.min_samples_leaf)
        
        # Store remaining parameters
        remaining_params = {k: v for k, v in best_params.items() 
                           if k not in ['n_estimators', 'max_depth', 'min_samples_split', 'min_samples_leaf']}
        self.params.update(remaining_params)
        
        # Train with best parameters
        return self.train(X_train, y_train, X_val, y_val)
    
    def _plot_feature_importance(self):
        """Plot feature importance for Random Forest model."""
        if not hasattr(self, 'model') or self.model is None:
            print("Model not trained yet, cannot plot feature importance")
            return
        
        try:
            # Create directory
            os.makedirs("results/models/random_forest", exist_ok=True)
            
            # Get feature importances
            importances = self.model.feature_importances_
            
            # Sort feature importances
            indices = np.argsort(importances)[::-1]
            
            # Get feature names (if available) or create indices
            feature_names = getattr(self.model, 'feature_names_in_', None)
            if feature_names is None:
                feature_names = [f'Feature {i}' for i in range(len(importances))]
            
            # Plot top 20 features
            plt.figure(figsize=(12, 8))
            n_features = min(20, len(importances))
            plt.bar(range(n_features), importances[indices[:n_features]])
            plt.xticks(range(n_features), [feature_names[i] for i in indices[:n_features]], rotation=90)
            plt.title('Random Forest Feature Importances')
            plt.tight_layout()
            plt.savefig("results/models/random_forest/feature_importance.png")
            plt.close()
            
            print("Feature importance plot saved to results/models/random_forest/feature_importance.png")
            
            # Also save tabular data
            importance_df = pd.DataFrame({
                'Feature': [feature_names[i] for i in indices],
                'Importance': importances[indices]
            })
            importance_df.to_csv("results/models/random_forest/feature_importance.csv", index=False)
            print("Feature importance data saved to results/models/random_forest/feature_importance.csv")
        except Exception as e:
            print(f"Error creating feature importance visualization: {e}")

    def save(self, path=None):
        """Save the trained model to the specified path."""
        # Use standard models directory for consistency with other models
        if path is None:
            path = f"models/{self.model_name}_model.pkl"
            
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Call the parent class save method
        super().save(path)
        
        # Also save feature importance if available
        if hasattr(self, 'feature_importances_') and self.feature_importances_ is not None:
            import json
            
            # Convert numpy array to list for JSON serialization
            feature_importances_list = self.feature_importances_.tolist()
            importance_path = path.replace('.pkl', '_importance.json')
            
            with open(importance_path, 'w') as f:
                json.dump(feature_importances_list, f, indent=2)
            
            print(f"Feature importance saved to {importance_path}")
        
        return self