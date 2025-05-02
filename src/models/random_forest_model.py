"""
Random Forest regression model for settlement value prediction.

This module provides a comprehensive Random Forest implementation with:
- Hyperparameter tuning using Optuna 
- Feature importance visualization
- Cross-validation for robust evaluation
- OOB (Out-of-Bag) error estimation
- Model persistence and serialization

Contributors:
- Alex: Implemented hyperparameter tuning and visualization features (50%)
- Jakub: Created the initial model implementation (40%)
- Monty: Added feature importance extraction and evaluation metrics (10%)
"""

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
    """
    Random Forest regression model implementation for settlement prediction.
    
    This implementation provides:
    - Robust regression using ensemble of decision trees
    - Hyperparameter tuning via Optuna optimization
    - Out-of-bag error estimation for validation
    - Feature importance extraction and visualization
    - Cross-validation for reliable performance estimation
    - Model serialization for deployment
    
    Random Forests are well-suited for this domain due to their ability to:
    - Handle non-linear relationships in insurance data
    - Manage mixed categorical and numerical features
    - Provide native feature importance rankings
    - Maintain good performance with minimal tuning
    - Resist overfitting compared to single decision trees
    """
    
    def __init__(self, n_estimators=200, max_depth=None, min_samples_split=2, 
                 min_samples_leaf=1, random_state=42, **params):
        """
        Initialize Random Forest model with hyperparameters.
        
        Parameters:
        -----------
        n_estimators : int, default=200
            Number of trees in the forest - higher values improve performance
            at the cost of training time
            
        max_depth : int or None, default=None
            Maximum depth of each tree - controls model complexity.
            None means unlimited depth until leaves are pure or contain 
            min_samples_split samples.
            
        min_samples_split : int, default=2
            Minimum samples required to split an internal node
            
        min_samples_leaf : int, default=1
            Minimum samples required to be at a leaf node
            
        random_state : int, default=42
            Random seed for reproducibility
            
        **params : dict
            Additional parameters passed to sklearn's RandomForestRegressor
        """
        super().__init__(model_name="random_forest", random_state=random_state)
        
        # Store core hyperparameters as instance attributes for easy access
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        
        # Store additional parameters to pass to underlying model
        self.params = params
        
        # Will be populated during training for visualization
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
        """
        Tune Random Forest hyperparameters using Bayesian optimization with Optuna.
        
        This method performs systematic hyperparameter tuning using Optuna's
        Bayesian optimization framework to find the optimal hyperparameter
        combination that minimizes RMSE on cross-validation folds.
        
        Parameters:
        -----------
        X_train : array-like
            Training feature data, shape (n_samples, n_features)
        y_train : array-like
            Training target values, shape (n_samples,)
        X_val : array-like
            Validation feature data for final evaluation
        y_val : array-like
            Validation target values for final evaluation
        n_trials : int, default=50
            Number of hyperparameter combinations to try
            
        Returns:
        --------
        self : RandomForestModel
            Trained model with optimized hyperparameters
            
        Notes:
        ------
        - Uses 3-fold cross-validation for robust hyperparameter evaluation
        - Explores key hyperparameters like n_estimators, max_depth, min_samples_split
        - Creates visualizations of the optimization process
        - Automatically trains the final model with the best parameters
        """
        # Define the objective function that Optuna will minimize
        def objective(trial):
            # Define hyperparameter search space
            # These ranges are chosen based on domain knowledge and common practices
            n_estimators = trial.suggest_int('n_estimators', 50, 500)  # Number of trees
            max_depth = trial.suggest_int('max_depth', 5, 30)          # Maximum tree depth
            min_samples_split = trial.suggest_int('min_samples_split', 2, 20)  # Min samples for split
            min_samples_leaf = trial.suggest_int('min_samples_leaf', 1, 10)    # Min samples at leaf
            max_features = trial.suggest_categorical('max_features', ['sqrt', 'log2', None])  # Feature subset strategy
            bootstrap = trial.suggest_categorical('bootstrap', [True, False])  # Whether to bootstrap samples
            
            # Create model with the hyperparameters suggested by Optuna
            model = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                min_samples_leaf=min_samples_leaf,
                max_features=max_features,
                bootstrap=bootstrap,
                oob_score=bootstrap,  # Enable OOB scoring only when bootstrapping is used
                n_jobs=-1,            # Use all available CPU cores
                random_state=self.random_state
            )
            
            # Use k-fold cross-validation for more robust evaluation
            # This reduces the chance of overfitting to a particular train/val split
            kf = KFold(n_splits=3, shuffle=True, random_state=self.random_state)
            
            # Convert pandas DataFrames to numpy arrays if necessary
            # This prevents potential indexing issues during cross-validation
            X_train_array = X_train.values if hasattr(X_train, 'values') else X_train
            y_train_array = y_train.values if hasattr(y_train, 'values') else y_train
            
            # Perform cross-validation
            cv_scores = []
            for train_idx, test_idx in kf.split(X_train_array):
                # Split data for this fold
                X_fold_train, y_fold_train = X_train_array[train_idx], y_train_array[train_idx]
                X_fold_val, y_fold_val = X_train_array[test_idx], y_train_array[test_idx]
                
                # Train and evaluate model on this fold
                model.fit(X_fold_train, y_fold_train)
                y_pred = model.predict(X_fold_val)
                
                # Calculate RMSE for this fold
                rmse = np.sqrt(np.mean((y_fold_val - y_pred) ** 2))
                cv_scores.append(rmse)
            
            # Return mean RMSE across all folds as the objective value to minimize
            return np.mean(cv_scores)
        
        # Create and run Optuna study to minimize the objective
        print(f"Starting Random Forest hyperparameter tuning with {n_trials} trials...")
        study = optuna.create_study(direction='minimize')  # We want to minimize RMSE
        study.optimize(objective, n_trials=n_trials)
        
        print(f"Hyperparameter tuning complete.")
        print(f"Best hyperparameters: {study.best_params}")
        print(f"Best RMSE: {study.best_value:.4f}")
        
        # Create visualizations of the optimization process
        try:
            # Create directory for optimization results
            os.makedirs("results/optimization", exist_ok=True)
            
            # Plot optimization history (RMSE vs. trial number)
            plt.figure(figsize=(10, 6))
            optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.title('Random Forest Hyperparameter Optimization History')
            plt.xlabel('Trial Number')
            plt.ylabel('RMSE (lower is better)')
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig("results/optimization/rf_optimization_history.png")
            plt.close()
            
            # Plot parameter importances (which parameters had the biggest impact)
            plt.figure(figsize=(12, 8))
            optuna.visualization.matplotlib.plot_param_importances(study)
            plt.title('Random Forest Hyperparameter Importance')
            plt.xlabel('Importance (higher means more impact on RMSE)')
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig("results/optimization/rf_param_importances.png")
            plt.close()
            
            print("Optimization visualizations saved to results/optimization/ directory")
        except Exception as e:
            print(f"Error creating optimization visualizations: {e}")
        
        # Extract and set best hyperparameters
        best_params = study.best_params
        
        # Update core hyperparameters
        self.n_estimators = best_params.get('n_estimators', self.n_estimators)
        self.max_depth = best_params.get('max_depth', self.max_depth)
        self.min_samples_split = best_params.get('min_samples_split', self.min_samples_split)
        self.min_samples_leaf = best_params.get('min_samples_leaf', self.min_samples_leaf)
        
        # Update additional parameters that aren't part of the core attributes
        remaining_params = {k: v for k, v in best_params.items() 
                           if k not in ['n_estimators', 'max_depth', 'min_samples_split', 'min_samples_leaf']}
        self.params.update(remaining_params)
        
        # Train the final model with the best parameters
        print("Training final model with optimal hyperparameters...")
        return self.train(X_train, y_train, X_val, y_val)
    
    def _plot_feature_importance(self):
        """
        Create visualization and exports of Random Forest feature importances.
        
        This method extracts, visualizes, and exports feature importance data from 
        the trained Random Forest model. Feature importance helps identify which
        variables have the strongest influence on settlement value predictions.
        
        The method creates:
        1. A bar chart of the top 20 most important features
        2. A CSV file with the complete ranked feature importance data
        
        Feature importance is derived from the mean decrease in impurity
        (Gini importance) across all trees in the forest.
        
        Notes:
        ------
        - Automatically handles both sklearn 0.24+ (feature_names_in_) and older versions
        - Sorts features by descending importance for clear interpretation
        - Creates readable, publication-quality visualizations
        - Saves both visual and tabular outputs for further analysis
        """
        # Verify model exists and is trained
        if not hasattr(self, 'model') or self.model is None:
            print("Model not trained yet, cannot plot feature importance")
            return
        
        try:
            # Create output directory if it doesn't exist
            output_dir = "results/models/random_forest"
            os.makedirs(output_dir, exist_ok=True)
            
            # Extract feature importances from the model
            # This is the mean decrease in impurity across all trees
            importances = self.model.feature_importances_
            
            # Store importances for later use and serialization
            self.feature_importances_ = importances
            
            # Sort features by importance (descending order)
            indices = np.argsort(importances)[::-1]
            
            # Get feature names, using modern sklearn API if available
            # Fall back to generic names if feature names aren't available
            feature_names = getattr(self.model, 'feature_names_in_', None)
            if feature_names is None:
                feature_names = [f'Feature {i}' for i in range(len(importances))]
            
            # Create bar chart visualization
            plt.figure(figsize=(12, 8))
            
            # Limit to top 20 features for readability
            n_features = min(20, len(importances))
            
            # Create the bar chart with professional formatting
            bars = plt.bar(
                range(n_features), 
                importances[indices[:n_features]],
                color='skyblue',
                edgecolor='navy',
                alpha=0.7
            )
            
            # Add feature names as x-tick labels
            plt.xticks(
                range(n_features), 
                [feature_names[i] for i in indices[:n_features]], 
                rotation=90,
                ha='right'
            )
            
            # Add value labels on top of each bar for precise reading
            for i, bar in enumerate(bars):
                height = bar.get_height()
                plt.text(
                    bar.get_x() + bar.get_width()/2.,
                    height + 0.005,
                    f'{importances[indices[i]]:.3f}',
                    ha='center', 
                    va='bottom',
                    rotation=0,
                    fontsize=8
                )
            
            # Add title and styling
            plt.title('Random Forest Feature Importances', fontsize=14, fontweight='bold')
            plt.xlabel('Features', fontsize=12)
            plt.ylabel('Importance Score', fontsize=12)
            plt.grid(axis='y', alpha=0.3)
            plt.tight_layout()
            
            # Save high-quality visualization
            plt.savefig(f"{output_dir}/feature_importance.png", dpi=300)
            plt.close()
            
            print(f"Feature importance visualization saved to {output_dir}/feature_importance.png")
            
            # Create and save tabular data for further analysis
            # Include all features, not just the top 20
            importance_df = pd.DataFrame({
                'Feature': [feature_names[i] for i in indices],
                'Importance': importances[indices]
            })
            
            # Add rank for easier interpretation
            importance_df['Rank'] = range(1, len(importances) + 1)
            
            # Save as CSV for easy import into other analysis tools
            csv_path = f"{output_dir}/feature_importance.csv"
            importance_df.to_csv(csv_path, index=False)
            print(f"Complete feature importance data saved to {csv_path}")
            
        except Exception as e:
            print(f"Error creating feature importance visualization: {e}")
            import traceback
            traceback.print_exc()

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