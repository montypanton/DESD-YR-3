import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer

def preprocess_data(file_path, target_column='SettlementValue', test_size=0.2, random_state=42):
    """
    Preprocess the data and save train/test splits.
    
    Parameters:
    -----------
    file_path : str
        Path to the input CSV file
    target_column : str
        Name of the target column
    test_size : float
        Proportion of data to use for testing
    random_state : int
        Random seed for reproducibility
    """
    # Create output directory
    processed_dir = 'data/processed_data'
    os.makedirs(processed_dir, exist_ok=True)
    
    # Load and preprocess the data
    X_train, X_test, y_train, y_test, preprocessor = load_and_preprocess_data(
        file_path, 
        target_column=target_column,
        test_size=test_size,
        random_state=random_state
    )
    
    # Apply preprocessing
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    print(f"Processed training data shape: {X_train_processed.shape}")
    print(f"Processed test data shape: {X_test_processed.shape}")
    
    # Save preprocessed data
    np.save(os.path.join(processed_dir, "X_train_processed.npy"), X_train_processed)
    np.save(os.path.join(processed_dir, "X_test_processed.npy"), X_test_processed)
    np.save(os.path.join(processed_dir, "y_train.npy"), y_train.values)
    np.save(os.path.join(processed_dir, "y_test.npy"), y_test.values)
    
    # Save the preprocessor for later use
    import joblib
    joblib.dump(preprocessor, os.path.join(processed_dir, "preprocessor.pkl"))
    
    print("Preprocessing complete. Processed data saved.")
    
    return X_train_processed, X_test_processed, y_train, y_test, preprocessor

def load_and_preprocess_data(file_path, target_column='SettlementValue', test_size=0.2, random_state=42):
    """
    Load and preprocess data from CSV file.
    
    Parameters:
    -----------
    file_path : str
        Path to the input CSV file
    target_column : str
        Name of the target column
    test_size : float
        Proportion of data to use for testing
    random_state : int
        Random seed for reproducibility
    
    Returns:
    --------
    X_train, X_test, y_train, y_test, preprocessor
    """
    
    print(f"Loading data from {file_path}...")
    df = pd.read_csv(file_path)

    df = df.dropna(subset=[target_column])
    
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
        X, y, test_size=test_size, random_state=random_state
    )
    
    print(f"Training set shape: {X_train.shape}")
    print(f"Test set shape: {X_test.shape}")
    
    return X_train, X_test, y_train, y_test, preprocessor


if __name__ == "__main__":
    file_path = "data/Synthetic_Data_For_Students.csv"
    preprocess_data(file_path)