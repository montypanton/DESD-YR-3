import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder, RobustScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
import re
from scipy import stats

def preprocess_data(file_path, target_column='SettlementValue', test_size=0.2, random_state=42):
    """
    Preprocess the data and save train/test splits with enhanced feature engineering.
    
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
    Load and preprocess data from CSV file with enhanced feature engineering.
    
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

    # Make a copy of the original dataframe for later use
    df_original = df.copy()
    
    # Handle outliers in target variable
    if target_column in df.columns:
        # Identify outliers using IQR method
        Q1 = df[target_column].quantile(0.25)
        Q3 = df[target_column].quantile(0.75)
        IQR = Q3 - Q1
        upper_bound = Q3 + 3 * IQR
        
        # Cap extreme values rather than removing them
        df[target_column] = df[target_column].clip(upper=upper_bound)
        print(f"Capped extreme {target_column} values at {upper_bound}")

    # Only remove rows where target is missing
    df = df.dropna(subset=[target_column])
    
    print(f"Data shape: {df.shape}")
    print(f"Data columns: {df.columns.tolist()}")
    print(f"Missing values: {df.isnull().sum().sum()}")
    
    y = df[target_column]
    X = df.drop(columns=[target_column])
    
    # Identify column types
    numeric_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    categorical_features = X.select_dtypes(include=['object', 'category']).columns.tolist()
    
    # Identify text columns for NLP processing (those with longer strings)
    text_features = []
    for col in categorical_features:
        # Check if column contains longer text descriptions
        if col in X.columns and X[col].astype(str).str.len().mean() > 30:
            text_features.append(col)
    
    # Remove text features from categorical list
    categorical_features = [col for col in categorical_features if col not in text_features]
    
    # Enhanced date processing
    date_columns = [col for col in X.columns if 'Date' in col]
    for date_col in date_columns:
        if date_col in X.columns:
            X[date_col] = pd.to_datetime(X[date_col], errors='coerce')
            X[f"{date_col}_Year"] = X[date_col].dt.year
            X[f"{date_col}_Month"] = X[date_col].dt.month
            X[f"{date_col}_Day"] = X[date_col].dt.day
            
            # Add day of week
            X[f"{date_col}_DayOfWeek"] = X[date_col].dt.dayofweek
            
            # Add quarter
            X[f"{date_col}_Quarter"] = X[date_col].dt.quarter
            
            # Add is_weekend flag
            X[f"{date_col}_IsWeekend"] = X[date_col].dt.dayofweek.isin([5, 6]).astype(int)
            
            # Add these new features to numeric list
            numeric_features.extend([
                f"{date_col}_Year", f"{date_col}_Month", f"{date_col}_Day",
                f"{date_col}_DayOfWeek", f"{date_col}_Quarter", f"{date_col}_IsWeekend"
            ])
    
    # Calculate time difference between dates if multiple date columns exist
    if len(date_columns) >= 2:
        for i in range(len(date_columns)):
            for j in range(i+1, len(date_columns)):
                # Calculate days difference between dates
                diff_col_name = f"{date_columns[i]}_to_{date_columns[j]}_days"
                X[diff_col_name] = (X[date_columns[j]] - X[date_columns[i]]).dt.days
                numeric_features.append(diff_col_name)
    
    # Drop original date columns after extracting features
    X = X.drop(columns=date_columns)
    
    # Add interaction terms between key features
    # Example: interaction between injury type and accident type
    if 'Dominant injury' in X.columns and 'AccidentType' in X.columns:
        X['Injury_Accident_Interaction'] = X['Dominant injury'].astype(str) + "_" + X['AccidentType'].astype(str)
        categorical_features.append('Injury_Accident_Interaction')
    
    # Add polynomial features for important numeric columns
    poly_features = ['SpecialHealthExpenses', 'SpecialEarningsLoss', 'Driver Age']
    poly_features = [f for f in poly_features if f in numeric_features]
    
    for feature in poly_features:
        if feature in X.columns:
            X[f'{feature}_squared'] = X[feature] ** 2
            numeric_features.append(f'{feature}_squared')
    
    # Update feature lists
    numeric_features = [col for col in numeric_features if col in X.columns]
    categorical_features = [col for col in categorical_features if col in X.columns]
    text_features = [col for col in text_features if col in X.columns]
    
    print(f"Numeric features: {len(numeric_features)}")
    print(f"Categorical features: {len(categorical_features)}")
    print(f"Text features: {len(text_features)}")
    
    # Create more sophisticated preprocessing pipelines
    
    # 1. Numeric pipeline with KNN imputation and robust scaling
    numeric_transformer = Pipeline(steps=[
        ('imputer', KNNImputer(n_neighbors=5)), 
        ('scaler', RobustScaler())  # More robust to outliers
    ])
    
    # 2. Categorical pipeline
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    # 3. Text pipeline with TF-IDF and dimensionality reduction
    text_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='')),
        ('tfidf', TfidfVectorizer(max_features=100, stop_words='english')),
        ('svd', TruncatedSVD(n_components=10))  # Reduce dimensionality for efficiency
    ])
    
    # Combine transformers
    transformer_list = [
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ]
    
    # Add text transformer if text features exist
    if text_features:
        for i, text_feature in enumerate(text_features):
            transformer_list.append(
                (f'text_{i}', text_transformer, [text_feature])
            )
    
    preprocessor = ColumnTransformer(transformers=transformer_list)
    
    # Stratified split to handle potential data imbalance
    # Create artificial bins for stratification
    y_binned = pd.qcut(y, q=10, duplicates='drop', labels=False)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y_binned
    )
    
    print(f"Training set shape: {X_train.shape}")
    print(f"Test set shape: {X_test.shape}")
    
    return X_train, X_test, y_train, y_test, preprocessor


if __name__ == "__main__":
    file_path = "data/Synthetic_Data_For_Students.csv"
    preprocess_data(file_path)