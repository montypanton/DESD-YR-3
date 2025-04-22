import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, Lasso
from scipy.optimize import minimize
from src.models.base_model import BaseModel
import joblib

class EnsembleModel(BaseModel):
    """Ensemble model combining multiple base models."""
    
    def __init__(self, base_models, ensemble_type='weighted', random_state=42):
        """
        Initialize ensemble model.
        
        Parameters:
        -----------
        base_models : dict
            Dictionary of base models {name: model}
        ensemble_type : str
            Type of ensemble: 'weighted', 'stacking', or 'advanced'
        """
        super().__init__(model_name=f"{ensemble_type}_ensemble", random_state=random_state)
        # Filter out any EnsembleModel instances to prevent recursion
        self.base_models = {name: model for name, model in base_models.items() 
                           if not isinstance(model, EnsembleModel)}
        
        if len(self.base_models) < len(base_models):
            print(f"Warning: Removed {len(base_models) - len(self.base_models)} ensemble models from base_models to prevent recursion")
        
        self.ensemble_type = ensemble_type
        self.weights = None
        self.meta_model = None
        self.model_info = None  # Store ensemble information separately
    
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the ensemble model."""
        if X_val is None or y_val is None:
            from sklearn.model_selection import train_test_split
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=0.2, random_state=self.random_state
            )
        
        if self.ensemble_type == 'weighted':
            self._train_weighted_ensemble(X_val, y_val)
        elif self.ensemble_type == 'stacking':
            self._train_stacking_ensemble(X_train, y_train)
        elif self.ensemble_type == 'advanced':
            self._train_advanced_ensemble(X_train, y_train)
        else:
            raise ValueError(f"Unknown ensemble type: {self.ensemble_type}")
        
        # Set self.model for BaseModel compatibility
        # The actual model logic is handled in self.model_info
        self.model = True  # Just a placeholder
        
        return self
    
    def tune_hyperparameters(self, X_train, y_train, X_val, y_val):
        """
        Tune hyperparameters for ensemble model.
        
        For ensemble models, this could involve finding optimal weights
        or selecting the best meta-learner configuration.
        """
        print(f"Tuning hyperparameters for {self.ensemble_type} ensemble model...")
        
        if self.ensemble_type == 'weighted':
            # For weighted ensemble, find optimal weights using validation data
            self._train_weighted_ensemble(X_val, y_val)
        
        elif self.ensemble_type == 'stacking':
            # Try different regularization strengths for the meta-learner
            best_alpha = 1.0
            best_rmse = float('inf')
            
            for alpha in [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]:
                try:
                    # Generate meta-features
                    meta_features_train = self._get_meta_features(X_train)
                    meta_features_val = self._get_meta_features(X_val)
                    
                    # Train meta-model with this alpha
                    meta_model = Ridge(alpha=alpha, random_state=self.random_state)
                    meta_model.fit(meta_features_train, y_train)
                    
                    # Evaluate on validation set
                    val_preds = meta_model.predict(meta_features_val)
                    val_rmse = np.sqrt(np.mean((y_val - val_preds) ** 2))
                    
                    print(f"  Alpha: {alpha}, Validation RMSE: {val_rmse:.4f}")
                    
                    if val_rmse < best_rmse:
                        best_rmse = val_rmse
                        best_alpha = alpha
                except Exception as e:
                    print(f"Error during tuning with alpha={alpha}: {e}")
            
            print(f"Best alpha: {best_alpha}, Best validation RMSE: {best_rmse:.4f}")
            
            # Train final model with best alpha
            try:
                meta_features = self._get_meta_features(X_train)
                self.meta_model = Ridge(alpha=best_alpha, random_state=self.random_state)
                self.meta_model.fit(meta_features, y_train)
                
                # Store model info
                self.model_info = {
                    'type': 'stacking',
                    'meta_model': self.meta_model,
                    'coefficients': dict(zip(self.base_models.keys(), self.meta_model.coef_))
                }
            except Exception as e:
                print(f"Error training final meta-model: {e}")
                # Fallback to simple average
                self.model_info = {
                    'type': 'weighted',
                    'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
                }
                print("Falling back to simple average ensemble")
        
        elif self.ensemble_type == 'advanced':
            # Similar to stacking but with Lasso
            best_alpha = 0.01
            best_rmse = float('inf')
            
            try:
                for alpha in [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]:
                    # Generate meta-features
                    meta_features_train = self._get_meta_features(X_train)
                    meta_features_val = self._get_meta_features(X_val)
                    
                    # Train meta-model with this alpha
                    meta_model = Lasso(alpha=alpha, random_state=self.random_state)
                    meta_model.fit(meta_features_train, y_train)
                    
                    # Evaluate on validation set
                    val_preds = meta_model.predict(meta_features_val)
                    val_rmse = np.sqrt(np.mean((y_val - val_preds) ** 2))
                    
                    print(f"  Alpha: {alpha}, Validation RMSE: {val_rmse:.4f}")
                    
                    if val_rmse < best_rmse:
                        best_rmse = val_rmse
                        best_alpha = alpha
                
                print(f"Best alpha: {best_alpha}, Best validation RMSE: {best_rmse:.4f}")
                
                # Train final model with best alpha
                meta_features = self._get_meta_features(X_train)
                self.meta_model = Lasso(alpha=best_alpha, random_state=self.random_state)
                self.meta_model.fit(meta_features, y_train)
                
                # Store model info
                self.model_info = {
                    'type': 'advanced',
                    'meta_model': self.meta_model,
                    'coefficients': dict(zip(self.base_models.keys(), self.meta_model.coef_))
                }
            except Exception as e:
                print(f"Error during advanced ensemble training: {e}")
                # Fallback to simple average
                self.model_info = {
                    'type': 'weighted',
                    'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
                }
                print("Falling back to simple average ensemble")
        
        return self
    
    def _get_meta_features(self, X):
        """Safely generate meta-features from base models"""
        base_preds = []
        for name, model in self.base_models.items():
            try:
                preds = model.predict(X)
                base_preds.append(preds)
            except Exception as e:
                print(f"Error getting predictions from {name}: {e}")
                # Add zeros as fallback
                base_preds.append(np.zeros(X.shape[0]))
        
        if not base_preds:
            raise ValueError("No valid predictions from base models")
        
        return np.column_stack(base_preds)
    
    def _train_weighted_ensemble(self, X_val, y_val):
        """Train weighted average ensemble by finding optimal weights."""
        print("Training weighted ensemble...")
        
        try:
            # Generate base model predictions
            base_preds = {}
            for name, model in self.base_models.items():
                try:
                    preds = model.predict(X_val)
                    base_preds[name] = preds
                except Exception as e:
                    print(f"Error getting predictions from {name}: {e}")
            
            # Check if we have predictions to work with
            if not base_preds:
                raise ValueError("No valid predictions from base models")
            
            # Define objective function to minimize (RMSE)
            def objective(weights):
                # Normalize weights to sum to 1
                weights = weights / np.sum(weights)
                
                # Generate weighted prediction
                weighted_pred = np.zeros_like(y_val)
                for i, (name, preds) in enumerate(base_preds.items()):
                    weighted_pred += weights[i] * preds
                
                # Calculate RMSE
                return np.sqrt(np.mean((y_val - weighted_pred) ** 2))
            
            # Initial weights (equal)
            initial_weights = np.ones(len(base_preds)) / len(base_preds)
            
            # Constraints: weights must be positive and sum to 1
            constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1})
            bounds = [(0, 1) for _ in range(len(base_preds))]
            
            # Find optimal weights
            result = minimize(objective, initial_weights, 
                             method='SLSQP', bounds=bounds, constraints=constraints)
            
            # Normalize weights
            self.weights = result.x / np.sum(result.x)
            
            # Create weights dictionary with only the valid model names
            weights_dict = dict(zip(base_preds.keys(), self.weights))
            
            self.model_info = {
                'type': 'weighted',
                'weights': weights_dict
            }
            
            print(f"Optimal weights: {self.model_info['weights']}")
        
        except Exception as e:
            print(f"Error in weighted ensemble training: {e}")
            # Use equal weights as fallback for all base models
            self.model_info = {
                'type': 'weighted',
                'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
            }
            print(f"Using equal weights due to error: {self.model_info['weights']}")
    
    def _train_stacking_ensemble(self, X_train, y_train):
        """Train stacking ensemble with a meta-learner."""
        print("Training stacking ensemble...")
        try:
            # Generate meta-features
            meta_features = self._get_meta_features(X_train)
            
            # Train meta-model (Ridge regression)
            self.meta_model = Ridge(alpha=1.0, random_state=self.random_state)
            self.meta_model.fit(meta_features, y_train)
            
            # Store model info
            self.model_info = {
                'type': 'stacking',
                'meta_model': self.meta_model,
                'coefficients': dict(zip(self.base_models.keys(), self.meta_model.coef_))
            }
            
            print(f"Meta-model coefficients: {self.model_info['coefficients']}")
        
        except Exception as e:
            print(f"Error in stacking ensemble training: {e}")
            # Fallback to simple average
            self.model_info = {
                'type': 'weighted',
                'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
            }
            print("Falling back to simple average ensemble")
    
    def _train_advanced_ensemble(self, X_train, y_train):
        """Train advanced ensemble with regularized meta-learner."""
        print("Training advanced ensemble...")
        try:
            # Generate meta-features
            meta_features = self._get_meta_features(X_train)
            
            # Train meta-model (Lasso regression for feature selection)
            self.meta_model = Lasso(alpha=0.01, random_state=self.random_state)
            self.meta_model.fit(meta_features, y_train)
            
            # Store model info
            self.model_info = {
                'type': 'advanced',
                'meta_model': self.meta_model,
                'coefficients': dict(zip(self.base_models.keys(), self.meta_model.coef_))
            }
            
            print(f"Meta-model coefficients: {self.model_info['coefficients']}")
        
        except Exception as e:
            print(f"Error in advanced ensemble training: {e}")
            # Fallback to simple average
            self.model_info = {
                'type': 'weighted',
                'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
            }
            print("Falling back to simple average ensemble")
    
    def predict(self, X):
        """Make predictions using the ensemble model."""
        if self.model_info is None:
            raise ValueError("Model not trained. Call train() first.")
        
        try:
            if self.model_info['type'] == 'weighted':
                # Generate weighted average prediction
                weighted_pred = np.zeros((X.shape[0],))
                
                # Use the weights from the model_info
                for name, weight in self.model_info['weights'].items():
                    if name in self.base_models:
                        model = self.base_models[name]
                        weighted_pred += weight * model.predict(X)
                    else:
                        print(f"Warning: Model '{name}' found in weights but not in base_models.")
                
                return weighted_pred
            
            elif self.model_info['type'] in ['stacking', 'advanced']:
                # Safely generate meta-features
                meta_features = self._get_meta_features(X)
                
                # Generate prediction using meta-model
                return self.meta_model.predict(meta_features)
        
        except Exception as e:
            print(f"Error during ensemble prediction: {e}")
            # Fallback to average of available models
            predictions = []
            for name, model in self.base_models.items():
                try:
                    predictions.append(model.predict(X))
                except Exception as inner_e:
                    print(f"Error getting predictions from {name}: {inner_e}")
            
            if not predictions:
                raise ValueError("No valid predictions available from any base model")
            
            # Return average of available predictions
            return np.mean(predictions, axis=0)
            
    def save(self, path=None):
        """Save the ensemble model information."""
        if self.model_info is None:
            raise ValueError("Model not trained. Call train() first.")
        
        if path is None:
            path = f"models/{self.model_name}_model.pkl"
        
        import os
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # For stacking or advanced ensemble, save meta_model in model_info
        if self.model_info['type'] in ['stacking', 'advanced']:
            try:
                # Save meta_model separately to avoid issues with joblib
                meta_model = self.model_info['meta_model']
                self.model_info['meta_model'] = None  # Remove for serialization
                
                # Save model_info and ensemble details
                joblib.dump({
                    'model_info': self.model_info,
                    'ensemble_type': self.ensemble_type,
                    'base_model_names': list(self.base_models.keys())
                }, path)
                
                # Save meta-model separately
                meta_model_path = f"models/{self.model_name}_meta_model.pkl"
                joblib.dump(meta_model, meta_model_path)
                
                # Restore meta_model for further use
                self.model_info['meta_model'] = meta_model
            except Exception as e:
                print(f"Error saving meta-model: {e}")
                # Simplified save
                joblib.dump({
                    'model_info': {'type': 'weighted', 'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}},
                    'ensemble_type': 'weighted',
                    'base_model_names': list(self.base_models.keys())
                }, path)
        else:
            # For weighted ensemble, just save model_info and ensemble details
            joblib.dump({
                'model_info': self.model_info,
                'ensemble_type': self.ensemble_type,
                'base_model_names': list(self.base_models.keys())
            }, path)
        
        print(f"Ensemble model saved to {path}")