import numpy as np
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
import joblib
import tensorflow as tf
# from tensorflow.keras.models import load_model ?!?!
from tensorflow.keras.models import load_model

# load the pre-processed data
X_test = np.load('../data/processed_data/X_test_processed.npy')
y_test = np.load('../data/processed_data/y_test.npy')

# load the two models
xgboost_model = joblib.load('../models/xgboost_model.pkl')
mlp_model = load_model('../models/mlp_model.h5')

xgb_preds = xgboost_model.predict(X_test)
mlp_preds = mlp_model.predict(X_test).flatten()

# evaluates performence 
def evaluate(true, preds, model_name):
    mse = root_mean_squared_error(true, preds)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(true, preds)
    r2 = r2_score(true, preds)

    print(f"\n{model_name} Evaluation")
    print(f"{'-'*30}")
    print(f"MSE  : {mse:.4f}")
    print(f"RMSE : {rmse:.4f}")
    print(f"MAE  : {mae:.4f}")
    print(f"R²   : {r2:.4f}")


evaluate(y_test, xgb_preds, "XGBoost")
evaluate(y_test, mlp_preds, "MLP Neural Network")

ensemble_preds = (xgb_preds + mlp_preds) / 2
evaluate(y_test, ensemble_preds, "Ensemble Average")
