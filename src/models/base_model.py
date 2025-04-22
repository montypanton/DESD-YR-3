from abc import ABC, abstractmethod
import numpy as np
import joblib
import os
from src.evaluation.metrics import calculate_regression_metrics
from src.evaluation.visualisation import plot_predictions_vs_actual

class BaseModel(ABC):
    """Abstract base class for regression models."""
    
    def __init__(self, model_name, random_state=42):
        self.model_name = model_name
        self.random_state = random_state
        self.model = None
    
    @abstractmethod
    def train(self, X_train, y_train, X_val=None, y_val=None):
        """Train the model on provided data."""
        pass
    
    @abstractmethod
    def tune_hyperparameters(self, X_train, y_train, X_val, y_val):
        """Tune hyperparameters for the model."""
        pass
    
    def predict(self, X):
        """Make predictions using the trained model."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        return self.model.predict(X)
    
    def evaluate(self, X_test, y_test):
        """Evaluate the model performance."""
        y_pred = self.predict(X_test)
        metrics = calculate_regression_metrics(y_test, y_pred, self.model_name)
        
        # Create visualization
        plot_path = f"results/models/{self.model_name}/predictions.png"
        plot_predictions_vs_actual(y_test, y_pred, self.model_name, plot_path)
        
        return metrics, y_pred
    
    def save(self, path=None):
        """Save the trained model."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        if path is None:
            path = f"models/{self.model_name}_model.pkl"
        
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.model, path)
        print(f"Model saved to {path}")