import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import optuna




def train_xgboost_model(X_train, y_train, n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42):

    print("Training XGBoost model...")
    print(f"Parameters: n_estimators={n_estimators}, max_depth={max_depth}, learning_rate={learning_rate}")
    
    # train xgb model
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=random_state,
        n_jobs=-1,
        verbosity=1
    )
    
    model.fit(
        X_train, 
        y_train,
        eval_set=[(X_train, y_train)],
        eval_metric='rmse',
        early_stopping_rounds=10,
        verbose=True
    )
    
    print(f"XGBoost model training complete. Best iteration: {model.best_iteration}")
    
    return model

def evaluate_xgboost_model(model, X_test, y_test):
    print("Evaluating XGBoost model...")
    
    y_pred = model.predict(X_test)
    
    mse = root_mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = root_mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Mean Squared Error: {mse:.2f}")
    print(f"Root Mean Squared Error: {rmse:.2f}")
    print(f"Mean Absolute Error: {mae:.2f}")
    print(f"R² Score: {r2:.4f}")
    
    plt.figure(figsize=(10, 6))
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], 'r--')
    plt.xlabel('Actual Settlement Values')
    plt.ylabel('Predicted Settlement Values')
    plt.title('XGBoost Model: Actual vs Predicted Settlement Values')
    plt.savefig('models/xgboost_actual_vs_predicted.png')
    
    plt.figure(figsize=(12, 8))
    xgb.plot_importance(model, max_num_features=20)
    plt.title('XGBoost Feature Importance')
    plt.savefig('models/xgboost_feature_importance.png')
    
    return {
        'mse': mse,
        'rmse': rmse,
        'mae': mae,
        'r2': r2,
        'predictions': y_pred
    }

if __name__ == "__main__":
    print("Loading preprocessed data...")
    X_train = np.load("data/processed_data/X_train_processed.npy")
    X_test = np.load("data/processed_data/X_test_processed.npy")
    y_train = np.load("data/processed_data/y_train.npy")
    y_test = np.load("data/processed_data/y_test.npy")
    
    print(f"Training data shape: {X_train.shape}")
    print(f"Test data shape: {X_test.shape}")
    
def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 500),
        'max_depth': trial.suggest_int('max_depth', 3, 10),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
        'subsample': trial.suggest_float('subsample', 0.6, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
    }
    model = train_xgboost_model(X_train, y_train, **params)
    preds = model.predict(X_test)
    rmse = root_mean_squared_error(y_test, preds, squared=False)

    return rmse

study = optuna.create_study(direction='minimize')
study.optimize(objective, n_trials=50)

print("Best Params:", study.best_params)

xgb_model = train_xgboost_model(X_train, y_train, **study.best_params)
    
metrics = evaluate_xgboost_model(xgb_model, X_test, y_test)
    
print("Saving XGBoost model...")
joblib.dump(xgb_model, 'models/xgboost_model.pkl')
    
np.save("data/processed_data/xgboost_predictions.npy", metrics['predictions'])
print("XGBoost model training and evaluation complete.")