import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
from pathlib import Path
from scipy import stats
import pickle
import sys
import yaml

# Add project root to sys.path
project_root = Path(__file__).resolve().parents[2]
sys.path.append(str(project_root))

# Load configuration
with open(project_root / "config" / "default.yaml", "r") as f:
    config = yaml.safe_load(f)

# Output directory for visualizations
output_dir = project_root / "results" / "dataset_analysis"
os.makedirs(output_dir, exist_ok=True)

# Load data
def load_data():
    input_path = project_root / config["data"]["input_path"]
    df = pd.read_csv(input_path)
    return df

def load_processed_data():
    """Load processed training and test data if available"""
    processed_dir = project_root / config["paths"]["processed_data"]
    
    try:
        X_train = np.load(processed_dir / "X_train_processed.npy")
        X_test = np.load(processed_dir / "X_test_processed.npy")
        y_train = np.load(processed_dir / "y_train.npy")
        y_test = np.load(processed_dir / "y_test.npy")
        
        with open(processed_dir / "preprocessor.pkl", "rb") as f:
            preprocessor = pickle.load(f)
            
        return X_train, X_test, y_train, y_test, preprocessor
    except FileNotFoundError:
        print("Processed data files not found. Run preprocessing first.")
        return None, None, None, None, None

def analyze_missing_data(df):
    """Visualize missing data patterns"""
    plt.figure(figsize=(14, 8))
    
    # Calculate missing values percentage
    missing_percentage = (df.isna().sum() / len(df)) * 100
    missing_df = pd.DataFrame({
        'column': df.columns,
        'percent_missing': missing_percentage
    }).sort_values('percent_missing', ascending=False)
    
    # Only show columns with missing data
    missing_df = missing_df[missing_df['percent_missing'] > 0]
    
    if len(missing_df) > 0:
        sns.barplot(data=missing_df, x='percent_missing', y='column')
        plt.title('Percentage of Missing Values by Column')
        plt.xlabel('Missing Values (%)')
        plt.ylabel('Column')
        plt.tight_layout()
        plt.savefig(output_dir / "missing_values_analysis.png")
        plt.close()
        
        # Create heatmap of missing values for top rows
        plt.figure(figsize=(18, 10))
        sample_rows = min(100, len(df))
        sns.heatmap(df.head(sample_rows).isna(), cbar=False, cmap='viridis')
        plt.title('Missing Values Heatmap (First 100 rows)')
        plt.tight_layout()
        plt.savefig(output_dir / "missing_values_heatmap.png")
        plt.close()
        
        print(f"Missing data analysis saved to {output_dir}")
    else:
        print("No missing data found in the dataset")
        
def analyze_distribution_skewness(df):
    """Analyze settlement values distribution and skewness"""
    target_column = config["data"]["target_column"]
    
    plt.figure(figsize=(12, 8))
    
    # Plot distribution
    sns.histplot(df[target_column].dropna(), kde=True, bins=50)
    plt.title(f'Distribution of {target_column} (Skewness: {df[target_column].skew():.2f})')
    plt.xlabel(target_column)
    plt.ylabel('Count')
    plt.grid(True, alpha=0.3)
    plt.savefig(output_dir / f"{target_column}_distribution.png")
    plt.close()
    
    # Box plot for outlier detection
    plt.figure(figsize=(12, 6))
    sns.boxplot(x=df[target_column].dropna())
    plt.title(f'Box Plot of {target_column} (Outlier Analysis)')
    plt.xlabel(target_column)
    plt.grid(True, alpha=0.3)
    plt.savefig(output_dir / f"{target_column}_boxplot.png")
    plt.close()
    
    print(f"Distribution analysis saved to {output_dir}")

