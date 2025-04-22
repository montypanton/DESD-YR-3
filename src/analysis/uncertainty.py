# src/analysis/uncertainty.py

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.isotonic import IsotonicRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import matplotlib.pyplot as plt
import os

def quantify_uncertainty(X_train, y_train, X_test, y_test, model, output_dir='results/uncertainty'):
    """
    Generate prediction intervals to quantify uncertainty in predictions.
    
    Parameters:
    -----------
    X_train : array-like
        Training feature data
    y_train : array-like
        Training target values
    X_test : array-like
        Test feature data
    y_test : array-like
        Test target values
    model : object
        Trained model with predict method
    output_dir : str
        Directory to save outputs
        
    Returns:
    --------
    dict
        Dictionary containing uncertainty metrics and predictions with intervals
    """
    print("Quantifying prediction uncertainty...")
    os.makedirs(output_dir, exist_ok=True)
    
    # Get point predictions from the model
    point_predictions = model.predict(X_test)
    
    # Train quantile regression models
    lower_model, median_model, upper_model = train_quantile_models(X_train, y_train)
    
    # Generate prediction intervals
    lower_bound = lower_model.predict(X_test)
    median_predictions = median_model.predict(X_test)
    upper_bound = upper_model.predict(X_test)
    
    # Calculate interval metrics
    coverage = np.mean((y_test >= lower_bound) & (y_test <= upper_bound)) * 100
    avg_interval_width = np.mean(upper_bound - lower_bound)
    
    print(f"80% Prediction interval coverage: {coverage:.2f}%")
    print(f"Average interval width: £{avg_interval_width:.2f}")
    
    # Create visualization of intervals
    visualize_intervals(y_test, point_predictions, lower_bound, upper_bound, output_dir)
    
    # Create DataFrame with predictions and intervals
    predictions_df = pd.DataFrame({
        'Actual': y_test,
        'Predicted': point_predictions,
        'Lower_Bound': lower_bound,
        'Upper_Bound': upper_bound,
        'Interval_Width': upper_bound - lower_bound,
        'Within_Interval': (y_test >= lower_bound) & (y_test <= upper_bound)
    })
    
    # Save predictions with intervals
    predictions_df.to_csv(os.path.join(output_dir, 'predictions_with_intervals.csv'), index=False)
    
    # Save models
    joblib.dump(lower_model, os.path.join(output_dir, '../..', 'models', 'quantile_lower_model.pkl'))
    joblib.dump(median_model, os.path.join(output_dir, '../..', 'models', 'quantile_median_model.pkl'))
    joblib.dump(upper_model, os.path.join(output_dir, '../..', 'models', 'quantile_upper_model.pkl'))
    
    # Create uncertainty analysis report
    create_uncertainty_report(predictions_df, coverage, avg_interval_width, output_dir)
    
    # Return results
    results = {
        'coverage': coverage,
        'avg_width': avg_interval_width,
        'predictions': predictions_df
    }
    
    return results

def train_quantile_models(X_train, y_train):
    """Train quantile regression models for lower, median, and upper bounds."""
    print("Training quantile regression models...")
    
    # Train model for lower bound (10th percentile)
    lower_model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.1,  # 10th percentile
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        random_state=42
    )
    lower_model.fit(X_train, y_train)
    
    # Train model for median (50th percentile)
    median_model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.5,  # 50th percentile
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        random_state=42
    )
    median_model.fit(X_train, y_train)
    
    # Train model for upper bound (90th percentile)
    upper_model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.9,  # 90th percentile
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        random_state=42
    )
    upper_model.fit(X_train, y_train)
    
    return lower_model, median_model, upper_model

def visualize_intervals(y_test, y_pred, lower_bound, upper_bound, output_dir):
    """Visualize prediction intervals."""
    # Sample a subset for clearer visualization
    np.random.seed(42)
    sample_size = min(100, len(y_test))
    indices = np.random.choice(len(y_test), sample_size, replace=False)
    indices = np.sort(indices)
    
    y_test_sample = y_test[indices]
    y_pred_sample = y_pred[indices]
    lower_bound_sample = lower_bound[indices]
    upper_bound_sample = upper_bound[indices]
    
    # Create interval plot
    plt.figure(figsize=(12, 6))
    
    # Plot prediction intervals
    plt.fill_between(range(sample_size), 
                     lower_bound_sample, 
                     upper_bound_sample, 
                     alpha=0.3, color='blue', label='80% Prediction Interval')
    
    # Plot actual values and predictions
    plt.plot(range(sample_size), y_test_sample, 'ro', markersize=4, label='Actual')
    plt.plot(range(sample_size), y_pred_sample, 'go', markersize=4, label='Predicted')
    
    plt.xlabel('Sample Index')
    plt.ylabel('Settlement Value')
    plt.title('Prediction Intervals for Settlement Values')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    plt.savefig(os.path.join(output_dir, 'prediction_intervals.png'))
    plt.close()
    
    # Create scatter plot with intervals - fixed version
    plt.figure(figsize=(10, 6))
    
    # Basic scatter plot
    plt.scatter(y_test, y_pred, alpha=0.5, color='blue', label='Predictions')
    
    # Add error bars for a subset of points for clarity
    subset_indices = np.random.choice(len(y_test), 50, replace=False)
    
    y_test_subset = y_test[subset_indices]
    y_pred_subset = y_pred[subset_indices]
    
    # Fix: Instead of using errorbar which doesn't accept negative values,
    # draw individual error lines for each point
    for i in range(len(y_test_subset)):
        actual = y_test_subset[i]
        predicted = y_pred_subset[i]
        lower = lower_bound[subset_indices[i]]
        upper = upper_bound[subset_indices[i]]
        
        # Draw vertical line from lower to upper bound
        plt.plot([actual, actual], [lower, upper], 'r-', alpha=0.3)
        
        # Draw a circle to mark the prediction point
        plt.plot(actual, predicted, 'ro', alpha=0.5, markersize=4)
    
    # Add a separate entry for the legend
    plt.plot([], [], 'r-', alpha=0.5, label='80% Intervals')
    
    # Add diagonal line
    min_val = min(min(y_test), min(y_pred))
    max_val = max(max(y_test), max(y_pred))
    plt.plot([min_val, max_val], [min_val, max_val], 'k--')
    
    plt.xlabel('Actual Settlement Values')
    plt.ylabel('Predicted Settlement Values')
    plt.title('Prediction Intervals on Actual vs Predicted Plot')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    plt.savefig(os.path.join(output_dir, 'interval_scatter.png'))
    plt.close()

