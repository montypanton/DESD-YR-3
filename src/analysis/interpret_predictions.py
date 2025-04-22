import shap
import numpy as np
import matplotlib.pyplot as plt
import os

def generate_shap_explanations(model, X, feature_names=None, output_dir='results/explanations'):
    """Generate SHAP-based model explanations."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Create explainer based on model type
    if hasattr(model, 'booster'):  # XGBoost model
        explainer = shap.TreeExplainer(model)
    else:  # Default to KernelExplainer for other models
        # Sample fewer rows for KernelExplainer to improve performance
        explainer = shap.KernelExplainer(model.predict, shap.sample(X, 100))
    
    # Calculate SHAP values
    shap_values = explainer.shap_values(X)
    
    # Save SHAP values
    np.save(os.path.join(output_dir, 'shap_values.npy'), shap_values)
    
    # Create summary plot without feature names if they don't match dimensions
    plt.figure(figsize=(12, 8))
    if feature_names is not None and len(feature_names) == X.shape[1]:
        shap.summary_plot(shap_values, X, feature_names=feature_names, show=False)
    else:
        # Use default feature naming (Feature 0, Feature 1, etc.)
        shap.summary_plot(shap_values, X, show=False)
    
    plt.title('Feature Impact on Prediction (SHAP values)')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'shap_summary.png'))
    plt.close()
    
    return shap_values, explainer