def analyze_categorical_features(df):
    """Analyze categorical features and their relationship with target"""
    target_column = config["data"]["target_column"]
    
    # Select categorical columns with fewer than 10 unique values
    categorical_cols = [col for col in df.columns 
                       if df[col].dtype == 'object' or df[col].nunique() < 10]
    
    if target_column in categorical_cols:
        categorical_cols.remove(target_column)
    
    if not categorical_cols:
        print("No suitable categorical columns found.")
        return
    
    # Calculate the correlation between each categorical feature and target
    plt.figure(figsize=(14, 8))
    correlation_data = []
    
    for col in categorical_cols:
        if df[col].dtype == 'object':
            # Calculate correlation ratio for categorical vs. numerical
            def correlation_ratio(categories, values):
                categories = pd.Categorical(categories)
                values = np.asarray(values)
                
                # Get unique categories
                c_categories = pd.Series(categories).value_counts().index
                # Define values by category
                c_values = [values[categories == c] for c in c_categories]
                # Calculate overall mean
                overall_mean = np.mean(values)
                # Calculate variance between groups (weighted)
                between = sum([len(c) * (np.mean(c) - overall_mean)**2 for c in c_values if len(c) > 0]) / len(values)
                # Calculate total variance
                total = np.var(values)
                # Return correlation ratio
                if total == 0:
                    return 0
                return np.sqrt(between / total)
                
            valid_data = df[[col, target_column]].dropna()
            if len(valid_data) > 0:
                corr = correlation_ratio(valid_data[col], valid_data[target_column])
                correlation_data.append({'Feature': col, 'Correlation': corr})
    
    # Create correlation plot
    if correlation_data:
        correlation_df = pd.DataFrame(correlation_data)
        correlation_df = correlation_df.sort_values('Correlation', ascending=False)
        
        sns.barplot(data=correlation_df, x='Correlation', y='Feature')
        plt.title('Correlation of Categorical Features with Settlement Value')
        plt.xlabel('Correlation Ratio')
        plt.ylabel('Feature')
        plt.tight_layout()
        plt.savefig(output_dir / "categorical_features_correlation.png")
        plt.close()
    
    # Plot top categorical variables distribution
    top_categories = min(4, len(categorical_cols))
    top_cat_cols = categorical_cols[:top_categories]
    
    plt.figure(figsize=(16, 12))
    for i, col in enumerate(top_cat_cols):
        plt.subplot(2, 2, i+1)
        value_counts = df[col].value_counts().head(10)  # Top 10 values
        sns.barplot(x=value_counts.index, y=value_counts.values)
        plt.title(f'Top Values in {col}')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
    
    plt.savefig(output_dir / "categorical_features_distribution.png")
    plt.close()
    
    # Visualize relationship between important categorical features and target
    for i, col in enumerate(top_cat_cols):
        plt.figure(figsize=(14, 8))
        sns.boxplot(x=col, y=target_column, data=df)
        plt.title(f'Settlement Value by {col}')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.savefig(output_dir / f"settlement_by_{col}.png")
        plt.close()
    
    print(f"Categorical features analysis saved to {output_dir}")

def analyze_temporal_factors(df):
    """Analyze temporal factors and delays in the dataset"""
    # Check if required columns exist
    if 'Accident Date' in df.columns and 'Claim Date' in df.columns:
        # Convert to datetime
        df['Accident Date'] = pd.to_datetime(df['Accident Date'], errors='coerce')
        df['Claim Date'] = pd.to_datetime(df['Claim Date'], errors='coerce')
        
        # Calculate claim delay in days
        df['Claim Delay (Days)'] = (df['Claim Date'] - df['Accident Date']).dt.days
        
        # Plot distribution of claim delays
        plt.figure(figsize=(12, 6))
        sns.histplot(df['Claim Delay (Days)'].dropna(), bins=50, kde=True)
        plt.title('Distribution of Claim Delays')
        plt.xlabel('Delay (Days)')
        plt.ylabel('Count')
        plt.grid(True, alpha=0.3)
        plt.savefig(output_dir / "claim_delay_distribution.png")
        plt.close()
        
        # Scatter plot of claim delay vs settlement value
        plt.figure(figsize=(12, 6))
        target_column = config["data"]["target_column"]
        plt.scatter(df['Claim Delay (Days)'], df[target_column], alpha=0.5)
        plt.title('Settlement Value vs Claim Delay')
        plt.xlabel('Claim Delay (Days)')
        plt.ylabel(target_column)
        plt.grid(True, alpha=0.3)
        # Add trend line
        z = np.polyfit(df['Claim Delay (Days)'].dropna(), df.loc[df['Claim Delay (Days)'].notna(), target_column], 1)
        p = np.poly1d(z)
        plt.plot(df['Claim Delay (Days)'].dropna(), p(df['Claim Delay (Days)'].dropna()), "r--")
        plt.savefig(output_dir / "settlement_vs_claim_delay.png")
        plt.close()
        
        print(f"Temporal analysis saved to {output_dir}")
    else:
        print("Required date columns not found for temporal analysis")

def analyze_feature_importance(df):
    """Analyze and visualize feature importance from the models"""
    # Try to load feature importance files
    results_dir = project_root / "results"
    importance_files = [
        results_dir / "models" / "random_forest" / "feature_importance.csv",
        results_dir / "models" / "xgboost" / "feature_importance.csv"
    ]
    
    for file_path in importance_files:
        if os.path.exists(file_path):
            model_name = file_path.parent.name
            importances = pd.read_csv(file_path)
            
            # Plot top 20 features
            plt.figure(figsize=(12, 10))
            top_features = importances.sort_values('importance', ascending=False).head(20)
            sns.barplot(data=top_features, x='importance', y='feature')
            plt.title(f'Top 20 Features - {model_name.replace("_", " ").title()}')
            plt.xlabel('Importance')
            plt.ylabel('Feature')
            plt.tight_layout()
            plt.savefig(output_dir / f"{model_name}_top_features.png")
            plt.close()
            
            print(f"Feature importance analysis for {model_name} saved to {output_dir}")

