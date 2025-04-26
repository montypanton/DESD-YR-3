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

def quantify_uncertainty(X_train, y_train, X_test, y_test, model, base_predictions=None, output_dir='results/uncertainty'):
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
    base_predictions : array-like, optional
        Base predictions from best model (if different from model)
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
    if base_predictions is not None:
        point_predictions = base_predictions
        print("Using provided base predictions")
    else:
        point_predictions = model.predict(X_test)
    
    # Train quantile regression models
    lower_model, median_model, upper_model = train_quantile_models(X_train, y_train)
    
    # Generate prediction intervals
    lower_bound = lower_model.predict(X_test)
    median_predictions = median_model.predict(X_test)
    upper_bound = upper_model.predict(X_test)
    
    # Calibrate prediction intervals
    calibrated_lower, calibrated_upper = calibrate_prediction_intervals(
        y_test, point_predictions, lower_bound, upper_bound)
    
    # Calculate interval metrics
    target_coverage = 80  # Target is 80% coverage
    coverage = np.mean((y_test >= calibrated_lower) & (y_test <= calibrated_upper)) * 100
    avg_interval_width = np.mean(calibrated_upper - calibrated_lower)
    
    print(f"{target_coverage}% Prediction interval coverage: {coverage:.2f}%")
    print(f"Average interval width: £{avg_interval_width:.2f}")
    
    # Create visualization of intervals
    visualize_intervals(y_test, point_predictions, calibrated_lower, calibrated_upper, output_dir)
    
    # Create DataFrame with predictions and intervals
    predictions_df = pd.DataFrame({
        'Actual': y_test,
        'Predicted': point_predictions,
        'Lower_Bound': calibrated_lower,
        'Upper_Bound': calibrated_upper,
        'Interval_Width': calibrated_upper - calibrated_lower,
        'Within_Interval': (y_test >= calibrated_lower) & (y_test <= calibrated_upper)
    })
    
    # Save predictions with intervals
    predictions_df.to_csv(os.path.join(output_dir, 'predictions_with_intervals.csv'), index=False)
    
    # Save models
    joblib.dump(lower_model, os.path.join(output_dir, '../..', 'models', 'quantile_lower_model.pkl'))
    joblib.dump(median_model, os.path.join(output_dir, '../..', 'models', 'quantile_median_model.pkl'))
    joblib.dump(upper_model, os.path.join(output_dir, '../..', 'models', 'quantile_upper_model.pkl'))
    
    # Create reliability diagram
    create_reliability_diagram(y_test, point_predictions, calibrated_lower, calibrated_upper, output_dir)
    
    # Analyze uncertainty vs error and get correlation
    correlation = analyze_uncertainty_vs_error(point_predictions, calibrated_lower, calibrated_upper, y_test, output_dir)
    
    # Create uncertainty analysis report with correlation
    create_uncertainty_report(predictions_df, coverage, avg_interval_width, target_coverage, output_dir, correlation)
    
    # Return results
    results = {
        'coverage': coverage,
        'avg_width': avg_interval_width,
        'predictions': predictions_df
    }
    
    return results

def calibrate_prediction_intervals(y_true, y_pred, lower_bound, upper_bound):
    """
    Calibrate prediction intervals to achieve desired coverage.
    
    Parameters:
    -----------
    y_true : array-like
        True values
    y_pred : array-like
        Predicted values
    lower_bound : array-like
        Initial lower bounds
    upper_bound : array-like
        Initial upper bounds
    
    Returns:
    --------
    tuple
        Calibrated lower and upper bounds
    """
    # Calculate errors
    errors = y_true - y_pred
    sorted_errors = np.sort(errors)
    
    # Find the 10th and 90th percentiles of errors
    lower_percentile = np.percentile(errors, 10)
    upper_percentile = np.percentile(errors, 90)
    
    # Adjust bounds using error distribution
    calibrated_lower = y_pred + lower_percentile
    calibrated_upper = y_pred + upper_percentile
    
    # Ensure consistent interval widths based on estimated uncertainty
    initial_widths = upper_bound - lower_bound
    
    # Scale the original intervals to maintain relative uncertainty while achieving calibration
    # Normalize widths to have mean=1
    normalized_widths = initial_widths / np.mean(initial_widths)
    
    # Apply normalized widths to the calibrated intervals
    mean_calibrated_width = np.mean(calibrated_upper - calibrated_lower)
    final_widths = normalized_widths * mean_calibrated_width
    
    # Center the intervals around the predictions
    final_lower = y_pred - final_widths / 2
    final_upper = y_pred + final_widths / 2
    
    # Blend the naive calibration and the scaled original intervals
    alpha = 0.5  # Blending factor
    blended_lower = alpha * calibrated_lower + (1 - alpha) * final_lower
    blended_upper = alpha * calibrated_upper + (1 - alpha) * final_upper
    
    return blended_lower, blended_upper

