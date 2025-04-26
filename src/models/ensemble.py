import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.model_selection import KFold, cross_val_predict
from scipy.optimize import minimize
from src.models.base_model import BaseModel
import joblib
import os
import matplotlib.pyplot as plt

class EnsembleModel(BaseModel):
    """Enhanced ensemble model combining multiple base models with advanced stacking."""
    
    def __init__(self, base_models, ensemble_type='weighted', random_state=42):
        """
        Initialize ensemble model.
        
        Parameters:
        -----------
        base_models : dict
            Dictionary of base models {name: model}
        ensemble_type : str
            Type of ensemble: 'weighted', 'stacking', 'blending', or 'stacking_cv'
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
        self.cv_metadata = None  # Store cross-validation metadata
    
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
        elif self.ensemble_type == 'blending':
            self._train_blending_ensemble(X_train, y_train, X_val, y_val)
        elif self.ensemble_type == 'stacking_cv':
            self._train_stacking_cv_ensemble(X_train, y_train)
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
        
        elif self.ensemble_type in ['stacking', 'stacking_cv']:
            # Try different meta-learners and configurations
            best_meta_learner = None
            best_rmse = float('inf')
            
            # Generate meta-features
            if self.ensemble_type == 'stacking':
                meta_features_train = self._get_meta_features(X_train)
                meta_features_val = self._get_meta_features(X_val)
            else:  # stacking_cv
                # Use cross-validation to generate meta-features
                kf = KFold(n_splits=5, shuffle=True, random_state=self.random_state)
                meta_features_train = np.zeros((X_train.shape[0], len(self.base_models)))
                
                for i, (name, model) in enumerate(self.base_models.items()):
                    try:
                        # Generate out-of-fold predictions
                        meta_features_train[:, i] = cross_val_predict(
                            model.model, X_train, y_train, cv=kf, n_jobs=-1,
                            method='predict'
                        )
                    except Exception as e:
                        print(f"Error generating CV predictions for {name}: {e}")
                        # Use model predictions as fallback
                        meta_features_train[:, i] = model.predict(X_train)
                
                # Get validation meta-features
                meta_features_val = self._get_meta_features(X_val)
            
            # Test different meta-learners
            meta_learners = {
                'ridge': Ridge(random_state=self.random_state),
                'lasso': Lasso(random_state=self.random_state),
                'elastic_net': ElasticNet(random_state=self.random_state)
            }
            
            alpha_values = [0.001, 0.01, 0.1, 1.0, 10.0]
            
            for name, learner in meta_learners.items():
                for alpha in alpha_values:
                    try:
                        # Set alpha parameter
                        learner.set_params(alpha=alpha)
                        
                        # Train meta-learner
                        learner.fit(meta_features_train, y_train)
                        
                        # Evaluate on validation set
                        val_preds = learner.predict(meta_features_val)
                        val_rmse = np.sqrt(np.mean((y_val - val_preds) ** 2))
                        
                        print(f"  Meta-learner: {name}, Alpha: {alpha}, RMSE: {val_rmse:.4f}")
                        
                        if val_rmse < best_rmse:
                            best_rmse = val_rmse
                            best_meta_learner = (name, alpha, learner)
                    except Exception as e:
                        print(f"Error with meta-learner {name}, alpha={alpha}: {e}")
            
            if best_meta_learner:
                name, alpha, learner = best_meta_learner
                print(f"Best meta-learner: {name} with alpha={alpha}, RMSE: {best_rmse:.4f}")
                
                # Train final model with best meta-learner
                if self.ensemble_type == 'stacking':
                    self._train_stacking_ensemble(X_train, y_train, meta_learner=learner)
                else:  # stacking_cv
                    self._train_stacking_cv_ensemble(X_train, y_train, meta_learner=learner)
            else:
                print("Falling back to weighted ensemble due to meta-learner errors")
                self._train_weighted_ensemble(X_val, y_val)
        
        elif self.ensemble_type == 'blending':
            # Try different blend ratios
            best_ratio = 0.5
            best_rmse = float('inf')
            
            for ratio in [0.3, 0.4, 0.5, 0.6, 0.7]:
                # Split training data for blending
                blend_size = int(len(X_train) * ratio)
                X_blend_train = X_train[:blend_size]
                y_blend_train = y_train[:blend_size]
                X_blend_val = X_train[blend_size:]
                y_blend_val = y_train[blend_size:]
                
                try:
                    # Train base models on blend_train
                    base_preds = {}
                    for name, model in self.base_models.items():
                        # Create a clone of the model to avoid modifying original
                        from sklearn.base import clone
                        try:
                            model_clone = clone(model.model)
                            model_clone.fit(X_blend_train, y_blend_train)
                            base_preds[name] = model_clone.predict(X_blend_val)
                        except Exception as e:
                            print(f"Error cloning/training {name}: {e}")
                            # Use original model as fallback
                            base_preds[name] = model.predict(X_blend_val)
                    
                    # Create meta-features
                    meta_features = np.column_stack([preds for preds in base_preds.values()])
                    
                    # Train meta-learner
                    meta_learner = Ridge(alpha=1.0, random_state=self.random_state)
                    meta_learner.fit(meta_features, y_blend_val)
                    
                    # Evaluate on validation set
                    val_meta_features = np.column_stack([
                        model.predict(X_val) for model in self.base_models.values()
                    ])
                    val_preds = meta_learner.predict(val_meta_features)
                    val_rmse = np.sqrt(np.mean((y_val - val_preds) ** 2))
                    
                    print(f"  Blend ratio: {ratio}, RMSE: {val_rmse:.4f}")
                    
                    if val_rmse < best_rmse:
                        best_rmse = val_rmse
                        best_ratio = ratio
                except Exception as e:
                    print(f"Error with blend ratio {ratio}: {e}")
            
            print(f"Best blend ratio: {best_ratio}, RMSE: {best_rmse:.4f}")
            
            # Train final blending model with best ratio
            self._train_blending_ensemble(X_train, y_train, X_val, y_val, blend_ratio=best_ratio)
        
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
            
            # Visualize weights
            self._visualize_weights(weights_dict)
        
        except Exception as e:
            print(f"Error in weighted ensemble training: {e}")
            # Use equal weights as fallback for all base models
            self.model_info = {
                'type': 'weighted',
                'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
            }
            print(f"Using equal weights due to error: {self.model_info['weights']}")
    
    def _train_stacking_ensemble(self, X_train, y_train, meta_learner=None):
        """Train stacking ensemble with a meta-learner."""
        print("Training stacking ensemble...")
        try:
            # Generate meta-features
            meta_features = self._get_meta_features(X_train)
            
            # Train meta-model (Ridge regression by default)
            if meta_learner is None:
                self.meta_model = Ridge(alpha=1.0, random_state=self.random_state)
            else:
                self.meta_model = meta_learner
                
            self.meta_model.fit(meta_features, y_train)
            
            # Get coefficients
            if hasattr(self.meta_model, 'coef_'):
                coefficients = self.meta_model.coef_
            else:
                coefficients = np.ones(len(self.base_models))
            
            # Create normalized coefficients dictionary
            coef_sum = np.sum(np.abs(coefficients))
            if coef_sum > 0:
                normalized_coefs = coefficients / coef_sum
            else:
                normalized_coefs = np.ones(len(coefficients)) / len(coefficients)
                
            coef_dict = dict(zip(self.base_models.keys(), normalized_coefs))
            
            # Store model info
            self.model_info = {
                'type': 'stacking',
                'meta_model': self.meta_model,
                'coefficients': coef_dict
            }
            
            print(f"Meta-model coefficients: {coef_dict}")
            
            # Visualize coefficients
            self._visualize_weights(coef_dict, title="Stacking Ensemble Coefficients")
        
        except Exception as e:
            print(f"Error in stacking ensemble training: {e}")
            # Fallback to simple average
            self.model_info = {
                'type': 'weighted',
                'weights': {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
            }
            print("Falling back to simple average ensemble")
    
    def _train_blending_ensemble(self, X_train, y_train, X_val, y_val, blend_ratio=0.5):
        """Train blending ensemble which trains base models on part of the data."""
        print(f"Training blending ensemble with blend_ratio={blend_ratio}...")
        
        try:
            # Split training data for blending
            blend_size = int(len(X_train) * blend_ratio)
            X_blend_train = X_train[:blend_size]
            y_blend_train = y_train[:blend_size]
            X_blend_val = X_train[blend_size:]
            y_blend_val = y_train[blend_size:]
            
            # Train base models on blend_train
            base_models_trained = {}
            base_preds = {}
            
            for name, model in self.base_models.items():
                try:
                    # Use the model directly rather than trying to clone it
                    # Train a new model instance on blending data
                    if hasattr(model, 'model_name') and model.model_name == 'xgboost':
                        # For XGBoost, create a new instance and train it
                        from src.models.xgboost_model import XGBoostModel
                        new_model = XGBoostModel(random_state=model.random_state)
                        new_model.train(X_blend_train, y_blend_train)
                        base_models_trained[name] = new_model
                        base_preds[name] = new_model.predict(X_blend_val)
                    else:
                        # For other models, try cloning if possible
                        try:
                            from sklearn.base import clone
                            model_clone = clone(model.model)
                            model_clone.fit(X_blend_train, y_blend_train)
                            base_models_trained[name] = model_clone
                            base_preds[name] = model_clone.predict(X_blend_val)
                        except Exception as clone_err:
                            print(f"Error cloning {name}: {clone_err}")
                            # Fallback: train original model and use that
                            model.train(X_blend_train, y_blend_train)
                            base_models_trained[name] = model.model
                            base_preds[name] = model.predict(X_blend_val)
                except Exception as e:
                    print(f"Error training {name} for blending: {e}")
                    # Use original model as fallback
                    base_preds[name] = model.predict(X_blend_val)
                    base_models_trained[name] = model.model
            
            # Create meta-features
            if base_preds:
                meta_features = np.column_stack([preds for preds in base_preds.values()])
                
                # Train meta-learner
                self.meta_model = Ridge(alpha=1.0, random_state=self.random_state)
                self.meta_model.fit(meta_features, y_blend_val)
                
                # Store model info
                self.model_info = {
                    'type': 'blending',
                    'base_models_trained': base_models_trained,
                    'meta_model': self.meta_model,
                    'blend_ratio': blend_ratio
                }
                
                # Get coefficients for visualization
                if hasattr(self.meta_model, 'coef_'):
                    coef_dict = dict(zip(self.base_models.keys(), self.meta_model.coef_))
                    print(f"Meta-model coefficients: {coef_dict}")
                    self._visualize_weights(coef_dict, title="Blending Ensemble Coefficients")
            else:
                raise ValueError("No valid predictions from base models")
        
        except Exception as e:
            print(f"Error in blending ensemble training: {e}")
            # Fallback to weighted ensemble
            self._train_weighted_ensemble(X_val, y_val)
    
    def _train_stacking_cv_ensemble(self, X_train, y_train, meta_learner=None):
        """Train stacking ensemble using cross-validation to prevent data leakage."""
        print("Training stacking CV ensemble...")
        
        try:
            # Use cross-validation to generate meta-features
            kf = KFold(n_splits=5, shuffle=True, random_state=self.random_state)
            meta_features = np.zeros((X_train.shape[0], len(self.base_models)))
            
            # Track metadata for each fold
            fold_metadata = []
            
            for i, (name, model) in enumerate(self.base_models.items()):
                fold_scores = []
                
                for fold_idx, (train_idx, val_idx) in enumerate(kf.split(X_train)):
                    # Get fold data
                    X_fold_train, X_fold_val = X_train[train_idx], X_train[val_idx]
                    y_fold_train, y_fold_val = y_train[train_idx], y_train[val_idx]
                    
                    try:
                        # Clone model to avoid modifying original
                        from sklearn.base import clone
                        model_clone = clone(model.model)
                        
                        # Train on fold
                        model_clone.fit(X_fold_train, y_fold_train)
                        
                        # Generate predictions for this fold
                        fold_preds = model_clone.predict(X_fold_val)
                        meta_features[val_idx, i] = fold_preds
                        
                        # Calculate performance on fold
                        fold_rmse = np.sqrt(np.mean((y_fold_val - fold_preds) ** 2))
                        fold_scores.append(fold_rmse)
                    except Exception as e:
                        print(f"Error in CV fold {fold_idx} for {name}: {e}")
                        # Use fallback
                        meta_features[val_idx, i] = model.predict(X_fold_val)
                        fold_scores.append(float('inf'))
                
                # Record metadata for this model
                fold_metadata.append({
                    'model': name,
                    'fold_scores': fold_scores,
                    'mean_score': np.mean(fold_scores)
                })
            
            # Store CV metadata
            self.cv_metadata = fold_metadata
            
            # Train meta-learner on all meta-features
            if meta_learner is None:
                self.meta_model = Ridge(alpha=1.0, random_state=self.random_state)
            else:
                self.meta_model = meta_learner
                
            self.meta_model.fit(meta_features, y_train)
            
            # Store model info
            coef_dict = dict(zip(self.base_models.keys(), self.meta_model.coef_))
            
            self.model_info = {
                'type': 'stacking_cv',
                'meta_model': self.meta_model,
                'coefficients': coef_dict,
                'cv_folds': 5
            }
            
            print(f"Meta-model coefficients: {coef_dict}")
            
            # Visualize coefficients
            self._visualize_weights(coef_dict, title="Stacking CV Ensemble Coefficients")
            
            # Visualize CV performance
            self._visualize_cv_performance(fold_metadata)
        
        except Exception as e:
            print(f"Error in stacking CV ensemble training: {e}")
            # Fallback to simple stacking
            self._train_stacking_ensemble(X_train, y_train)
    
    def _visualize_weights(self, weights_dict, title="Ensemble Weights"):
        """Visualize ensemble weights or coefficients."""
        try:
            # Create directory
            os.makedirs(f"results/models/{self.model_name}", exist_ok=True)
            
            # Sort weights by value
            sorted_weights = sorted(weights_dict.items(), key=lambda x: x[1], reverse=True)
            models, weights = zip(*sorted_weights)
            
            # Create bar chart
            plt.figure(figsize=(10, 6))
            plt.bar(models, weights)
            plt.xlabel('Model')
            plt.ylabel('Weight')
            plt.title(title)
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            plt.savefig(f"results/models/{self.model_name}/weights.png")
            plt.close()
            
            print(f"Weights visualization saved to results/models/{self.model_name}/weights.png")
        except Exception as e:
            print(f"Error creating weights visualization: {e}")
    
    def _visualize_cv_performance(self, fold_metadata):
        """Visualize cross-validation performance of base models."""
        try:
            # Create directory
            os.makedirs(f"results/models/{self.model_name}", exist_ok=True)
            
            # Extract data for visualization
            models = [item['model'] for item in fold_metadata]
            mean_scores = [item['mean_score'] for item in fold_metadata]
            
            # Sort by performance
            sorted_idx = np.argsort(mean_scores)
            sorted_models = [models[i] for i in sorted_idx]
            sorted_scores = [mean_scores[i] for i in sorted_idx]
            
            # Create bar chart of mean scores
            plt.figure(figsize=(10, 6))
            plt.bar(sorted_models, sorted_scores)
            plt.xlabel('Model')
            plt.ylabel('Mean RMSE')
            plt.title('Cross-Validation Performance of Base Models')
            plt.xticks(rotation=45, ha='right')
            plt.tight_layout()
            plt.savefig(f"results/models/{self.model_name}/cv_performance.png")
            plt.close()
            
            # Create box plot of fold scores
            plt.figure(figsize=(12, 6))
            fold_scores = [item['fold_scores'] for item in fold_metadata]
            plt.boxplot(fold_scores, labels=models)
            plt.xlabel('Model')
            plt.ylabel('RMSE')
            plt.title('Fold Scores Distribution')
            plt.xticks(rotation=45, ha='right')
            plt.grid(axis='y', alpha=0.3)
            plt.tight_layout()
            plt.savefig(f"results/models/{self.model_name}/fold_scores.png")
            plt.close()
            
            print(f"CV performance visualizations saved to results/models/{self.model_name}/")
        except Exception as e:
            print(f"Error creating CV performance visualization: {e}")
    
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
            
            elif self.model_info['type'] in ['stacking', 'stacking_cv']:
                # Generate meta-features
                meta_features = self._get_meta_features(X)
                
                # Generate prediction using meta-model
                return self.meta_model.predict(meta_features)
            
            elif self.model_info['type'] == 'blending':
                # Generate predictions from each trained base model
                meta_features = np.zeros((X.shape[0], len(self.model_info['base_models_trained'])))
                
                for i, (name, model) in enumerate(self.model_info['base_models_trained'].items()):
                    try:
                        meta_features[:, i] = model.predict(X)
                    except Exception as e:
                        print(f"Error getting predictions from trained {name}: {e}")
                        # Use original model as fallback
                        if name in self.base_models:
                            meta_features[:, i] = self.base_models[name].predict(X)
                
                # Generate prediction using meta-model
                return self.meta_model.predict(meta_features)
            
            else:
                raise ValueError(f"Unknown ensemble type: {self.model_info['type']}")
                
        except Exception as e:
            print(f"Error during ensemble prediction: {e}")
            # Fallback to average of available models
            predictions = []
            for name, model in self.base_models.items():
                try:
                    predictions.append(model.predict(X))
                except Exception as inner_e:
                    print(f"Error getting predictions from {name}: {inner_e}")
            
            if predictions:
                return np.mean(predictions, axis=0)
            else:
                # FINAL fallback using Claude's suggestion
                if hasattr(self, 'model') and self.model is not None:
                    print("Falling back to self.model.predict(X) as last resort.")
                    return self.model.predict(X)
                else:
                    raise ValueError("No valid predictions available from any base model or fallback model.")

    
    def save(self, path=None):
        """Save the ensemble model information."""
        if self.model_info is None:
            raise ValueError("Model not trained. Call train() first.")
        
        if path is None:
            path = f"models/{self.model_name}_model.pkl"
        
        import os
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # We need to handle meta-models specially
        if self.model_info['type'] in ['stacking', 'stacking_cv', 'blending']:
            try:
                # Save meta-model separately to avoid issues with joblib
                meta_model = self.model_info.pop('meta_model', None)
                
                # Handle trained base models for blending
                base_models_trained = None
                if self.model_info['type'] == 'blending':
                    base_models_trained = self.model_info.pop('base_models_trained', None)
                
                # Save model_info and ensemble details
                ensemble_data = {
                    'model_info': self.model_info,
                    'ensemble_type': self.ensemble_type,
                    'base_model_names': list(self.base_models.keys()),
                    'cv_metadata': self.cv_metadata
                }
                
                joblib.dump(ensemble_data, path)
                
                # Save meta-model separately
                meta_model_path = f"models/{self.model_name}_meta_model.pkl"
                if meta_model is not None:
                    joblib.dump(meta_model, meta_model_path)
                
                # Save trained base models for blending
                if base_models_trained is not None:
                    blending_models_path = f"models/{self.model_name}_blending_models.pkl"
                    joblib.dump(base_models_trained, blending_models_path)
                
                # Restore properties for further use
                self.model_info['meta_model'] = meta_model
                if base_models_trained is not None:
                    self.model_info['base_models_trained'] = base_models_trained
                
            except Exception as e:
                print(f"Error saving complex ensemble: {e}")
                # Simplified save - just save weights
                weights = {}
                if 'weights' in self.model_info:
                    weights = self.model_info['weights']
                elif 'coefficients' in self.model_info:
                    weights = self.model_info['coefficients']
                else:
                    weights = {name: 1.0/len(self.base_models) for name in self.base_models.keys()}
                    
                joblib.dump({
                    'model_info': {'type': 'weighted', 'weights': weights},
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