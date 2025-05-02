"""
Comprehensive dataset analysis and visualisation module.

This module provides extensive data exploration and visualisation capabilities:
- Distribution analysis and outlier detection
- Missing value analysis
- Feature correlation and importance visualisation
- Temporal pattern analysis
- Fairness and bias detection across demographic groups
- Model performance comparison

Contributors:
- Alex: Designed and implemented the core visualisation framework (70%)
- Monty: Added fairness analysis and model comparison components (20%)
- Jakub: Contributed to temporal and correlation analysis (10%)
"""

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

def generate_dataset_visualisations(data, target_column='SettlementValue', output_dir='results/dataset_analysis'):
    """
    Generate comprehensive visualisations of the dataset.
    
    Parameters:
    -----------
    data : DataFrame
        The dataset to analyse
    target_column : str
        The name of the target column
    output_dir : str
        Directory to save visualisation outputs
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract target
    target = data[target_column]
    
    # Distribution of target variable
    plt.figure(figsize=(10, 6))
    sns.histplot(target, kde=True)
    plt.title(f'Distribution of {target_column}')
    plt.savefig(os.path.join(output_dir, f'{target_column}_distribution.png'))
    plt.close()
    
    # Boxplot of target variable
    plt.figure(figsize=(10, 6))
    sns.boxplot(y=target)
    plt.title(f'Boxplot of {target_column}')
    plt.savefig(os.path.join(output_dir, f'{target_column}_boxplot.png'))
    plt.close()
    
    # Missing values analysis
    missing = data.isnull().sum()
    if missing.sum() > 0:
        plt.figure(figsize=(12, 8))
        missing = missing[missing > 0].sort_values(ascending=False)
        missing_percent = missing / len(data) * 100
        
        plt.bar(range(len(missing)), missing_percent)
        plt.xticks(range(len(missing)), missing.index, rotation=90)
        plt.ylabel('Percentage Missing')
        plt.title('Missing Values Analysis')
        plt.grid(axis='y', alpha=0.3)
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'missing_values_analysis.png'))
        plt.close()
        
        # Missing values heatmap
        plt.figure(figsize=(12, 8))
        sns.heatmap(data.isnull(), cbar=False, cmap='viridis')
        plt.title('Missing Values Heatmap')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'missing_values_heatmap.png'))
        plt.close()
    
    # Feature correlation analysis
    numeric_cols = data.select_dtypes(include=['int64', 'float64']).columns
    if len(numeric_cols) > 1:
        corr_matrix = data[numeric_cols].corr()
        
        # Plot correlation heatmap
        plt.figure(figsize=(12, 10))
        sns.heatmap(corr_matrix, annot=False, cmap='coolwarm', center=0)
        plt.title('Feature Correlation Heatmap')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'feature_correlation_heatmap.png'))
        plt.close()
        
        # Top correlations with target
        if target_column in corr_matrix.columns:
            target_corr = corr_matrix[target_column].sort_values(ascending=False).drop(target_column)
            top_features = target_corr.abs().sort_values(ascending=False).head(10).index
            
            plt.figure(figsize=(10, 6))
            sns.barplot(x=target_corr[top_features], y=top_features)
            plt.title(f'Top Feature Correlations with {target_column}')
            plt.grid(axis='x', alpha=0.3)
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, 'top_feature_correlations.png'))
            plt.close()
    
    # Categorical feature analysis
    cat_cols = data.select_dtypes(include=['object', 'category']).columns
    if len(cat_cols) > 0:
        # Distribution of categorical features
        for i, col in enumerate(cat_cols[:min(6, len(cat_cols))]):
            if data[col].nunique() <= 15:  # Skip high cardinality categorical features
                plt.figure(figsize=(10, 6))
                value_counts = data[col].value_counts().sort_values(ascending=False)
                sns.barplot(x=value_counts.index, y=value_counts.values)
                plt.title(f'Distribution of {col}')
                plt.xticks(rotation=45, ha='right')
                plt.grid(axis='y', alpha=0.3)
                plt.tight_layout()
                plt.savefig(os.path.join(output_dir, f'categorical_features_distribution_{i}.png'))
                plt.close()
        
        # Combined plot of categorical features
        selected_cat_cols = [col for col in cat_cols if data[col].nunique() <= 6][:4]
        if selected_cat_cols:
            fig, axes = plt.subplots(len(selected_cat_cols), 1, figsize=(10, 3*len(selected_cat_cols)))
            if len(selected_cat_cols) == 1:
                axes = [axes]
            
            for i, col in enumerate(selected_cat_cols):
                data[col].value_counts().plot(kind='bar', ax=axes[i])
                axes[i].set_title(f'Distribution of {col}')
                axes[i].grid(axis='y', alpha=0.3)
            
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, 'categorical_features_distribution.png'))
            plt.close()
        
        # Relationship between target and key categorical features
        for col in cat_cols[:min(5, len(cat_cols))]:
            if data[col].nunique() <= 10:  # Skip high cardinality categorical features
                plt.figure(figsize=(10, 6))
                sns.boxplot(x=col, y=target_column, data=data)
                plt.title(f'{target_column} by {col}')
                plt.xticks(rotation=45, ha='right')
                plt.grid(axis='y', alpha=0.3)
                plt.tight_layout()
                plt.savefig(os.path.join(output_dir, f'settlement_by_{col}.png'))
                plt.close()
    
    # Special for AccidentDate and ClaimDate difference
    if 'AccidentDate' in data.columns and 'ClaimDate' in data.columns:
        try:
            data['AccidentDate'] = pd.to_datetime(data['AccidentDate'])
            data['ClaimDate'] = pd.to_datetime(data['ClaimDate'])
            data['claim_delay'] = (data['ClaimDate'] - data['AccidentDate']).dt.days
            
            plt.figure(figsize=(10, 6))
            sns.histplot(data['claim_delay'].dropna(), kde=True)
            plt.title('Distribution of Claim Delay (days)')
            plt.grid(axis='y', alpha=0.3)
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, 'claim_delay_distribution.png'))
            plt.close()
            
            if target_column in data.columns:
                plt.figure(figsize=(10, 6))
                plt.scatter(data['claim_delay'], data[target_column], alpha=0.5)
                plt.title(f'{target_column} vs Claim Delay')
                plt.xlabel('Claim Delay (days)')
                plt.ylabel(target_column)
                plt.grid(True, alpha=0.3)
                plt.tight_layout()
                plt.savefig(os.path.join(output_dir, 'settlement_vs_claim_delay.png'))
                plt.close()
        except:
            print("Warning: Couldn't process date columns for claim delay analysis")
    
    # LightGBM feature importance if saved
    importance_path = 'models/lightgbm_importance.json'
    if os.path.exists(importance_path):
        try:
            import json
            with open(importance_path, 'r') as f:
                importance = json.load(f)
            
            # Get top features
            feature_names = list(importance.keys())
            importance_vals = list(importance.values())
            
            # Sort features by importance
            sorted_idx = np.argsort(importance_vals)
            top_features = [feature_names[i] for i in sorted_idx[-15:]]
            top_importance = [importance_vals[i] for i in sorted_idx[-15:]]
            
            plt.figure(figsize=(10, 8))
            plt.barh(top_features, top_importance)
            plt.title('LightGBM Top Features')
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, 'lightgbm_top_features.png'))
            plt.close()
        except Exception as e:
            print(f"Warning: Couldn't load LightGBM feature importance: {e}")
    
    # Random Forest feature importance if saved
    rf_importance_path = 'models/random_forest_model_importance.json'
    if os.path.exists(rf_importance_path):
        try:
            import json
            with open(rf_importance_path, 'r') as f:
                importance = json.load(f)
            
            # Get top features
            feature_names = list(importance.keys())
            importance_vals = list(importance.values())
            
            # Sort features by importance
            sorted_idx = np.argsort(importance_vals)
            top_features = [feature_names[i] for i in sorted_idx[-15:]]
            top_importance = [importance_vals[i] for i in sorted_idx[-15:]]
            
            plt.figure(figsize=(10, 8))
            plt.barh(top_features, top_importance)
            plt.title('Random Forest Top Features')
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, 'random_forest_top_features.png'))
            plt.close()
        except Exception as e:
            print(f"Warning: Couldn't load Random Forest feature importance: {e}")

def analyse_fairness_across_demographic_groups(data, target_column='SettlementValue', output_dir='results/dataset_analysis'):
    """
    Analyse fairness concerns by comparing target distributions across demographic groups.
    
    Parameters:
    -----------
    data : DataFrame
        The dataset to analyse
    target_column : str
        The name of the target column
    output_dir : str
        Directory to save visualisation outputs
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Define potential demographic attributes
    demographic_attributes = [
        'Gender', 'Dominant injury', 'Whiplash', 'Vehicle Type', 
        'Weather Conditions', 'AccidentType', 'Injury_Prognosis'
    ]
    
    # Filter to only available attributes
    available_attributes = [col for col in demographic_attributes if col in data.columns]
    
    for attribute in available_attributes:
        if data[attribute].nunique() <= 10:  # Skip high cardinality attributes
            # Filter to non-missing values
            attr_data = data.dropna(subset=[attribute, target_column])
            
            # Calculate statistics by group
            group_stats = attr_data.groupby(attribute)[target_column].agg(['mean', 'median', 'std', 'count'])
            
            # Create boxplot
            plt.figure(figsize=(12, 6))
            sns.boxplot(x=attribute, y=target_column, data=attr_data)
            plt.title(f'{target_column} Distribution by {attribute}')
            plt.xticks(rotation=45, ha='right')
            plt.grid(axis='y', alpha=0.3)
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, f'fairness_{attribute}_boxplot.png'))
            plt.close()
            
            # Create bar plot of averages
            plt.figure(figsize=(10, 6))
            sns.barplot(x=group_stats.index, y=group_stats['mean'])
            plt.title(f'Average {target_column} by {attribute}')
            plt.ylabel(f'Average {target_column}')
            plt.xticks(rotation=45, ha='right')
            
            # Add count labels
            for i, count in enumerate(group_stats['count']):
                plt.text(i, group_stats['mean'].iloc[i] * 0.9, f'n={count}', 
                        ha='center', va='center', color='white', fontweight='bold')
            
            plt.grid(axis='y', alpha=0.3)
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, f'fairness_{attribute}_average.png'))
            plt.close()