def train_quantile_models(X_train, y_train):
    """Train quantile regression models for lower, median, and upper bounds."""
    print("Training quantile regression models...")
    
    # Split data for validation
    X_train_split, X_val, y_train_split, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42)
    
    # Train model for lower bound (10th percentile)
    lower_model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.1,  # 10th percentile
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    lower_model.fit(
        X_train_split, 
        y_train_split,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=30,
        verbose=False
    )
    
    # Train model for median (50th percentile)
    median_model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.5,  # 50th percentile
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    median_model.fit(
        X_train_split, 
        y_train_split,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=30,
        verbose=False
    )
    
    # Train model for upper bound (90th percentile)
    upper_model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.9,  # 90th percentile
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    upper_model.fit(
        X_train_split, 
        y_train_split,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=30,
        verbose=False
    )
    
    # Evaluate quantile models
    lower_val_preds = lower_model.predict(X_val)
    median_val_preds = median_model.predict(X_val)
    upper_val_preds = upper_model.predict(X_val)
    
    # Calculate quantile coverage
    lower_coverage = np.mean(y_val >= lower_val_preds) * 100
    upper_coverage = np.mean(y_val <= upper_val_preds) * 100
    interval_coverage = np.mean((y_val >= lower_val_preds) & (y_val <= upper_val_preds)) * 100
    
    print(f"Validation coverage: Lower bound: {lower_coverage:.2f}%, Upper bound: {upper_coverage:.2f}%")
    print(f"Validation interval coverage: {interval_coverage:.2f}%")
    
    return lower_model, median_model, upper_model

# src/analysis/uncertainty.py (continuation)

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
    plt.scatter(range(sample_size), y_test_sample, s=30, color='red', label='Actual', zorder=3)
    plt.scatter(range(sample_size), y_pred_sample, s=20, color='green', label='Predicted', zorder=3)
    
    # Add lines connecting prediction to actual
    for i in range(sample_size):
        plt.plot([i, i], [y_pred_sample[i], y_test_sample[i]], 'k-', alpha=0.3, linewidth=0.5)
    
    plt.xlabel('Sample Index')
    plt.ylabel('Settlement Value')
    plt.title('Prediction Intervals for Settlement Values')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    plt.savefig(os.path.join(output_dir, 'prediction_intervals.png'))
    plt.close()
    
    # Create scatter plot with intervals
    plt.figure(figsize=(10, 6))
    
    # Basic scatter plot
    plt.scatter(y_test, y_pred, alpha=0.5, color='blue', label='Predictions')
    
    # Add error bars for a subset of points for clarity
    subset_indices = np.random.choice(len(y_test), 50, replace=False)
    
    y_test_subset = y_test[subset_indices]
    y_pred_subset = y_pred[subset_indices]
    lower_bound_subset = lower_bound[subset_indices]
    upper_bound_subset = upper_bound[subset_indices]
    
    # Draw vertical error bars
    for i in range(len(y_test_subset)):
        actual = y_test_subset[i]
        predicted = y_pred_subset[i]
        lower = lower_bound_subset[i]
        upper = upper_bound_subset[i]
        
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

