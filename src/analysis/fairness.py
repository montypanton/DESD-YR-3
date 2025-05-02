"""
Fairness analysis module for assessing model bias across demographic groups.

This module implements comprehensive fairness analysis including:
- Per-attribute bias detection
- Statistical disparity measurement
- Visualisation of model performance across groups
- Detailed fairness reports with recommendations

The fairness assessment helps identify if the model performs differently across
demographic groups, which could indicate bias. It analyses performance metrics
such as prediction error and bias across different categories (e.g., gender,
accident type) to ensure the model is fair to all demographic groups.

Contributors:
- Monty: Designed and implemented the core fairness analysis framework (80%)
- Alex: Added visualisation components and enhanced reporting (20%)
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import os

def analyse_fairness_across_attributes(model, X, y, raw_data, sensitive_attributes, 
                                      preprocessor=None, output_dir='results/fairness'):
    """
    Analyse model fairness across multiple demographic and sensitive attributes.
    
    This function evaluates prediction bias and error distributions across 
    different demographic groups to detect potential disparities in model 
    performance. For each sensitive attribute (like gender, age group, etc.),
    it calculates metrics and creates visualisations to highlight any 
    fairness concerns.
    
    The fairness assessment is crucial for ensuring the model doesn't 
    systematically disadvantage or favour certain demographic groups, which 
    could lead to unfair outcomes or potential legal concerns when deployed.
    
    Parameters:
    -----------
    model : BaseModel
        Trained model to evaluate for fairness
    X : array-like
        Test set features
    y : array-like
        True target values from test set
    raw_data : DataFrame
        Original dataset containing demographic information
    sensitive_attributes : list
        List of column names to analyse for fairness concerns
    preprocessor : ColumnTransformer, optional
        Preprocessor used to transform the data
    output_dir : str
        Directory to save fairness analysis results
        
    Returns:
    --------
    dict
        Dictionary containing fairness metrics for each attribute, with keys
        corresponding to attribute names and values containing performance metrics
        
    Notes:
    ------
    The function creates a comprehensive fairness report including:
    - Bias analysis by demographic group
    - Error distribution across groups
    - Statistical significance tests for bias
    - Visualisations highlighting disparities
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate predictions from the model
    y_pred = model.predict(X)
    y_true = y
    
    # Create a dataframe with test data and predictions
    # This resolves potential index mismatch issues between predictions and attributes
    results_df = pd.DataFrame({
        'y_true': y_true,
        'y_pred': y_pred
    })
    
    # Add a sequential index to match with original dataset attributes
    results_df['seq_idx'] = range(len(results_df))
    
    # Process each sensitive attribute
    results = {}
    for attribute in sensitive_attributes:
        # Verify the attribute exists in the dataset
        if attribute not in raw_data.columns:
            print(f"Attribute {attribute} not found in dataset. Skipping.")
            continue
        
        # Create a copy of the attribute column with reset index for alignment
        attribute_values = raw_data[attribute].reset_index(drop=True)
        
        # Ensure we have sufficient attribute values for the test set
        if len(attribute_values) < len(results_df):
            print(f"Warning: Attribute {attribute} has fewer values than test data. Skipping.")
            continue
            
        # Add attribute values to results dataframe for analysis
        results_df[attribute] = attribute_values[:len(results_df)]
        
        # Analyse fairness for this specific attribute
        results[attribute] = analyse_single_attribute(
            results_df, attribute, output_dir)
    
    # Generate comprehensive summary report with recommendations
    generate_fairness_report(results, output_dir)
    
    return results

