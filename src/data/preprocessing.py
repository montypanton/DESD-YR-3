import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder, RobustScaler, PowerTransformer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD, PCA
from sklearn.feature_selection import SelectKBest, f_regression, mutual_info_regression, RFECV
from sklearn.ensemble import RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import re
from scipy import stats
import category_encoders as ce
from datetime import datetime
from functools import reduce

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
    
    # Apply preprocessing - FIXED: Pass y_train to fit_transform for target encoding
    X_train_processed = preprocessor.fit_transform(X_train, y_train)
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

def detect_anomalies(df, column, method='zscore', threshold=3):
    """
    Detect anomalies in a column using various methods.
    
    Parameters:
    -----------
    df : DataFrame
        Input dataframe
    column : str
        Column name to check for anomalies
    method : str
        Method to use ('zscore', 'iqr', 'isolation_forest')
    threshold : float
        Threshold for anomaly detection
    
    Returns:
    --------
    anomaly_indices : array
        Indices of detected anomalies
    """
    if column not in df.columns or df[column].isna().all():
        return np.array([])
    
    if method == 'zscore':
        z_scores = np.abs(stats.zscore(df[column].fillna(df[column].median())))
        return np.where(z_scores > threshold)[0]
    
    elif method == 'iqr':
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - threshold * IQR
        upper_bound = Q3 + threshold * IQR
        return df[(df[column] < lower_bound) | (df[column] > upper_bound)].index.values
    
    return np.array([])

def calculate_feature_importance(X, y, n_features=20):
    """
    Calculate feature importance using multiple methods and return consensus.
    
    Parameters:
    -----------
    X : DataFrame
        Feature dataframe
    y : Series
        Target variable
    n_features : int
        Number of top features to return
    
    Returns:
    --------
    top_features : list
        List of most important features
    """
    # Ensure X has no missing values for this analysis
    X_filled = X.fillna(X.median())
    
    # Method 1: Random Forest importance
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_filled, y)
    rf_importance = pd.Series(rf.feature_importances_, index=X.columns)
    
    # Method 2: Mutual Information
    mi_importance = pd.Series(mutual_info_regression(X_filled, y), index=X.columns)
    
    # Method 3: F-regression (linear correlation)
    f_importance = pd.Series(f_regression(X_filled, y)[0], index=X.columns)
    
    # Combine rankings
    rf_ranks = rf_importance.rank(ascending=False)
    mi_ranks = mi_importance.rank(ascending=False)
    f_ranks = f_importance.rank(ascending=False)
    
    # Average rankings (lower is better)
    avg_ranks = (rf_ranks + mi_ranks + f_ranks) / 3
    
    # Return top features
    return avg_ranks.sort_values().index[:n_features].tolist()

