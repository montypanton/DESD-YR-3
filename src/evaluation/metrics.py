import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from scipy.stats import pearsonr

def calculate_regression_metrics(y_true, y_pred, model_name=None):
    """Calculate comprehensive regression metrics."""
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    
    # Additional metrics
    pearson_corr, p_value = pearsonr(y_true, y_pred)
    
    # Handle zero division in case y_true contains zeros
    with np.errstate(divide='ignore', invalid='ignore'):
        mape = np.nanmean(np.abs((y_true - y_pred) / y_true)) * 100
    
    # Format results
    results = {
        'model': model_name,
        'mse': mse,
        'rmse': rmse, 
        'mae': mae,
        'r2': r2,
        'pearson_corr': pearson_corr,
        'p_value': p_value,
        'mape': mape
    }
    
    return results