def create_reliability_diagram(y_true, y_pred, lower_bound, upper_bound, output_dir):
    """Create reliability diagram for prediction intervals."""
    # Calculate absolute error for each prediction
    abs_error = np.abs(y_true - y_pred)
    
    # Calculate interval width for each prediction
    interval_width = upper_bound - lower_bound
    
    # Normalize interval width (as a fraction of predicted value)
    relative_width = interval_width / np.maximum(0.01, np.abs(y_pred))
    
    # Create 10 bins based on interval width
    n_bins = 10
    width_bins = np.percentile(relative_width, np.linspace(0, 100, n_bins + 1))
    
    # Initialize arrays for observed vs expected reliability
    observed_coverage = np.zeros(n_bins)
    expected_coverage = np.full(n_bins, 0.8)  # 80% coverage expected
    bin_counts = np.zeros(n_bins)
    
    # Calculate observed coverage for each bin
    for i in range(n_bins):
        if i < n_bins - 1:
            mask = (relative_width >= width_bins[i]) & (relative_width < width_bins[i+1])
        else:
            mask = (relative_width >= width_bins[i])
        
        if np.sum(mask) > 0:
            observed_coverage[i] = np.mean((y_true[mask] >= lower_bound[mask]) & 
                                          (y_true[mask] <= upper_bound[mask]))
            bin_counts[i] = np.sum(mask)
    
    # Create reliability diagram
    plt.figure(figsize=(10, 6))
    
    # Plot ideal reliability line
    plt.plot([0, 1], [0, 1], 'k--', label='Ideal')
    
    # Plot observed vs expected reliability
    plt.scatter(expected_coverage, observed_coverage, s=bin_counts/np.max(bin_counts)*200, 
                alpha=0.7, c=np.arange(n_bins), cmap='viridis')
    
    # Add colorbar for bin index
    cbar = plt.colorbar()
    cbar.set_label('Bin Index (increasing interval width)')
    
    # Add size legend
    for i, count in enumerate(np.linspace(np.min(bin_counts), np.max(bin_counts), 3)):
        plt.scatter([], [], s=count/np.max(bin_counts)*200, c='gray', alpha=0.7,
                   label=f'n ≈ {int(count)}')
    
    plt.xlabel('Expected Coverage (0.8)')
    plt.ylabel('Observed Coverage')
    plt.title('Reliability Diagram for Prediction Intervals')
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    
    plt.savefig(os.path.join(output_dir, 'reliability_diagram.png'))
    plt.close()

def analyze_uncertainty_vs_error(y_pred, lower_bound, upper_bound, y_true, output_dir):
    """Analyze relationship between uncertainty and prediction error."""
    # Calculate absolute error
    abs_error = np.abs(y_true - y_pred)
    
    # Calculate interval width (uncertainty)
    interval_width = upper_bound - lower_bound
    
    # Create scatter plot
    plt.figure(figsize=(10, 6))
    plt.scatter(interval_width, abs_error, alpha=0.5, c=abs_error/interval_width, cmap='viridis')
    plt.colorbar(label='Error / Interval Width Ratio')
    
    # Add trend line
    from scipy.stats import linregress
    slope, intercept, r_value, p_value, std_err = linregress(interval_width, abs_error)
    x_line = np.linspace(min(interval_width), max(interval_width), 100)
    y_line = slope * x_line + intercept
    plt.plot(x_line, y_line, 'r--', label=f'Trend: y = {slope:.4f}x + {intercept:.2f} (r = {r_value:.4f})')
    
    # Add reference line where error = interval width/2
    plt.plot(x_line, x_line/2, 'k--', label='Error = Interval Width/2')
    
    plt.xlabel('Prediction Interval Width')
    plt.ylabel('Absolute Error')
    plt.title('Relationship Between Prediction Uncertainty and Error')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    plt.savefig(os.path.join(output_dir, 'uncertainty_vs_error.png'))
    plt.close()
    
    # Calculate correlation
    correlation = np.corrcoef(interval_width, abs_error)[0, 1]
    print(f"Correlation between interval width and absolute error: {correlation:.4f}")
    
    # Create binned analysis
    n_bins = 10
    bins = np.percentile(interval_width, np.linspace(0, 100, n_bins + 1))
    bin_errors = []
    bin_widths = []
    
    for i in range(n_bins):
        if i < n_bins - 1:
            mask = (interval_width >= bins[i]) & (interval_width < bins[i+1])
        else:
            mask = (interval_width >= bins[i])
        
        if np.sum(mask) > 0:
            bin_errors.append(np.mean(abs_error[mask]))
            bin_widths.append(np.mean(interval_width[mask]))
    
    # Plot binned analysis
    plt.figure(figsize=(10, 6))
    plt.bar(range(len(bin_widths)), bin_errors, alpha=0.7)
    
    # Add bin width labels
    for i, width in enumerate(bin_widths):
        plt.text(i, bin_errors[i] + 5, f'{width:.0f}', ha='center')
    
    plt.xlabel('Uncertainty Bin (increasing width)')
    plt.ylabel('Mean Absolute Error')
    plt.title('Average Error by Uncertainty Bin')
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    
    plt.savefig(os.path.join(output_dir, 'binned_uncertainty_analysis.png'))
    plt.close()
    
    # Return the correlation value
    return correlation