def create_uncertainty_report(predictions_df, coverage, avg_width, output_dir):
    """Create comprehensive uncertainty analysis report."""
    # Calculate additional metrics
    coverage_by_value = predictions_df.groupby(pd.qcut(predictions_df['Actual'], 4))['Within_Interval'].mean() * 100
    avg_width_by_value = predictions_df.groupby(pd.qcut(predictions_df['Actual'], 4))['Interval_Width'].mean()
    
    relative_width = (predictions_df['Interval_Width'] / predictions_df['Actual']) * 100
    avg_relative_width = np.mean(relative_width)
    
    # Create histogram of interval widths
    plt.figure(figsize=(10, 6))
    plt.hist(predictions_df['Interval_Width'], bins=30, alpha=0.7)
    plt.axvline(x=avg_width, color='r', linestyle='--', label=f'Average: £{avg_width:.2f}')
    plt.xlabel('Interval Width')
    plt.ylabel('Frequency')
    plt.title('Distribution of Prediction Interval Widths')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'interval_width_distribution.png'))
    plt.close()
    
    # Create markdown report
    with open(os.path.join(output_dir, 'uncertainty_report.md'), 'w') as f:
        f.write("# Prediction Uncertainty Analysis\n\n")
        
        f.write("## Overview\n\n")
        f.write(f"- **80% Prediction interval coverage**: {coverage:.2f}%\n")
        f.write(f"- **Average interval width**: £{avg_width:.2f}\n")
        f.write(f"- **Average relative width**: {avg_relative_width:.2f}% of settlement value\n\n")
        
        f.write("## Coverage by Settlement Value\n\n")
        f.write("| Settlement Value Range | Coverage (%) | Avg Interval Width |\n")
        f.write("|------------------------|--------------|--------------------|\n")
        
        for (value_range, cov), width in zip(coverage_by_value.items(), avg_width_by_value):
            f.write(f"| {value_range} | {cov:.2f}% | £{width:.2f} |\n")
        
        f.write("\n## Visualizations\n\n")
        f.write("### Prediction Intervals for Sample Cases\n\n")
        f.write("![Prediction Intervals](prediction_intervals.png)\n\n")
        
        f.write("### Scatter Plot with Intervals\n\n")
        f.write("![Interval Scatter](interval_scatter.png)\n\n")
        
        f.write("### Distribution of Interval Widths\n\n")
        f.write("![Interval Width Distribution](interval_width_distribution.png)\n\n")
        
        f.write("## Interpretation\n\n")
        
        if abs(coverage - 80) < 5:
            f.write("The prediction intervals are well-calibrated, providing close to the expected 80% coverage. ")
        elif coverage < 75:
            f.write("The prediction intervals are too narrow, resulting in lower than expected coverage. ")
        else:
            f.write("The prediction intervals are wider than necessary, resulting in higher than expected coverage. ")
        
        f.write("This level of uncertainty quantification helps stakeholders understand the reliability of individual predictions ")
        f.write("and can be used to identify cases where additional information might be needed before making decisions.\n\n")
        
        f.write("## Recommendations\n\n")
        f.write("1. Consider the prediction interval when making settlement decisions, not just the point estimate\n")
        f.write("2. For cases with wide prediction intervals, gather additional information to reduce uncertainty\n")
        f.write("3. Monitor the coverage of prediction intervals over time to ensure they remain well-calibrated\n")

def load_and_preprocess_data(file_path, target_column='SettlementValue'):
    """Helper function to load and preprocess data from a csv file."""
    import pandas as pd
    import numpy as np
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split
    from sklearn.impute import SimpleImputer
    
    print(f"Loading data from {file_path}...")
    df = pd.read_csv(file_path)

    df = df.dropna(subset=[target_column])
    
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
    
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    return X_train_processed, X_test_processed, y_train.values, y_test.values

if __name__ == "__main__":
    # Example usage
    from sklearn.ensemble import GradientBoostingRegressor
    
    # Load and preprocess data
    X_train, X_test, y_train, y_test = load_and_preprocess_data('data/Synthetic_Data_For_Students.csv')
    
    # Train a model
    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Quantify uncertainty
    quantify_uncertainty(X_train, y_train, X_test, y_test, model)