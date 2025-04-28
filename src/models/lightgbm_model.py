import os
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import lightgbm as lgb
import optuna
import joblib
import matplotlib.pyplot as plt
from src.models.base_model import BaseModel

class LightGBMModel(BaseModel):
    """LightGBM model for regression tasks with advanced hyperparameter tuning."""
    
    def __init__(
        self,
        n_estimators=200,
        learning_rate=0.05,
        max_depth=-1,
        num_leaves=31,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.0,
        reg_lambda=0.0,
        random_state=42,
        objective='regression',
        metric='rmse',
        **kwargs
    ):
        """
        Initialize the LightGBM model.
        
        Parameters:
        -----------
        n_estimators : int
            Number of boosting stages
        learning_rate : float
            Boosting learning rate
        max_depth : int
            Maximum tree depth for base learners, -1 means no limit
        num_leaves : int
            Maximum tree leaves for base learners
        min_child_samples : int
            Minimum number of data needed in a leaf
        subsample : float
            Subsample ratio of the training instance
        colsample_bytree : float
            Subsample ratio of columns when constructing each tree
        reg_alpha : float
            L1 regularization
        reg_lambda : float
            L2 regularization
        random_state : int
            Random number seed
        objective : str
            Objective function
        metric : str
            Metric for evaluation
        """
        super().__init__("lightgbm")
        self.name = "lightgbm"  # Explicitly set the name attribute
        self.params = {
            'n_estimators': n_estimators,
            'learning_rate': learning_rate,
            'max_depth': max_depth,
            'num_leaves': num_leaves,
            'min_child_samples': min_child_samples,
            'subsample': subsample,
            'colsample_bytree': colsample_bytree,
            'reg_alpha': reg_alpha,
            'reg_lambda': reg_lambda,
            'random_state': random_state,
            'objective': objective,
            'metric': metric,
        }
        self.params.update(kwargs)
        self.model = None
        self.feature_importances_ = None
        self.best_params = None
        
    def train(self, X, y):
        """
        Train the LightGBM model.
        
        Parameters:
        -----------
        X : array-like
            Training data
        y : array-like
            Target values
        """
        # Update model with parameters
        params = self.params.copy()
        n_estimators = params.pop('n_estimators')
        
        # Create and train the model
        self.model = lgb.LGBMRegressor(
            n_estimators=n_estimators,
            **params
        )
        
        # Print training details
        print(f"\nTraining LightGBM model with {len(X)} samples and {n_estimators} estimators...")
        
        # Try to log training progress
        try:
            eval_set = [(X, y)]
            self.model.fit(
                X, y,
                eval_set=eval_set,
                eval_metric='rmse',
                early_stopping_rounds=50,
                verbose=50
            )
            # If early stopping, get the best iteration
            best_iter = getattr(self.model, 'best_iteration_', n_estimators)
            print(f"Training completed. Best iteration: {best_iter}")
        except Exception as e:
            # Fallback to regular training
            print(f"Warning: Couldn't use eval set features: {e}")
            self.model.fit(X, y)
            
        # Store feature importances
        self.feature_importances_ = self.model.feature_importances_
        
        # Return self for chaining
        return self
    
    def predict(self, X):
        """
        Make predictions using the trained model.
        
        Parameters:
        -----------
        X : array-like
            Input data
            
        Returns:
        --------
        array-like
            Predicted values
        """
        if self.model is None:
            raise ValueError("Model has not been trained. Call train() before making predictions.")
        return self.model.predict(X)
    
    def save(self, directory='models'):
        """
        Save the model to disk.
        
        Parameters:
        -----------
        directory : str
            Directory to save the model in
        """
        if self.model is None:
            raise ValueError("Model has not been trained and cannot be saved.")
        
        # Create directory if it doesn't exist
        os.makedirs(directory, exist_ok=True)
        
        # Save the model using joblib
        model_path = os.path.join(directory, f"{self.name}_model.pkl")
        joblib.dump(self.model, model_path)
        
        # Save feature importances if available
        if self.feature_importances_ is not None:
            importances_path = os.path.join(directory, f"{self.name}_importance.json")
            # Create a series for easier JSON serialization
            pd.Series(self.feature_importances_).to_json(importances_path)
        
        print(f"Model saved to {model_path}")
        
        # Save best parameters if available
        if self.best_params:
            params_path = os.path.join(directory, f"{self.name}_params.json")
            pd.Series(self.best_params).to_json(params_path)
            print(f"Best parameters saved to {params_path}")
            
        return self
    
    def load(self, directory='models'):
        """
        Load the model from disk.
        
        Parameters:
        -----------
        directory : str
            Directory to load the model from
        """
        model_path = os.path.join(directory, f"{self.name}_model.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
        
        # Load the model
        self.model = joblib.load(model_path)
        
        # Load feature importances if available
        importances_path = os.path.join(directory, f"{self.name}_importance.json")
        if os.path.exists(importances_path):
            self.feature_importances_ = pd.read_json(importances_path, typ='series')
        
        # Load best parameters if available
        params_path = os.path.join(directory, f"{self.name}_params.json")
        if os.path.exists(params_path):
            self.best_params = pd.read_json(params_path, typ='series').to_dict()
            
        print(f"Model loaded from {model_path}")
        return self
    
    def evaluate(self, X, y):
        """
        Evaluate the model on test data.
        
        Parameters:
        -----------
        X : array-like
            Test data
        y : array-like
            True target values
            
        Returns:
        --------
        dict
            Dictionary of evaluation metrics
        """
        if self.model is None:
            raise ValueError("Model has not been trained. Call train() before evaluating.")
        
        # Make predictions
        y_pred = self.predict(X)
        
        # Calculate metrics
        rmse = np.sqrt(mean_squared_error(y, y_pred))
        mae = mean_absolute_error(y, y_pred)
        r2 = r2_score(y, y_pred)
        
        # Calculate additional metrics
        mape = np.mean(np.abs((y - y_pred) / np.maximum(1, np.abs(y)))) * 100  # MAPE
        
        # Print evaluation metrics
        print(f"\nEvaluation metrics for {self.name}:")
        print(f"  RMSE: {rmse:.4f}")
        print(f"  MAE: {mae:.4f}")
        print(f"  R²: {r2:.4f}")
        print(f"  MAPE: {mape:.2f}%")
        
        # Compile metrics into a dictionary
        metrics = {
            'model': self.name,
            'rmse': rmse,
            'mae': mae,
            'r2': r2,
            'mape': mape
        }
        
        # Plot actual vs predicted
        try:
            self._plot_actual_vs_predicted(y, y_pred)
        except Exception as e:
            print(f"Warning: Could not create visualization: {e}")
        
        return metrics, y_pred
    
    def _plot_actual_vs_predicted(self, y_true, y_pred, save_dir='results/models/lightgbm'):
        """
        Create a scatter plot of actual vs predicted values.
        
        Parameters:
        -----------
        y_true : array-like
            True target values
        y_pred : array-like
            Predicted target values
        save_dir : str
            Directory to save the visualization
        """
        os.makedirs(save_dir, exist_ok=True)
        
        plt.figure(figsize=(10, 8))
        
        # Scatter plot
        plt.scatter(y_true, y_pred, alpha=0.6, edgecolor='k', s=50, zorder=2)
        
        # Plot the perfect prediction line
        min_val = min(y_true.min(), y_pred.min())
        max_val = max(y_true.max(), y_pred.max())
        plt.plot([min_val, max_val], [min_val, max_val], 'r--', lw=2, label='Perfect Prediction', zorder=1)
        
        # Add labels and title
        plt.xlabel('Actual Settlement Values')
        plt.ylabel('Predicted Settlement Values')
        plt.title('LightGBM: Actual vs Predicted Settlement Values')
        
        # Add correlation coefficient
        corr = np.corrcoef(y_true, y_pred)[0, 1]
        plt.annotate(f'Correlation: {corr:.4f}', 
                    xy=(0.05, 0.95), xycoords='axes fraction',
                    bbox=dict(boxstyle="round,pad=0.5", fc="white", alpha=0.8))
        
        # Add grid and legend
        plt.grid(True, alpha=0.3, linestyle='--')
        plt.legend()
        plt.tight_layout()
        
        # Save the figure
        plt.savefig(os.path.join(save_dir, 'actual_vs_predicted.png'))
        plt.close()
        
    def tune_hyperparameters(self, X_train, y_train, X_val=None, y_val=None, n_trials=50):
        """
        Tune hyperparameters using Optuna.
        
        Parameters:
        -----------
        X_train : array-like
            Training data
        y_train : array-like
            Training target values
        X_val : array-like, optional
            Validation data
        y_val : array-like, optional
            Validation target values
        n_trials : int
            Number of optimization trials
        """
        if X_val is None or y_val is None:
            # If no validation set provided, use a portion of training data
            from sklearn.model_selection import train_test_split
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.params['random_state']
            )
            
        print(f"Starting hyperparameter tuning for LightGBM with {n_trials} trials...")
        
        # Create optimization history store
        history = {'trial': [], 'rmse': [], 'params': []}
        
        def objective(trial):
            """Objective function for Optuna optimization."""
            # Sample hyperparameters
            param = {
                'objective': 'regression',
                'metric': 'rmse',
                'boosting_type': trial.suggest_categorical('boosting_type', ['gbdt', 'dart']),
                'num_leaves': trial.suggest_int('num_leaves', 10, 100),
                'learning_rate': trial.suggest_float('learning_rate', 0.005, 0.3, log=True),
                'n_estimators': trial.suggest_int('n_estimators', 50, 500),
                'min_child_samples': trial.suggest_int('min_child_samples', 5, 50),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 1e-8, 10.0, log=True),
                'reg_lambda': trial.suggest_float('reg_lambda', 1e-8, 10.0, log=True),
                'random_state': self.params['random_state']
            }
            
            # Create and train the model
            model = lgb.LGBMRegressor(**param)
            
            # Use early stopping
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                eval_metric='rmse',
                early_stopping_rounds=50,
                verbose=False
            )
            
            # Predict on validation set
            y_pred = model.predict(X_val)
            
            # Calculate RMSE
            rmse = np.sqrt(mean_squared_error(y_val, y_pred))
            
            # Store trial information
            history['trial'].append(len(history['trial']) + 1)
            history['rmse'].append(rmse)
            history['params'].append(param)
            
            return rmse
        
        # Create and run the Optuna study
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials)
        
        # Get the best parameters
        best_params = study.best_params
        best_rmse = study.best_value
        
        print(f"Hyperparameter tuning completed.")
        print(f"Best RMSE: {best_rmse:.4f}")
        print(f"Best parameters: {best_params}")
        
        # Add missing parameters and update
        best_params['objective'] = 'regression'
        best_params['metric'] = 'rmse'
        best_params['random_state'] = self.params['random_state']
        
        # Update model with best parameters
        self.best_params = best_params
        self.params.update(best_params)
        
        # Create and train the final model with best parameters
        n_estimators = best_params.pop('n_estimators')
        self.model = lgb.LGBMRegressor(n_estimators=n_estimators, **best_params)
        
        print("Training final model with best parameters...")
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            eval_metric='rmse',
            early_stopping_rounds=50,
            verbose=50
        )
        
        # Store feature importances
        self.feature_importances_ = self.model.feature_importances_
        
        # Create optimization history visualization
        self._plot_optimization_history(history, n_trials)
        
        # Create feature importance plot
        self._plot_feature_importances(X_train)
        
        # Create parameter importance plot
        self._plot_parameter_importances(study)
        
        return self
    
    def _plot_optimization_history(self, history, n_trials, save_dir='results/optimization'):
        """Plot optimization history."""
        os.makedirs(save_dir, exist_ok=True)
        
        plt.figure(figsize=(12, 6))
        plt.plot(history['trial'], history['rmse'], 'o-', alpha=0.7)
        plt.axhline(y=min(history['rmse']), color='r', linestyle='--', 
                    label=f'Best RMSE: {min(history["rmse"]):.4f}')
        
        plt.xlabel('Trial')
        plt.ylabel('RMSE')
        plt.title(f'LightGBM Hyperparameter Optimization History ({n_trials} trials)')
        plt.grid(True, alpha=0.3)
        plt.legend()
        plt.tight_layout()
        
        plt.savefig(os.path.join(save_dir, 'lightgbm_optimization_history.png'))
        plt.close()
        
    def _plot_feature_importances(self, X_train, save_dir='results/models/lightgbm'):
        """Plot feature importances."""
        os.makedirs(save_dir, exist_ok=True)
        
        if hasattr(X_train, 'columns'):
            feature_names = X_train.columns
        else:
            feature_names = [f'Feature {i}' for i in range(X_train.shape[1])]
        
        # Get feature importances
        importances = self.feature_importances_
        
        # Create DataFrame for easier sorting
        importance_df = pd.DataFrame({
            'Feature': feature_names,
            'Importance': importances
        }).sort_values('Importance', ascending=False)
        
        # Get top N features
        top_n = min(20, len(importance_df))
        top_features = importance_df.head(top_n)
        
        # Create bar plot
        plt.figure(figsize=(10, 8))
        plt.barh(top_features['Feature'], top_features['Importance'], color='skyblue', edgecolor='black')
        
        # Add labels and title
        plt.xlabel('Importance')
        plt.ylabel('Feature')
        plt.title(f'Top {top_n} LightGBM Feature Importances')
        plt.grid(axis='x', alpha=0.3, linestyle='--')
        plt.tight_layout()
        
        # Save the figure
        plt.savefig(os.path.join(save_dir, 'feature_importances.png'))
        plt.close()
        
    def _plot_parameter_importances(self, study, save_dir='results/optimization'):
        """Plot parameter importances."""
        os.makedirs(save_dir, exist_ok=True)
        
        try:
            # Get parameter importances
            param_importances = optuna.importance.get_param_importances(study)
            
            # Convert to DataFrame for easier plotting
            importance_df = pd.DataFrame({
                'Parameter': list(param_importances.keys()),
                'Importance': list(param_importances.values())
            }).sort_values('Importance', ascending=False)
            
            # Create bar plot
            plt.figure(figsize=(10, 8))
            plt.barh(importance_df['Parameter'], importance_df['Importance'], color='lightgreen', edgecolor='black')
            
            # Add labels and title
            plt.xlabel('Importance')
            plt.ylabel('Parameter')
            plt.title('LightGBM Parameter Importances')
            plt.grid(axis='x', alpha=0.3, linestyle='--')
            plt.tight_layout()
            
            # Save the figure
            plt.savefig(os.path.join(save_dir, 'lightgbm_param_importances.png'))
            plt.close()
        except Exception as e:
            print(f"Warning: Could not create parameter importance plot: {e}")