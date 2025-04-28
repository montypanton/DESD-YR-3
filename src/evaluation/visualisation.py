import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
import os
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.inspection import permutation_importance
from matplotlib.ticker import MaxNLocator

def plot_predictions_vs_actual(y_true, y_pred, model_name, save_path=None):
    """Create scatter plot of predicted vs actual values."""
    plt.figure(figsize=(10, 6))
    plt.scatter(y_true, y_pred, alpha=0.5)
    plt.plot([min(y_true), max(y_true)], [min(y_true), max(y_true)], 'r--')
    plt.xlabel('Actual Settlement Values')
    plt.ylabel('Predicted Settlement Values')
    plt.title(f'{model_name}: Actual vs Predicted Settlement Values')
    
    # Add performance metrics to the plot
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    
    plt.annotate(f'RMSE: {rmse:.2f}\nR²: {r2:.2f}\nMAE: {mae:.2f}',
                xy=(0.05, 0.95), xycoords='axes fraction',
                bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="gray", alpha=0.8))
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_residuals(y_true, y_pred, model_name, save_path=None):
    """Plot residuals to analyze error patterns."""
    residuals = y_true - y_pred
    
    plt.figure(figsize=(12, 10))
    
    # Residual plot
    plt.subplot(2, 2, 1)
    plt.scatter(y_pred, residuals, alpha=0.5)
    plt.axhline(y=0, color='r', linestyle='--')
    plt.xlabel('Predicted Values')
    plt.ylabel('Residuals')
    plt.title('Residual Plot')
    
    # Histogram of residuals
    plt.subplot(2, 2, 2)
    plt.hist(residuals, bins=30, alpha=0.7, color='blue', edgecolor='black')
    plt.axvline(x=0, color='r', linestyle='--')
    plt.xlabel('Residual Value')
    plt.ylabel('Frequency')
    plt.title('Residual Distribution')
    
    # QQ plot of residuals
    plt.subplot(2, 2, 3)
    from scipy import stats
    stats.probplot(residuals, dist="norm", plot=plt)
    plt.title('Normal Q-Q Plot')
    
    # Absolute error by prediction magnitude
    plt.subplot(2, 2, 4)
    plt.scatter(y_pred, np.abs(residuals), alpha=0.5)
    plt.xlabel('Predicted Values')
    plt.ylabel('Absolute Residual')
    plt.title('Error Magnitude by Prediction Size')
    
    plt.tight_layout()
    plt.suptitle(f'{model_name}: Residual Analysis', fontsize=16, y=1.02)
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_feature_importance(model, feature_names, model_name, save_path=None):
    """Plot feature importance if available in the model."""
    plt.figure(figsize=(12, 8))
    
    try:
        # Try to get feature importance from model attributes
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            indices = np.argsort(importances)[::-1]
            
            plt.title(f'{model_name}: Feature Importance')
            plt.barh(range(len(indices)), importances[indices], align='center')
            
            # Use descriptive feature names if available, otherwise use index with fallback
            if feature_names is not None and len(feature_names) == len(indices):
                feature_labels = [feature_names[i] for i in indices]
            else:
                # Log warning but continue with numbered features as fallback
                print(f"Warning: Proper feature names not available for {model_name} visualization")
                feature_labels = [f"Feature {i}" for i in indices]
            
            plt.yticks(range(len(indices)), feature_labels)
            plt.xlabel('Relative Importance')
            
        else:
            raise AttributeError("Model doesn't have feature_importances_ attribute")
            
    except (AttributeError, TypeError):
        # If direct feature importance not available, try permutation importance
        try:
            # This is a placeholder - actual permutation importance should be calculated with proper data
            plt.title(f'{model_name}: Feature Importance Not Available')
            plt.text(0.5, 0.5, 'Feature importance visualization not available for this model type',
                    horizontalalignment='center', verticalalignment='center',
                    transform=plt.gca().transAxes)
        except:
            plt.title('Feature Importance Calculation Failed')
    
    plt.tight_layout()
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_distribution_comparison(y_true, y_pred, model_name, save_path=None):
    """Compare distributions of actual vs predicted values."""
    plt.figure(figsize=(12, 6))
    
    # KDE plot
    sns.kdeplot(y_true, label='Actual Values', shade=True)
    sns.kdeplot(y_pred, label='Predicted Values', shade=True)
    plt.title(f'{model_name}: Distribution of Actual vs Predicted Values')
    plt.xlabel('Settlement Value')
    plt.ylabel('Density')
    plt.legend()
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_learning_curve(train_sizes, train_scores, test_scores, model_name, save_path=None):
    """Plot learning curve to analyze model performance as data size increases."""
    plt.figure(figsize=(10, 6))
    
    train_mean = np.mean(train_scores, axis=1)
    train_std = np.std(train_scores, axis=1)
    test_mean = np.mean(test_scores, axis=1)
    test_std = np.std(test_scores, axis=1)
    
    plt.plot(train_sizes, train_mean, 'o-', color='r', label='Training Score')
    plt.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.1, color='r')
    
    plt.plot(train_sizes, test_mean, 'o-', color='g', label='Validation Score')
    plt.fill_between(train_sizes, test_mean - test_std, test_mean + test_std, alpha=0.1, color='g')
    
    plt.title(f'{model_name}: Learning Curve')
    plt.xlabel('Training Set Size')
    plt.ylabel('R² Score')
    plt.grid(True)
    plt.legend(loc='best')
    plt.tight_layout()
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_error_by_category(y_true, y_pred, category_values, category_name, model_name, save_path=None):
    """Plot error metrics segmented by a categorical feature."""
    df = pd.DataFrame({
        'actual': y_true,
        'predicted': y_pred,
        'category': category_values
    })
    
    # Calculate errors
    df['error'] = df['actual'] - df['predicted']
    df['abs_error'] = np.abs(df['error'])
    df['sq_error'] = df['error'] ** 2
    
    # Group by category
    grouped = df.groupby('category').agg({
        'abs_error': 'mean',
        'sq_error': lambda x: np.sqrt(np.mean(x)),
        'actual': 'count'
    }).reset_index()
    
    grouped.columns = ['category', 'MAE', 'RMSE', 'count']
    
    # Sort by count (optional)
    grouped = grouped.sort_values('count', ascending=False)
    
    # Create figure with two subplots
    fig, ax = plt.subplots(nrows=1, ncols=2, figsize=(18, 8))
    
    # Plot MAE by category
    sns.barplot(x='category', y='MAE', data=grouped, ax=ax[0])
    ax[0].set_title(f'Mean Absolute Error by {category_name}')
    ax[0].set_xticklabels(ax[0].get_xticklabels(), rotation=45, ha='right')
    
    # Plot RMSE by category
    sns.barplot(x='category', y='RMSE', data=grouped, ax=ax[1])
    ax[1].set_title(f'Root Mean Squared Error by {category_name}')
    ax[1].set_xticklabels(ax[1].get_xticklabels(), rotation=45, ha='right')
    
    for a in ax:
        a.grid(True, axis='y', linestyle='--', alpha=0.7)
        
    plt.suptitle(f'{model_name}: Error Analysis by {category_name}', fontsize=16)
    plt.tight_layout()
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_correlation_heatmap(data, feature_names, save_path=None):
    """Plot correlation heatmap of features."""
    # Create DataFrame with named columns
    df = pd.DataFrame(data, columns=feature_names)
    
    # Calculate correlation matrix
    corr = df.corr()
    
    # Create heatmap
    plt.figure(figsize=(14, 12))
    mask = np.triu(np.ones_like(corr, dtype=bool))
    cmap = sns.diverging_palette(230, 20, as_cmap=True)
    
    sns.heatmap(corr, mask=mask, cmap=cmap, vmax=1, vmin=-1, center=0,
                square=True, linewidths=.5, annot=False, fmt=".2f")
    
    plt.title('Feature Correlation Heatmap', fontsize=16)
    plt.tight_layout()
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path)
        plt.close()
    else:
        plt.show()