def analyze_model_performance():
    """Visualize model performance comparisons"""
    results_dir = project_root / "results"
    model_comparison_file = results_dir / "model_comparison.csv"
    
    if os.path.exists(model_comparison_file):
        model_comparison = pd.read_csv(model_comparison_file)
        
        metrics = ['rmse', 'mae', 'r2']
        for metric in metrics:
            plt.figure(figsize=(12, 6))
            data = model_comparison.sort_values(metric)
            if metric == 'r2':  # For R2, higher is better
                data = data.sort_values(metric, ascending=False)
            
            sns.barplot(data=data, x='model', y=metric)
            plt.title(f'Model Comparison by {metric.upper()}')
            plt.xlabel('Model')
            plt.ylabel(metric.upper())
            plt.xticks(rotation=45)
            plt.tight_layout()
            plt.savefig(output_dir / f"model_comparison_{metric}.png")
            plt.close()
        
        print(f"Model performance comparison saved to {output_dir}")
    else:
        print(f"Model comparison file not found at {model_comparison_file}")

def analyze_feature_correlations(df):
    """Analyze and visualize correlations between numerical features"""
    # Select only numeric columns
    numeric_df = df.select_dtypes(include=[np.number])
    
    if numeric_df.shape[1] > 1:  # More than one numeric column
        # Calculate correlation matrix
        corr = numeric_df.corr()
        
        # Plot heatmap
        plt.figure(figsize=(14, 12))
        mask = np.triu(np.ones_like(corr, dtype=bool))  # Mask for upper triangle
        sns.heatmap(corr, mask=mask, annot=False, cmap='coolwarm', center=0,
                   square=True, linewidths=.5, cbar_kws={"shrink": .5})
        plt.title('Feature Correlation Heatmap')
        plt.tight_layout()
        plt.savefig(output_dir / "feature_correlation_heatmap.png")
        plt.close()
        
        # Extract and show top correlations
        top_corr = pd.DataFrame(columns=['Feature 1', 'Feature 2', 'Correlation'])
        
        for i in range(len(corr.columns)):
            for j in range(i):
                if abs(corr.iloc[i, j]) > 0.5:  # Only show strong correlations
                    top_corr = pd.concat([top_corr, pd.DataFrame({
                        'Feature 1': [corr.columns[i]],
                        'Feature 2': [corr.columns[j]],
                        'Correlation': [corr.iloc[i, j]]
                    })])
        
        if not top_corr.empty:
            top_corr = top_corr.sort_values('Correlation', key=abs, ascending=False)
            
            plt.figure(figsize=(12, min(8, max(4, len(top_corr)))))
            sns.barplot(data=top_corr, x='Correlation', y=top_corr['Feature 1'] + ' & ' + top_corr['Feature 2'])
            plt.title('Top Feature Correlations')
            plt.xlabel('Correlation')
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            plt.savefig(output_dir / "top_feature_correlations.png")
            plt.close()
        
        print(f"Feature correlation analysis saved to {output_dir}")
    else:
        print("Not enough numeric features for correlation analysis")

def analyze_fairness(df):
    """Analyze potential biases in sensitive attributes"""
    target_column = config["data"]["target_column"]
    sensitive_attributes = config.get("fairness", {}).get("sensitive_attributes", [])
    
    if not sensitive_attributes:
        print("No sensitive attributes defined in config")
        return
    
    # Filter for attributes that exist in the dataframe
    sensitive_attributes = [attr for attr in sensitive_attributes if attr in df.columns]
    
    if not sensitive_attributes:
        print("None of the defined sensitive attributes found in dataset")
        return
    
    # Analyze settlement value across sensitive attributes
    for attr in sensitive_attributes:
        if df[attr].nunique() > 10:  # Skip if too many categories
            continue
            
        plt.figure(figsize=(14, 8))
        sns.boxplot(x=attr, y=target_column, data=df)
        plt.title(f'Distribution of {target_column} by {attr}')
        plt.xticks(rotation=45, ha='right')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_dir / f"fairness_{attr}_boxplot.png")
        plt.close()
        
        # Calculate average settlement by attribute
        avg_settlement = df.groupby(attr)[target_column].mean().reset_index()
        
        plt.figure(figsize=(12, 6))
        sns.barplot(data=avg_settlement, x=attr, y=target_column)
        plt.title(f'Average {target_column} by {attr}')
        plt.xticks(rotation=45, ha='right')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(output_dir / f"fairness_{attr}_average.png")
        plt.close()
    
    print(f"Fairness analysis saved to {output_dir}")

def main():
    """Main function to run all analyses"""
    print("Loading data...")
    df = load_data()
    
    print("Analyzing missing data...")
    analyze_missing_data(df)
    
    print("Analyzing distribution skewness...")
    analyze_distribution_skewness(df)
    
    print("Analyzing categorical features...")
    analyze_categorical_features(df)
    
    print("Analyzing temporal factors...")
    analyze_temporal_factors(df)
    
    print("Analyzing feature correlations...")
    analyze_feature_correlations(df)
    
    print("Analyzing feature importance...")
    analyze_feature_importance(df)
    
    print("Analyzing model performance...")
    analyze_model_performance()
    
    print("Analyzing fairness considerations...")
    analyze_fairness(df)
    
    print(f"All analyses complete. Visualizations saved to {output_dir}")

if __name__ == "__main__":
    main()