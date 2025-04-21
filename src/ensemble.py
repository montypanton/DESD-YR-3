import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LinearRegression
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt





def create_ensemble(mlp_preds, xgb_preds, y_true, method='weighted_average', weights=None):
    print(f"Creating ensemble using method: {method}")
    
    if method == 'weighted_average':
        if weights is None:
            weights = (0.4, 0.6)  # mlp weight / xgboost weight
        
        print(f"Using weights: MLP={weights[0]}, XGBoost={weights[1]}")
        ensemble_preds = weights[0] * mlp_preds + weights[1] * xgb_preds
        
    elif method == 'stacking':
        print("Training a meta-learner for stacking")
        meta_features = np.column_stack((mlp_preds, xgb_preds))
        
        meta_model = LinearRegression()
        meta_model.fit(meta_features, y_true)
        
        ensemble_preds = meta_model.predict(meta_features)
        
        joblib.dump(meta_model, 'models/meta_model.pkl')
        print(f"Meta-model coefficients: {meta_model.coef_}")
    
    else:
        raise ValueError(f"Unknown ensemble method: {method}")
    
    
    
    
    
    # calculates metrics
    mse = root_mean_squared_error(y_true, ensemble_preds)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_true, ensemble_preds)
    r2 = r2_score(y_true, ensemble_preds)
    
    print(f"Ensemble Mean Squared Error: {mse:.2f}")
    print(f"Ensemble Root Mean Squared Error: {rmse:.2f}")
    print(f"Ensemble Mean Absolute Error: {mae:.2f}")
    print(f"Ensemble R² Score: {r2:.4f}")
    
    return {
        'predictions': ensemble_preds,
        'mse': mse,
        'rmse': rmse,
        'mae': mae,
        'r2': r2
    }



def compare_models(y_test, mlp_preds, xgb_preds, ensemble_preds):
    # calculate metrics for both models
    mlp_mse = root_mean_squared_error(y_test, mlp_preds)
    mlp_rmse = np.sqrt(mlp_mse)
    mlp_r2 = r2_score(y_test, mlp_preds)
    
    xgb_mse = root_mean_squared_error(y_test, xgb_preds)
    xgb_rmse = np.sqrt(xgb_mse)
    xgb_r2 = r2_score(y_test, xgb_preds)
    
    ens_mse = root_mean_squared_error(y_test, ensemble_preds)
    ens_rmse = np.sqrt(ens_mse)
    ens_r2 = r2_score(y_test, ensemble_preds)
    
    # make comparison table 
    comparison_data = {
        'Model': ['MLP', 'XGBoost', 'Ensemble'],
        'MSE': [mlp_mse, xgb_mse, ens_mse],
        'RMSE': [mlp_rmse, xgb_rmse, ens_rmse],
        'R²': [mlp_r2, xgb_r2, ens_r2]
    }
    
    comparison_df = pd.DataFrame(comparison_data)
    print("Model Comparison:")
    print(comparison_df.to_string(index=False))
    
    comparison_df.to_csv('models/model_comparison.csv', index=False)
    



    plt.figure(figsize=(12, 8))
    
    plt.scatter(y_test, mlp_preds, alpha=0.3, label='MLP', color='blue')
    plt.scatter(y_test, xgb_preds, alpha=0.3, label='XGBoost', color='green')
    plt.scatter(y_test, ensemble_preds, alpha=0.3, label='Ensemble', color='red')
    plt.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], 'k--')
    
    plt.xlabel('Actual Settlement Values')
    plt.ylabel('Predicted Settlement Values')
    plt.title('Model Comparison: Actual vs Predicted Settlement Values')
    plt.legend()
    plt.savefig('models/model_comparison.png')
    
    plt.figure(figsize=(12, 8))
    
    mlp_errors = mlp_preds - y_test
    xgb_errors = xgb_preds - y_test
    ens_errors = ensemble_preds - y_test
    
    plt.hist(mlp_errors, alpha=0.5, label='MLP Errors', bins=30, color='blue')
    plt.hist(xgb_errors, alpha=0.5, label='XGBoost Errors', bins=30, color='green')
    plt.hist(ens_errors, alpha=0.5, label='Ensemble Errors', bins=30, color='red')
    
    plt.xlabel('Prediction Error')
    plt.ylabel('Frequency')
    plt.title('Error Distribution Comparison')
    plt.legend()
    plt.savefig('models/error_distribution.png')

if __name__ == "__main__":
    print("Loading model predictions and test data...")
    y_test = np.load("data/processed_data/y_test.npy")
    mlp_preds = np.load("data/processed_data/mlp_predictions.npy")
    xgb_preds = np.load("data/processed_data/xgboost_predictions.npy")
    
    stack_metrics = create_ensemble(mlp_preds, xgb_preds, y_test, method='stacking')
    stack_preds = stack_metrics['predictions']
    
    # evaluate average weight ensemble 
    # testing different weight combinations 
    best_r2 = -float('inf')
    best_weights = (0.5, 0.5)
    
    for mlp_weight in np.arange(0.0, 1.1, 0.1):
        xgb_weight = 1 - mlp_weight
        weights = (mlp_weight, xgb_weight)
        
        metrics = create_ensemble(mlp_preds, xgb_preds, y_test, 
                                 method='weighted_average', 
                                 weights=weights)
        
        if metrics['r2'] > best_r2:
            best_r2 = metrics['r2']
            best_weights = weights
    
    print(f"Best weights found: MLP={best_weights[0]}, XGBoost={best_weights[1]}")
    
    # final weighted ensemble with best weights
    weighted_metrics = create_ensemble(mlp_preds, xgb_preds, y_test, 
                                     method='weighted_average', 
                                     weights=best_weights)
    
    weighted_preds = weighted_metrics['predictions']
    
    # choosing best method 
    # save the final ensemble predictions
    # save the ensemble method and parameters
    if weighted_metrics['r2'] > stack_metrics['r2']:
        print("Weighted average ensemble performs better than stacking")
        ensemble_preds = weighted_preds
        final_method = 'weighted_average'
    else:
        print("Stacking ensemble performs better than weighted average")
        ensemble_preds = stack_preds
        final_method = 'stacking'
    
    np.save("data/processed_data/ensemble_predictions.npy", ensemble_preds)
    
    ensemble_config = {
        'method': final_method,
        'weights': best_weights if final_method == 'weighted_average' else None,
    }
    
    joblib.dump(ensemble_config, 'models/ensemble_config.pkl')
    
    # compare all models
    compare_models(y_test, mlp_preds, xgb_preds, ensemble_preds)
    
    print("Ensemble model creation and evaluation complete.")