import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os

def plot_predictions_vs_actual(y_true, y_pred, model_name, save_path=None):
    """Create scatter plot of predicted vs actual values."""
    plt.figure(figsize=(10, 6))
    plt.scatter(y_true, y_pred, alpha=0.5)
    plt.plot([min(y_true), max(y_true)], [min(y_true), max(y_true)], 'r--')
    plt.xlabel('Actual Settlement Values')
    plt.ylabel('Predicted Settlement Values')
    plt.title(f'{model_name}: Actual vs Predicted Settlement Values')
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()