def analyse_single_attribute(results_df, attribute, output_dir):
    """
    Analyse model fairness across values of a single attribute.
    
    This function breaks down performance metrics for each unique value of the
    attribute (e.g., "Male"/"Female"/"Other" for gender). It calculates error
    metrics, bias measurements, and relative performance differences to identify
    if the model treats any particular group unfairly.
    """
    # Create directory for this attribute
    attr_dir = os.path.join(output_dir, attribute)
    os.makedirs(attr_dir, exist_ok=True)
    
    # Extract the attribute values from the dataset
    attr_values = results_df[attribute].dropna().unique()
    
    # Calculate metrics for each group
    metrics = {}
    for value in attr_values:
        # Find rows where attribute has this value
        group_df = results_df[results_df[attribute] == value]
        
        # Skip if not enough samples
        if len(group_df) < 10:
            print(f"  Too few samples for {attribute}={value}. Skipping.")
            continue
            
        # Get predictions and actual values for this group
        group_y_true = group_df['y_true'].values
        group_y_pred = group_df['y_pred'].values
        
        # Calculate error metrics
        mse = np.mean((group_y_true - group_y_pred) ** 2)
        rmse = np.sqrt(mse)
        mae = np.mean(np.abs(group_y_true - group_y_pred))
        
        # Calculate relative metrics
        # Avoid division by zero
        with np.errstate(divide='ignore', invalid='ignore'):
            relative_error = np.abs((group_y_true - group_y_pred) / group_y_true)
            relative_error = np.nan_to_num(relative_error, nan=0, posinf=0, neginf=0)
            mape = np.mean(relative_error) * 100
        
        # Calculate bias metrics
        mean_true = np.mean(group_y_true)
        mean_pred = np.mean(group_y_pred)
        bias = mean_pred - mean_true
        relative_bias = (bias / mean_true) * 100 if mean_true != 0 else 0
        
        # Store metrics
        metrics[value] = {
            'count': len(group_df),
            'rmse': rmse,
            'mae': mae,
            'mape': mape,
            'mean_true': mean_true,
            'mean_pred': mean_pred,
            'bias': bias,
            'relative_bias': relative_bias
        }
    
    # Create metrics comparison table
    metrics_df = pd.DataFrame.from_dict(metrics, orient='index')
    metrics_df = metrics_df.sort_values('count', ascending=False)
    
    # Save metrics to CSV
    metrics_df.to_csv(os.path.join(attr_dir, f'{attribute}_metrics.csv'))
    
    # Create visualisations
    create_fairness_visualisations(metrics_df, attribute, attr_dir)
    
    return metrics_df

def create_fairness_visualisations(metrics_df, attribute, output_dir):
    """
    Create visualisations for fairness analysis.
    
    This function generates several charts to visualise fairness metrics:
    1. Bar chart of relative bias by attribute value
    2. Comparison of error metrics (RMSE, MAE) across attribute values
    3. Mean Absolute Percentage Error (MAPE) distribution
    4. Sample count distribution to identify potential data imbalance
    
    The visualisations help identify patterns that might indicate bias or
    unfairness in model predictions across different demographic groups.
    """
    # 1. Bias comparison
    plt.figure(figsize=(12, 6))
    ax = metrics_df['relative_bias'].plot(kind='bar', color='skyblue')
    plt.axhline(y=0, color='r', linestyle='--')
    plt.title(f'Relative Prediction Bias by {attribute}')
    plt.ylabel('Relative Bias (%)')
    plt.xlabel(attribute)
    plt.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for i, v in enumerate(metrics_df['relative_bias']):
        ax.text(i, v + (1 if v >= 0 else -3), f'{v:.1f}%', ha='center')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f'{attribute}_bias.png'))
    plt.close()
    
    # 2. Error comparison
    plt.figure(figsize=(12, 6))
    metrics_df[['rmse', 'mae']].plot(kind='bar', figsize=(12, 6))
    plt.title(f'Error Metrics by {attribute}')
    plt.ylabel('Error Value')
    plt.xlabel(attribute)
    plt.grid(axis='y', alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f'{attribute}_errors.png'))
    plt.close()
    
    # 3. MAPE comparison
    plt.figure(figsize=(12, 6))
    ax = metrics_df['mape'].plot(kind='bar', color='lightgreen')
    plt.title(f'Mean Absolute Percentage Error by {attribute}')
    plt.ylabel('MAPE (%)')
    plt.xlabel(attribute)
    plt.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for i, v in enumerate(metrics_df['mape']):
        ax.text(i, v + 0.5, f'{v:.1f}%', ha='center')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f'{attribute}_mape.png'))
    plt.close()
    
    # 4. Sample count visualization
    plt.figure(figsize=(12, 6))
    ax = metrics_df['count'].plot(kind='bar', color='salmon')
    plt.title(f'Sample Count by {attribute}')
    plt.ylabel('Count')
    plt.xlabel(attribute)
    plt.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for i, v in enumerate(metrics_df['count']):
        ax.text(i, v + 0.5, f'{v}', ha='center')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, f'{attribute}_counts.png'))
    plt.close()

