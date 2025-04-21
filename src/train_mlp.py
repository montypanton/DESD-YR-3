import numpy as np
import pandas as pd
import joblib
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt




def train_mlp_model(X_train, y_train, hidden_layer_sizes=(100, 50), max_iter=1000, random_state=42):

    print("Training MLP model...")
    print(f"MLP architecture: {hidden_layer_sizes}")
    
    # create and train mlp
    mlp = MLPRegressor(
        hidden_layer_sizes=hidden_layer_sizes,
        activation='relu',
        solver='adam',
        alpha=0.0001,
        batch_size='auto',
        learning_rate='adaptive',
        learning_rate_init=0.001,
        max_iter=max_iter,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=random_state,
        verbose=True
    )
    
    mlp.fit(X_train, y_train)
    
    print(f"MLP model training complete. Iterations: {mlp.n_iter_}")
    
    return mlp

def evaluate_mlp_model(model, X_test, y_test):

    print("Evaluating MLP model...")
    
    y_pred = model.predict(X_test)
    
    mse = root_mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
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
    plt.title('MLP Model: Actual vs Predicted Settlement Values')
    plt.savefig('models/mlp_actual_vs_predicted.png')
    
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
    
# train model
import optuna

def objective(trial):
    hidden_layers = tuple(
        trial.suggest_int(f"units_layer_{i}", 20, 200) for i in range(trial.suggest_int("n_layers", 1, 3))
    )
    model = train_mlp_model(X_train, y_train, hidden_layer_sizes=hidden_layers, max_iter=1000)
    preds = model.predict(X_test)
    rmse = root_mean_squared_error(y_test, preds, squared=False)
    return rmse

study = optuna.create_study(direction='minimize')
study.optimize(objective, n_trials=30)

print("Best Params:", study.best_params)

best_hidden_layers = tuple(
    study.best_params[f'units_layer_{i}'] for i in range(study.best_params['n_layers'])
)

mlp_model = train_mlp_model(X_train, y_train, hidden_layer_sizes=best_hidden_layers, max_iter=2000)
metrics = evaluate_mlp_model(mlp_model, X_test, y_test)
    
print("Saving MLP model...")
joblib.dump(mlp_model, 'models/mlp_model.pkl')
    
np.save("data/processed_data/mlp_predictions.npy", metrics['predictions'])
    
print("MLP model training and evaluation complete.")