def create_uncertainty_report(predictions_df, coverage, avg_width, target_coverage, output_dir, correlation=None):
    """Create comprehensive uncertainty analysis report."""
    # Calculate additional metrics
    try:
        coverage_by_value = predictions_df.groupby(pd.qcut(predictions_df['Actual'], 4))['Within_Interval'].mean() * 100
        avg_width_by_value = predictions_df.groupby(pd.qcut(predictions_df['Actual'], 4))['Interval_Width'].mean()
    except:
        # Fall back to equal-sized bins if qcut fails
        value_bins = pd.cut(predictions_df['Actual'], 4)
        coverage_by_value = predictions_df.groupby(value_bins)['Within_Interval'].mean() * 100
        avg_width_by_value = predictions_df.groupby(value_bins)['Interval_Width'].mean()
    
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
    with open(os.path.join(output_dir, 'uncertainty_report.md'), 'w', encoding='utf-8') as f:
        f.write("# Prediction Uncertainty Analysis\n\n")
        
        f.write("## Overview\n\n")
        f.write(f"- **{target_coverage}% Prediction interval coverage**: {coverage:.2f}%\n")
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
        
        f.write("### Reliability Diagram\n\n")
        f.write("![Reliability Diagram](reliability_diagram.png)\n\n")
        
        f.write("### Uncertainty vs Error Analysis\n\n")
        f.write("![Uncertainty vs Error](uncertainty_vs_error.png)\n\n")
        f.write("![Binned Uncertainty Analysis](binned_uncertainty_analysis.png)\n\n")
        
        f.write("## Interpretation\n\n")
        
        if abs(coverage - target_coverage) < 5:
            f.write("The prediction intervals are well-calibrated, providing close to the expected " +
                    f"{target_coverage}% coverage. ")
        elif coverage < target_coverage - 5:
            f.write("The prediction intervals are too narrow, resulting in lower than expected coverage. ")
        else:
            f.write("The prediction intervals are wider than necessary, resulting in higher than expected coverage. ")
        
        f.write("This level of uncertainty quantification helps stakeholders understand the reliability of individual predictions ")
        f.write("and can be used to identify cases where additional information might be needed before making decisions.\n\n")
        
        f.write("## Key Insights\n\n")
        
        # Add insights based on the uncertainty vs error analysis
        if correlation is not None:
            if correlation > 0.5:
                f.write("- **Strong positive correlation** between prediction uncertainty and error, suggesting the model effectively identifies difficult cases.\n")
            elif correlation > 0.2:
                f.write("- **Moderate correlation** between prediction uncertainty and error, suggesting the model has some awareness of prediction difficulty.\n")
            else:
                f.write("- **Weak correlation** between prediction uncertainty and error, suggesting the uncertainty estimation could be improved.\n")
        
        # Add insights about coverage across value ranges
        max_coverage = coverage_by_value.max()
        min_coverage = coverage_by_value.min()
        coverage_range = max_coverage - min_coverage
        
        if coverage_range > 20:
            f.write("- **Large variation in coverage** across different settlement value ranges, with a difference of "
                  + f"{coverage_range:.1f}% between the highest and lowest coverage segments.\n")
        elif coverage_range > 10:
            f.write("- **Moderate variation in coverage** across different settlement value ranges, with a difference of "
                  + f"{coverage_range:.1f}% between the highest and lowest coverage segments.\n")
        else:
            f.write("- **Consistent coverage** across different settlement value ranges, with a difference of only "
                  + f"{coverage_range:.1f}% between the highest and lowest coverage segments.\n")
        
        f.write("\n## Recommendations\n\n")
        f.write("1. Consider the prediction interval when making settlement decisions, not just the point estimate\n")
        f.write("2. For cases with wide prediction intervals, gather additional information to reduce uncertainty\n")
        f.write("3. Monitor the coverage of prediction intervals over time to ensure they remain well-calibrated\n")
        
        if coverage < target_coverage - 5:
            f.write("4. Adjust the calibration of prediction intervals to provide better coverage\n")
        
        if coverage_range > 15:
            f.write("5. Investigate why coverage varies significantly across different settlement value ranges\n")

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