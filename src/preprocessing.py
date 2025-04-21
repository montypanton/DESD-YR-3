import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer

def load_and_preprocess_data(file_path, target_column='SettlementValue'):
    
    print(f"Loading data from {file_path}...")
    df = pd.read_csv(file_path)
    
    print(f"Data shape: {df.shape}")
    print(f"Data columns: {df.columns.tolist()}")
    print(f"Missing values: {df.isnull().sum().sum()}")
    
    y = df[target_column]
    X = df.drop(columns=[target_column])
    
    numeric_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    categorical_features = X.select_dtypes(include=['object', 'category']).columns.tolist()
    
    date_columns = [col for col in X.columns if 'Date' in col]
    for date_col in date_columns:
        if date_col in X.columns:
            X[date_col] = pd.to_datetime(X[date_col])
            X[f"{date_col}_Year"] = X[date_col].dt.year
            X[f"{date_col}_Month"] = X[date_col].dt.month
            X[f"{date_col}_Day"] = X[date_col].dt.day
            numeric_features.extend([f"{date_col}_Year", f"{date_col}_Month", f"{date_col}_Day"])
    
    X = X.drop(columns=date_columns)
    
    numeric_features = [col for col in numeric_features if col in X.columns]
    categorical_features = [col for col in categorical_features if col in X.columns]
    
    print(f"Numeric features: {numeric_features}")
    print(f"Categorical features: {categorical_features}")
    
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"Training set shape: {X_train.shape}")
    print(f"Test set shape: {X_test.shape}")
    
    return X_train, X_test, y_train, y_test, preprocessor

if __name__ == "__main__":

    file_path = "data/Synthetic_Data_For_Students.csv"
    X_train, X_test, y_train, y_test, preprocessor = load_and_preprocess_data(file_path)
    
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    print(f"Processed training data shape: {X_train_processed.shape}")
    print(f"Processed test data shape: {X_test_processed.shape}")
    
    np.save("data/processed_data/X_train_processed.npy", X_train_processed)
    np.save("data/processed_data/X_test_processed.npy", X_test_processed)
    np.save("data/processed_data/y_train.npy", y_train.values)
    np.save("data/processed_data/y_test.npy", y_test.values)
    
    print("Preprocessing complete. Processed data saved.")