def extract_injury_prognosis_months(prognosis):
    """Extract the number of months from injury prognosis text"""
    if pd.isna(prognosis) or not isinstance(prognosis, str):
        return np.nan
    
    # Extract numbers from strings like "A. 1 month", "B. 2 months", etc.
    match = re.search(r'(\d+)', prognosis)
    if match:
        return int(match.group(1))
    return np.nan

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
        
        # Detect and log extreme values
        extreme_values = df[df[target_column] > upper_bound]
        if not extreme_values.empty:
            print(f"Found {len(extreme_values)} extreme values in {target_column}")
            print(f"Capping extreme {target_column} values at {upper_bound}")
            df[target_column] = df[target_column].clip(upper=upper_bound)

    # Only remove rows where target is missing
    df = df.dropna(subset=[target_column])
    
    # Identify missing values
    missing_counts = df.isnull().sum()
    cols_with_missing = missing_counts[missing_counts > 0]
    
    if not cols_with_missing.empty:
        print("\nMissing values per column:")
        for col, count in cols_with_missing.items():
            print(f"  {col}: {count} ({(count/len(df))*100:.2f}%)")
    
    print(f"\nData shape: {df.shape}")
    
    # ======= Domain-specific feature engineering =======
    
    # 1. Handle Injury_Prognosis - Extract months
    if 'Injury_Prognosis' in df.columns:
        df['Injury_Prognosis_Months'] = df['Injury_Prognosis'].apply(extract_injury_prognosis_months)
        print(f"Extracted Injury_Prognosis_Months feature")
    
    # 2. Calculate total special damages
    special_damage_cols = [col for col in df.columns if col.startswith('Special') and col != 'SpecialReduction']
    if special_damage_cols:
        # Fill missing values with 0 for totaling
        df['TotalSpecialDamages'] = df[special_damage_cols].fillna(0).sum(axis=1)
        # If there's a reduction column, subtract it
        if 'SpecialReduction' in df.columns:
            df['TotalSpecialDamages'] = df['TotalSpecialDamages'] - df['SpecialReduction'].fillna(0)
        print(f"Created TotalSpecialDamages feature")
    
    # 3. Calculate total general damages
    general_damage_cols = [col for col in df.columns if col.startswith('General')]
    if general_damage_cols:
        df['TotalGeneralDamages'] = df[general_damage_cols].fillna(0).sum(axis=1)
        print(f"Created TotalGeneralDamages feature")
    
    # 4. Case complexity features
    if 'Accident Date' in df.columns and 'Claim Date' in df.columns:
        try:
            df['Accident Date'] = pd.to_datetime(df['Accident Date'], errors='coerce')
            df['Claim Date'] = pd.to_datetime(df['Claim Date'], errors='coerce')
            df['Claim_Processing_Days'] = (df['Claim Date'] - df['Accident Date']).dt.days
            # Log-transform to handle skewness (add 1 to avoid log(0))
            df['Log_Claim_Processing_Days'] = np.log1p(df['Claim_Processing_Days'])
            print(f"Created claim processing time features")
        except Exception as e:
            print(f"Error creating claim processing features: {e}")
    
    # 5. Injury severity score
    injury_severity_mapping = {
        'A. 1 month': 1,
        'B. 2 months': 2,
        'C. 3 months': 3,
        'D. 4 months': 4,
        'E. 5 months': 5,
        'F. 6 months': 6,
        'G. 7 months': 7,
        'H. 8 months': 8,
        'I. 9 months': 9,
        'J. 10 months': 10,
        'K. 11 months': 11,
        'L. 12 months': 12,
        'O. 15 months': 15,
        'R. 18 months': 18,
        'S. 19 months': 19
    }
    
    if 'Injury_Prognosis' in df.columns:
        df['Injury_Severity_Score'] = df['Injury_Prognosis'].map(injury_severity_mapping)
        print(f"Created Injury_Severity_Score feature")
    
    # 6. Vehicle age vs. driver age ratio
    if 'Vehicle Age' in df.columns and 'Driver Age' in df.columns:
        # Fill missing with median
        veh_age_median = df['Vehicle Age'].median()
        driver_age_median = df['Driver Age'].median()
        
        df['Vehicle_Age_Filled'] = df['Vehicle Age'].fillna(veh_age_median)
        df['Driver_Age_Filled'] = df['Driver Age'].fillna(driver_age_median)
        
        # Create ratio (avoid division by zero)
        df['Vehicle_Driver_Age_Ratio'] = df['Vehicle_Age_Filled'] / df['Driver_Age_Filled'].replace(0, 0.1)
        print(f"Created Vehicle_Driver_Age_Ratio feature")
    
    # 7. Whiplash + Psychological injury interaction
    if 'Whiplash' in df.columns and 'Minor_Psychological_Injury' in df.columns:
        df['Whiplash_Psychological'] = ((df['Whiplash'] == 'Yes') & 
                                       (df['Minor_Psychological_Injury'] == 'Yes')).astype(int)
        print(f"Created Whiplash_Psychological interaction feature")
    
    # 8. Cluster-based features (capturing combinations of numeric variables)
    try:
        numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
        # Filter to include only columns with limited missing values
        valid_numeric_cols = [col for col in numeric_cols 
                            if df[col].notna().sum() > len(df) * 0.8 
                            and col != target_column]
        
        if len(valid_numeric_cols) >= 3:  # Need at least 3 columns for meaningful clustering
            # Fill missing with median for clustering
            cluster_df = df[valid_numeric_cols].fillna(df[valid_numeric_cols].median())
            
            # Standardize data for clustering
            from sklearn.preprocessing import StandardScaler
            cluster_data = StandardScaler().fit_transform(cluster_df)
            
            # Find optimal number of clusters (2-10)
            silhouette_scores = []
            max_clusters = min(10, len(df) // 10)  # Don't create too many clusters for small datasets
            
            for n_clusters in range(2, max_clusters + 1):
                kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
                cluster_labels = kmeans.fit_predict(cluster_data)
                silhouette_avg = silhouette_score(cluster_data, cluster_labels)
                silhouette_scores.append(silhouette_avg)
            
            optimal_clusters = silhouette_scores.index(max(silhouette_scores)) + 2
            
            # Create clusters with optimal number
            kmeans = KMeans(n_clusters=optimal_clusters, random_state=random_state, n_init=10)
            df['ClaimProfile_Cluster'] = kmeans.fit_predict(cluster_data)
            print(f"Created ClaimProfile_Cluster feature with {optimal_clusters} clusters")
    except Exception as e:
        print(f"Error creating cluster features: {e}")
    
    # Identify features with high correlation to target
    try:
        numeric_df = df.select_dtypes(include=['float64', 'int64'])
        # Remove target column from numeric_df to avoid self-correlation
        numeric_df = numeric_df.drop(columns=[target_column], errors='ignore')
        
        correlations = numeric_df.corrwith(df[target_column]).abs().sort_values(ascending=False)
        top_corr = correlations[correlations > 0.2]
        
        if len(top_corr) > 0:
            print("\nTop correlated features with target:")
            for col, corr in top_corr.items():
                print(f"  {col}: {corr:.4f}")
    except Exception as e:
        print(f"Error calculating correlations: {e}")
    
    # Separate target and features
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
            # Extract date components
            X[f"{date_col}_Year"] = X[date_col].dt.year
            X[f"{date_col}_Month"] = X[date_col].dt.month
            X[f"{date_col}_Day"] = X[date_col].dt.day
            X[f"{date_col}_DayOfWeek"] = X[date_col].dt.dayofweek
            X[f"{date_col}_Quarter"] = X[date_col].dt.quarter
            X[f"{date_col}_IsWeekend"] = X[date_col].dt.dayofweek.isin([5, 6]).astype(int)
            
            # Add season
            month = X[date_col].dt.month
            X[f"{date_col}_IsSummer"] = ((month >= 6) & (month <= 8)).astype(int)
            X[f"{date_col}_IsWinter"] = ((month == 12) | (month <= 2)).astype(int)
            
            # Days since specific reference date (e.g., start of dataset)
            ref_date = pd.Timestamp('2020-01-01')
            X[f"{date_col}_DaysSinceRef"] = (X[date_col] - ref_date).dt.days
            
            # Add these new features to numeric list
            numeric_features.extend([
                f"{date_col}_Year", f"{date_col}_Month", f"{date_col}_Day",
                f"{date_col}_DayOfWeek", f"{date_col}_Quarter", f"{date_col}_IsWeekend",
                f"{date_col}_IsSummer", f"{date_col}_IsWinter", f"{date_col}_DaysSinceRef"
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
    
    # Create interaction features for categorical variables
    interactions = []
    cat_interaction_candidates = [
        ('Dominant injury', 'AccidentType'),
        ('Dominant injury', 'Vehicle Type'),
        ('AccidentType', 'Weather Conditions'),
        ('AccidentType', 'Vehicle Type'),
        ('Whiplash', 'Dominant injury')
    ]
    
    for col1, col2 in cat_interaction_candidates:
        if col1 in X.columns and col2 in X.columns:
            interaction_name = f"{col1}_{col2}_interaction"
            X[interaction_name] = X[col1].astype(str) + "_" + X[col2].astype(str)
            categorical_features.append(interaction_name)
            interactions.append(interaction_name)
    
    if interactions:
        print(f"Created {len(interactions)} categorical interaction features")
    
    # Add polynomial features for important numeric columns
    # Focus on columns likely to have non-linear relationship with target
    poly_candidates = [
        'Injury_Prognosis_Months', 'Injury_Severity_Score', 'Driver Age', 
        'Vehicle Age', 'TotalSpecialDamages', 'TotalGeneralDamages',
        'Number of Passengers'
    ]
    
    poly_features = [f for f in poly_candidates if f in numeric_features]
    added_poly_features = []
    
    for feature in poly_features:
        if feature in X.columns:
            X[f'{feature}_squared'] = X[feature] ** 2
            X[f'{feature}_cubed'] = X[feature] ** 3
            numeric_features.extend([f'{feature}_squared', f'{feature}_cubed'])
            added_poly_features.extend([f'{feature}_squared', f'{feature}_cubed'])
    
    if added_poly_features:
        print(f"Created {len(added_poly_features)} polynomial features")
    
    # Create ratio features for special damages vs general damages
    if 'TotalSpecialDamages' in X.columns and 'TotalGeneralDamages' in X.columns:
        X['SpecialToGeneralRatio'] = X['TotalSpecialDamages'] / (X['TotalGeneralDamages'] + 1)  # avoid div by zero
        numeric_features.append('SpecialToGeneralRatio')
    
    # Update feature lists to include only columns that exist
    numeric_features = [col for col in numeric_features if col in X.columns]
    categorical_features = [col for col in categorical_features if col in X.columns]
    text_features = [col for col in text_features if col in X.columns]
    
    print(f"\nFeature counts after engineering:")
    print(f"Numeric features: {len(numeric_features)}")
    print(f"Categorical features: {len(categorical_features)}")
    print(f"Text features: {len(text_features)}")
    
    # Create more sophisticated preprocessing pipelines
    
    # 1. Numeric pipeline with advanced imputation and scaling
    numeric_transformer = Pipeline(steps=[
        ('imputer', KNNImputer(n_neighbors=5, weights='distance')), 
        ('power', PowerTransformer(method='yeo-johnson', standardize=True))  # Normalize to Gaussian distribution
    ])
    
    # 2. Categorical pipeline with target encoding for high-cardinality features
    # Identify high/low cardinality categorical features
    high_card_features = []
    low_card_features = []
    
    for col in categorical_features:
        if X[col].nunique() > 10:  # Threshold for high cardinality
            high_card_features.append(col)
        else:
            low_card_features.append(col)
    
    # Create separate pipelines based on cardinality
    low_card_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    high_card_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        # Use target encoding for high cardinality features
        ('target_encoder', ce.TargetEncoder())
    ])
    
    # 3. Text pipeline with TF-IDF and dimensionality reduction
    text_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='')),
        ('tfidf', TfidfVectorizer(
            max_features=100, 
            stop_words='english',
            ngram_range=(1, 2),  # Include bigrams
            min_df=2,  # Minimum document frequency
            max_df=0.9  # Maximum document frequency
        )),
        ('svd', TruncatedSVD(n_components=min(20, len(X) // 10)))  # More components
    ])
    
    # Combine transformers
    transformer_list = [
        ('num', numeric_transformer, numeric_features)
    ]
    
    # Add categorical transformers if needed
    if low_card_features:
        transformer_list.append(('cat_low', low_card_transformer, low_card_features))
    
    if high_card_features:
        transformer_list.append(('cat_high', high_card_transformer, high_card_features))
    
    # Add text transformer if text features exist
    if text_features:
        for i, text_feature in enumerate(text_features):
            transformer_list.append(
                (f'text_{i}', text_transformer, [text_feature])
            )
    
    preprocessor = ColumnTransformer(transformers=transformer_list)
    
    # Feature selection step to automatically select best features
    preprocessor = Pipeline([
        ('preprocessor', preprocessor),
        # Use SelectKBest to select most important features
        ('feature_selection', SelectKBest(f_regression, k=min(100, len(X.columns))))
    ])
    
    # Stratified split to handle potential data imbalance
    # Create artificial bins for stratification
    y_binned = pd.qcut(y, q=10, duplicates='drop', labels=False)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y_binned
    )
    
    print(f"\nTraining set shape: {X_train.shape}")
    print(f"Test set shape: {X_test.shape}")
    
    return X_train, X_test, y_train, y_test, preprocessor


if __name__ == "__main__":
    file_path = "data/Synthetic_Data_For_Students.csv"
    preprocess_data(file_path)