def compare_models_performance(results_df, output_dir='results/dataset_analysis'):
    """
    Create visualisations comparing model performance metrics.
    
    Parameters:
    -----------
    results_df : DataFrame
        DataFrame containing model performance metrics (rmse, mae, r2, etc.)
    output_dir : str
        Directory to save visualisation outputs
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Create plots for each metric
    for metric in ['rmse', 'mae', 'r2']:
        if metric in results_df.columns:
            plt.figure(figsize=(12, 6))
            
            # Sort by metric (asc for error metrics, desc for r2)
            if metric == 'r2':
                sorted_df = results_df.sort_values(metric, ascending=False)
            else:
                sorted_df = results_df.sort_values(metric)
            
            # Plot
            bars = plt.barh(sorted_df['name'], sorted_df[metric])
            
            # Add value labels
            for i, bar in enumerate(bars):
                value = sorted_df[metric].iloc[i]
                plt.text(value + (max(sorted_df[metric]) * 0.01), i, f'{value:.4f}', 
                        va='center', fontweight='bold')
            
            plt.title(f'Model Comparison - {metric.upper()}')
            plt.xlabel(metric.upper())
            plt.grid(axis='x', alpha=0.3)
            plt.tight_layout()
            plt.savefig(os.path.join(output_dir, f'model_comparison_{metric}.png'))
            plt.close()

if __name__ == "__main__":
    # Example usage
    try:
        # Load data
        data_path = 'data/Synthetic_Data_For_Students.csv'
        data = pd.read_csv(data_path)
        generate_dataset_visualisations(data)
        analyse_fairness_across_demographic_groups(data)
    except Exception as e:
        print(f"Error generating visualisations: {e}")