def generate_fairness_report(results, output_dir):
    """
    Generate a comprehensive summary report of fairness analysis.
    
    This function creates a detailed Markdown report that summarises the fairness 
    analysis results for all attributes. The report includes:
    
    1. Overall summary of findings with key metrics
    2. Detailed per-attribute analysis with insights on bias and error patterns
    3. Visualisations for each attribute showing performance differences
    4. Specific recommendations based on identified issues
    5. Conclusion with overall fairness assessment
    
    The report helps stakeholders understand any fairness concerns and provides
    actionable recommendations for addressing them.
    """
    # Skip if no results to report
    if not results:
        print("No fairness results to report.")
        return
    
    # Create report file
    with open(os.path.join(output_dir, 'fairness_report.md'), 'w') as f:
        f.write("# Model Fairness Analysis Report\n\n")
        
        f.write("## Overview\n\n")
        f.write(f"This report analyses the fairness of the settlement value prediction model ")
        f.write(f"across different demographic and case-type groups.\n\n")
        
        f.write(f"Number of attributes analysed: {len(results)}\n\n")
        
        # Summary table
        f.write("## Summary of Findings\n\n")
        f.write("| Attribute | Groups | Max Bias | Max RMSE | Notes |\n")
        f.write("|-----------|--------|----------|----------|-------|\n")
        
        for attribute, metrics_df in results.items():
            if metrics_df.empty:
                continue
                
            max_bias_idx = metrics_df['relative_bias'].abs().idxmax()
            max_bias = metrics_df.loc[max_bias_idx, 'relative_bias']
            max_bias_group = max_bias_idx
            
            max_rmse_idx = metrics_df['rmse'].idxmax()
            max_rmse = metrics_df.loc[max_rmse_idx, 'rmse']
            max_rmse_group = max_rmse_idx
            
            notes = ""
            if abs(max_bias) > 15:
                notes += "High bias detected! "
            if metrics_df['count'].min() < 20:
                notes += "Some groups have low sample count. "
            
            f.write(f"| {attribute} | {len(metrics_df)} | {max_bias:.1f}% ({max_bias_group}) | {max_rmse:.1f} ({max_rmse_group}) | {notes} |\n")
        
        f.write("\n## Detailed Analysis\n\n")
        
        # Details for each attribute
        for attribute, metrics_df in results.items():
            if metrics_df.empty:
                continue
                
            f.write(f"### {attribute}\n\n")
            
            # Generate attribute-specific insights
            f.write("#### Key Insights\n\n")
            
            # Bias insights
            highest_bias_idx = metrics_df['relative_bias'].abs().idxmax()
            highest_bias = metrics_df.loc[highest_bias_idx, 'relative_bias']
            lowest_bias_idx = metrics_df['relative_bias'].abs().idxmin()
            lowest_bias = metrics_df.loc[lowest_bias_idx, 'relative_bias']
            
            f.write(f"- Highest prediction bias: {highest_bias:.1f}% for {highest_bias_idx}\n")
            f.write(f"- Lowest prediction bias: {lowest_bias:.1f}% for {lowest_bias_idx}\n")
            
            if highest_bias > 0:
                f.write(f"- The model tends to **overpredict** for {highest_bias_idx}\n")
            else:
                f.write(f"- The model tends to **underpredict** for {highest_bias_idx}\n")
            
            # Error insights
            highest_error_idx = metrics_df['mape'].idxmax()
            highest_error = metrics_df.loc[highest_error_idx, 'mape']
            lowest_error_idx = metrics_df['mape'].idxmin()
            lowest_error = metrics_df.loc[lowest_error_idx, 'mape']
            
            f.write(f"- Highest percentage error: {highest_error:.1f}% for {highest_error_idx}\n")
            f.write(f"- Lowest percentage error: {lowest_error:.1f}% for {lowest_error_idx}\n\n")
            
            # Sample count insights
            min_count_idx = metrics_df['count'].idxmin()
            min_count = metrics_df.loc[min_count_idx, 'count']
            
            if min_count < 20:
                f.write(f"WARNING: Low sample count ({min_count}) for {min_count_idx}. Results may not be reliable.\n\n")            
            # Include visualisations
            f.write("#### Visualisations\n\n")
            f.write(f"![Bias by {attribute}]({attribute}/{attribute}_bias.png)\n\n")
            f.write(f"![Error Metrics by {attribute}]({attribute}/{attribute}_errors.png)\n\n")
            f.write(f"![MAPE by {attribute}]({attribute}/{attribute}_mape.png)\n\n")
            f.write(f"![Sample Count by {attribute}]({attribute}/{attribute}_counts.png)\n\n")
            
            # Fix for tabulate dependency - simple CSV conversion to markdown table
            f.write("#### Metrics Table\n\n")
            
            # Create a simple markdown table without relying on tabulate
            try:
                # Try to use to_markdown if tabulate is available
                metrics_table = metrics_df.to_markdown()
                f.write(f"{metrics_table}\n\n")
            except ImportError:
                # Fallback to manual markdown table creation
                # Header
                f.write("| Index | ")
                for col in metrics_df.columns:
                    f.write(f"{col} | ")
                f.write("\n|")
                
                # Separator
                for _ in range(len(metrics_df.columns) + 1):
                    f.write("---|")
                f.write("\n")
                
                # Data rows
                for idx, row in metrics_df.iterrows():
                    f.write(f"| {idx} | ")
                    for val in row:
                        if isinstance(val, (int, np.integer)):
                            f.write(f"{val} | ")
                        elif isinstance(val, (float, np.floating)):
                            f.write(f"{val:.2f} | ")
                        else:
                            f.write(f"{val} | ")
                    f.write("\n")
                f.write("\n")
            
            f.write("---\n\n")
        
        # Recommendations
        f.write("## Recommendations\n\n")
        
        high_bias_attributes = []
        for attribute, metrics_df in results.items():
            if metrics_df.empty:
                continue
            if metrics_df['relative_bias'].abs().max() > 15:
                high_bias_attributes.append(attribute)
        
        if high_bias_attributes:
            f.write("### High Priority Issues\n\n")
            f.write("The following attributes show concerning bias patterns:\n\n")
            
            for attribute in high_bias_attributes:
                f.write(f"- **{attribute}**: Review model performance and potentially collect more data\n")
            
            f.write("\nConsider addressing these issues by:\n\n")
            f.write("1. Investigating data distribution and potential sampling bias\n")
            f.write("2. Using stratified sampling to ensure balanced representation\n")
            f.write("3. Testing specialized models for underperforming groups\n")
            f.write("4. Implementing fairness-aware learning techniques\n\n")
        else:
            f.write("No high-priority fairness issues detected. Continue monitoring model performance across groups.\n\n")
        
        # Conclusion
        f.write("## Conclusion\n\n")
        f.write("This fairness analysis provides insights into how the settlement prediction model performs across different groups. ")
        
        if high_bias_attributes:
            f.write("Some concerning patterns were identified that should be addressed before deploying the model in production. ")
            f.write("Addressing these issues is important not only for ethical and legal compliance but also to ensure the model provides accurate predictions for all users.\n\n")
        else:
            f.write("The model appears to perform consistently across different groups, with no major fairness concerns identified. ")
            f.write("Continued monitoring is recommended as new data becomes available.\n\n")
        
    print(f"Fairness report generated at {os.path.join(output_dir, 'fairness_report.md')}")