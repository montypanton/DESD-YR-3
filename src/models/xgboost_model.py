import xgboost as xgb
from xgboost import XGBRegressor
import numpy as np
import optuna
from .base_model import BaseModel
from sklearn.model_selection import train_test_split, KFold, cross_val_score
import matplotlib.pyplot as plt
import os

class XGBoostModel(BaseModel):
    """XGBoost regression model implementation with enhanced tuning and evaluation."""
    
    def __init__(self, random_state=42, **params):
        super().__init__(model_name="xgboost", random_state=random_state)
        self.params = params
        self.feature_importances_ = None
        self.cv_results = None
        self.booster = None  # Store the booster separately
    
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the XGBoost model with early stopping and learning curves."""
        if X_val is None or y_val is None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.random_state
            )
        
        # Set default parameters if not provided
        if not self.params:
            self.params = {
                'objective': 'reg:squarederror',
                'n_estimators': 500,  # Increased from 200
                'max_depth': 6,
                'learning_rate': 0.05,  # Decreased for better generalization
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'colsample_bylevel': 0.8,  # Added parameter
                'min_child_weight': 1,  # Added parameter
                'gamma': 0,  # Added parameter
                'reg_alpha': 0,  # L1 regularization
                'reg_lambda': 1,  # L2 regularization
                'random_state': self.random_state
            }
        
        # Create XGBRegressor (scikit-learn compatible)
        self.model = XGBRegressor(
            objective='reg:squarederror',
            n_estimators=self.params.get('n_estimators', 500),
            max_depth=self.params.get('max_depth', 6),
            learning_rate=self.params.get('learning_rate', 0.05),
            subsample=self.params.get('subsample', 0.8),
            colsample_bytree=self.params.get('colsample_bytree', 0.8),
            colsample_bylevel=self.params.get('colsample_bylevel', 0.8),
            min_child_weight=self.params.get('min_child_weight', 1),
            gamma=self.params.get('gamma', 0),
            reg_alpha=self.params.get('reg_alpha', 0),
            reg_lambda=self.params.get('reg_lambda', 1),
            random_state=self.random_state,
            n_jobs=-1
        )
        
        # Train with early stopping using fit method
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            early_stopping_rounds=20,
            verbose=True
        )
        
        # Store feature importances
        self.feature_importances_ = self.model.feature_importances_
        
        # Store booster for advanced usage
        self.booster = self.model.get_booster()
        
        # Plot learning curves if eval_results are available
        if hasattr(self.model, 'evals_result'):
            self._plot_learning_curves(self.model.evals_result())
        
        # Plot feature importance
        self._plot_feature_importance()
        
        return self

    

    
    
    def tune_hyperparameters(self, X_train, y_train, X_val, y_val, n_trials=50):  # Increased from 20
        """Tune hyperparameters using Optuna with cross-validation."""
        print("Beginning XGBoost hyperparameter optimization with", n_trials, "trials")
        
        # Create DMatrix objects for faster processing
        dtrain = xgb.DMatrix(X_train, label=y_train)
        dval = xgb.DMatrix(X_val, label=y_val)
        
        def objective(trial):
            # More refined parameter search space
            params = {
                'objective': 'reg:squarederror',
                'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
                'max_depth': trial.suggest_int('max_depth', 3, 12),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                'subsample': trial.suggest_float('subsample', 0.5, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
                'colsample_bylevel': trial.suggest_float('colsample_bylevel', 0.5, 1.0),
                'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
                'gamma': trial.suggest_float('gamma', 0, 5),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 5),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 5),
                'random_state': self.random_state
            }
            
            # Use cross-validation for more robust evaluation
            kf = KFold(n_splits=3, shuffle=True, random_state=self.random_state)
            
            # Store CV results for this trial
            cv_rmse = []
            
            for train_idx, test_idx in kf.split(X_train):
                # Split data
                X_fold_train, y_fold_train = X_train[train_idx], y_train[train_idx]
                X_fold_val, y_fold_val = X_train[test_idx], y_train[test_idx]
                
                # Create DMatrix
                dtrain_fold = xgb.DMatrix(X_fold_train, label=y_fold_train)
                dval_fold = xgb.DMatrix(X_fold_val, label=y_fold_val)
                
                # Train with early stopping
                model = xgb.train(
                    params=params,
                    dtrain=dtrain_fold,
                    num_boost_round=params['n_estimators'],
                    evals=[(dval_fold, 'val')],
                    early_stopping_rounds=50,
                    verbose_eval=False
                )
                
                # Predict and calculate RMSE
                y_pred = model.predict(dval_fold)
                fold_rmse = np.sqrt(np.mean((y_fold_val - y_pred) ** 2))
                cv_rmse.append(fold_rmse)
            
            # Return average RMSE across folds
            return np.mean(cv_rmse)
        
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)
        
        print(f"Best hyperparameters: {study.best_params}")
        
        # Store best parameters
        best_params = dict(study.best_params)
        best_params['objective'] = 'reg:squarederror'
        best_params['random_state'] = self.random_state
        self.params = best_params
        
        # Visualize optimization history
        try:
            # Create directory for visualizations
            os.makedirs("results/optimization", exist_ok=True)
            
            # Plot optimization history
            plt.figure(figsize=(10, 6))
            optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.title('XGBoost Hyperparameter Optimization History')
            plt.tight_layout()
            plt.savefig("results/optimization/xgboost_optimization_history.png")
            plt.close()
            
            # Plot parameter importances
            plt.figure(figsize=(12, 8))
            optuna.visualization.matplotlib.plot_param_importances(study)
            plt.title('XGBoost Hyperparameter Importance')
            plt.tight_layout()
            plt.savefig("results/optimization/xgboost_param_importances.png")
            plt.close()
            
            print("Optimization visualizations saved to results/optimization/ directory")
        except Exception as e:
            print(f"Error creating optimization visualizations: {e}")
        
        # Train final model with best parameters
        return self.train(X_train, y_train, X_val, y_val)
    
    def _plot_learning_curves(self, evals_result):
        """Plot and save learning curves from model training."""
        try:
            # Create directory
            os.makedirs("results/models/xgboost", exist_ok=True)
            
            # Plot learning curves
            plt.figure(figsize=(10, 6))
            plt.plot(evals_result['train']['rmse'], label='Training RMSE')
            plt.plot(evals_result['validation']['rmse'], label='Validation RMSE')
            plt.xlabel('Boosting Iterations')
            plt.ylabel('RMSE')
            plt.title('XGBoost Learning Curves')
            plt.legend()
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig("results/models/xgboost/learning_curves.png")
            plt.close()
            
            print("Learning curves saved to results/models/xgboost/learning_curves.png")
        except Exception as e:
            print(f"Error creating learning curves: {e}")
    
    def _plot_feature_importance(self):
        """Plot and save feature importance."""
        if not hasattr(self, 'model') or self.model is None:
            print("Model not trained yet, cannot plot feature importance")
            return
        
        try:
            # Create directory
            os.makedirs("results/models/xgboost", exist_ok=True)
            
            # Get feature importance
            importance_dict = self.model.get_score(importance_type='gain')
            features = list(importance_dict.keys())
            importance = list(importance_dict.values())
            
            # Sort by importance
            sorted_idx = np.argsort(importance)
            features = [features[i] for i in sorted_idx]
            importance = [importance[i] for i in sorted_idx]
            
            # Plot importance (only top 20 if there are many features)
            plt.figure(figsize=(12, 10))
            if len(features) > 20:
                plt.barh(range(20), importance[-20:])
                plt.yticks(range(20), features[-20:])
                plt.title('Top 20 Feature Importance (Gain)')
            else:
                plt.barh(range(len(features)), importance)
                plt.yticks(range(len(features)), features)
                plt.title('Feature Importance (Gain)')
            
            plt.xlabel('Gain')
            plt.tight_layout()
            plt.savefig("results/models/xgboost/feature_importance.png")
            plt.close()
            
            print("Feature importance plot saved to results/models/xgboost/feature_importance.png")
        except Exception as e:
            print(f"Error creating feature importance plot: {e}")
    
    def save(self, path=None):
        """Save the trained model with feature importance information."""
        super().save(path)
        
        # Also save feature importance
        if hasattr(self, 'feature_importances_') and self.feature_importances_:
            import json
            import os
            
            if path is None:
                importance_path = f"models/{self.model_name}_importance.json"
            else:
                importance_path = path.replace('.pkl', '_importance.json')
            
            os.makedirs(os.path.dirname(importance_path), exist_ok=True)
            
            with open(importance_path, 'w') as f:
                json.dump(self.feature_importances_, f, indent=2)
            
            print(f"Feature importance saved to {importance_path}")