def plot_all_visualizations(X_train, X_test, y_train, y_test, y_pred, model, feature_names, model_name, results_dir):
    """Generate and save all visualizations for a model."""
    # Ensure we're using results2 directory not results
    if results_dir.startswith('results/') or results_dir == 'results':
        results_dir = 'results2' + results_dir[7:] if results_dir.startswith('results/') else 'results2'
    
    # Create directory for this model's visualizations
    model_viz_dir = os.path.join(results_dir, model_name, 'visualizations')
    os.makedirs(model_viz_dir, exist_ok=True)
    
    # Plot actual vs predicted
    plot_predictions_vs_actual(y_test, y_pred, model_name, 
                              save_path=os.path.join(model_viz_dir, 'predictions_vs_actual.png'))
    
    # Plot residuals
    plot_residuals(y_test, y_pred, model_name,
                  save_path=os.path.join(model_viz_dir, 'residuals.png'))
    
    # Plot distribution comparison
    plot_distribution_comparison(y_test, y_pred, model_name,
                                save_path=os.path.join(model_viz_dir, 'distribution_comparison.png'))
    
    # Plot feature importance if applicable
    try:
        plot_feature_importance(model, feature_names, model_name,
                              save_path=os.path.join(model_viz_dir, 'feature_importance.png'))
    except:
        print(f"Could not generate feature importance plot for {model_name}")
    
    # Additional visualizations that might require specific data not available here
    # would be called conditionally