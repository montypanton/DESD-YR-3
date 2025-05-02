# Insurance Settlement Value Prediction System

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6.1-orange)
![XGBoost](https://img.shields.io/badge/XGBoost-3.0.0-green)
![LightGBM](https://img.shields.io/badge/LightGBM-4.3.0-yellowgreen)

## Executive Summary

This advanced machine learning system predicts insurance claim settlement values with high accuracy, providing critical insights for claims management and risk assessment for intergration in the DESD project. The system includes ensemble modelling, uncertainty quantification, fairness analysis, and model explainability to ensure robust, ethical, and transparent predictions on the data.

With the ability to achieve R² scores of up to 0.88, the system significantly outperforms traditional actuarial methods while providing comprehensive analysis of prediction fairness across demographic groups and generating calibrated prediction intervals to quantify uncertainty.

## Project Overview

The insurance industry faces significant challenges in accurately estimating settlement values early in the claims process. This project implements a sophisticated machine learning solution that:

1. **Predicts settlement values** with high accuracy using advanced ML models
2. **Quantifies prediction uncertainty** by providing calibrated intervals
3. **Ensures fairness** across different demographic groups
4. **Explains predictions** with transparent feature importance analysis
5. **Combines multiple models** through ensemble techniques for optimal performance

The system serves as a decision support tool for claims adjusters, allowing them to:
- Make earlier, more accurate settlement offers
- Identify claims that might need special attention
- Understand the factors driving settlement values
- Ensure fair treatment across different claimant groups


## Key Results

- **Prediction Accuracy**: Achieved R² of 0.88 and RMSE of 278.9 on test data
- **Model Fairness**: Analysis shows consistent performance across demographic groups with no significant bias
- **Uncertainty Quantification**: Successfully calibrated 80% prediction intervals with 83.5% coverage
- **Feature Importance**: Identified key drivers of settlement values through SHAP analysis
- **Ensemble Performance**: Stacking ensemble outperformed individual models by 3-5%

## Contributors

This project was developed collaboratively by:

- **Alex Hutchings** (30%): Implemented ensemble models, advanced visualisations, hyperparameter tuning, and cross-validation methodologies.
- **Monty Panton** (30%): Designed and implemented fairness analysis, uncertainty quantification, and model evaluation framework.
- **Jakub Pelczar** (30%): Developed initial data pipeline, preprocessing, and base models implementation.
- **Jamie Young** (10%): Intergration, Code reviews, debugging, and documentation.

## Features

### Data Processing
- Comprehensive preprocessing pipeline with advanced feature engineering
- Robust handling of categorical features, missing values, and outliers
- Creation of domain-specific features based on insurance industry knowledge

### Models
- **Base Models**: XGBoost, LightGBM, Random Forest, MLP (Neural Network)
- **Ensemble Methods**:
  - Weighted Ensemble (optimised combination of base models)
  - Stacking Ensemble (meta-model trained on base model predictions)
  - Stacking CV Ensemble (cross-validated stacking for better generalisation)
  - Blending Ensemble (uses separate validation set for meta-model)

### Analysis Tools
- **Uncertainty Quantification**: Prediction intervals via quantile regression
- **Fairness Analysis**: Performance assessment across demographic attributes
- **Model Interpretability**: Feature importance and SHAP values
- **Comprehensive Evaluation**: Detailed metrics and visualisations

## Technical Architecture

The system follows a modular, component-based architecture with clear separation of concerns:

```
settlement-prediction-system/
├── config/                  # Configuration management
│   └── default.yaml         # Centralised configuration parameters
├── data/                    # Data management
│   ├── Synthetic_Data_For_Students.csv  # Input data
│   └── processed_data/      # Processed features and target values
├── models/                  # Serialised trained models
├── results/                 # Analysis outputs
│   ├── dataset_analysis/    # Dataset insights and visualisations
│   ├── explanations/        # Model explanations with SHAP
│   ├── fairness/            # Fairness analysis by demographic group
│   ├── model_evaluation/    # Performance metrics and comparisons
│   ├── models/              # Model-specific visualisations
│   └── uncertainty/         # Uncertainty quantification results
├── src/                     # Source code
│   ├── analysis/            # Analysis modules
│   │   ├── dataset_visualisations.py  # Dataset exploration tools
│   │   ├── fairness.py                # Fairness assessment framework
│   │   ├── interpret_predictions.py   # SHAP-based interpretation
│   │   └── uncertainty.py             # Prediction interval generation
│   ├── data/                # Data processing
│   │   └── preprocessing.py # Feature extraction and transformation
│   ├── evaluation/          # Evaluation utilities
│   │   ├── metrics.py       # Performance metrics calculation
│   │   ├── visualisation.py # Chart generation functions
│   │   └── scripts/         # Evaluation script modules
│   │       ├── evaluate_models.py     # Multi-model evaluation
│   │       └── evaluate_random_forest.py  # RF-specific evaluation
│   ├── models/              # Model implementations
│   │   ├── base_model.py    # Abstract base class with common interface
│   │   ├── ensemble.py      # Ensemble model implementations
│   │   ├── lightgbm_model.py# LightGBM implementation
│   │   ├── mlp_model.py     # Neural network implementation
│   │   ├── random_forest_model.py # Random Forest implementation
│   │   └── xgboost_model.py # XGBoost implementation
│   └── utils/               # Shared utilities
│       ├── config.py        # Configuration management
│       ├── io.py            # Input/output operations
│       └── logger.py        # Logging framework
├── main.py                  # Main execution entry point
├── requirements.txt         # Dependency specifications
└── README.md                # Documentation
```

## Setup and Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)
- 8GB+ RAM recommended for training ensemble models

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd settlement-prediction-system
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Usage Guide

### Quick Start
To run the full pipeline from preprocessing to evaluation:

```bash
python main.py --steps all
```

### Step-by-Step Execution

#### 1. Data Preprocessing
```bash
python main.py --steps preprocess
```
This step:
- Loads the raw data
- Handles missing values
- Performs feature engineering
- Splits data into training and test sets
- Saves processed data for model training

#### 2. Model Training
Train individual models:
```bash
# Train LightGBM model
python main.py --steps train_lgbm

# Train XGBoost model
python main.py --steps train_xgboost

# Train neural network (MLP) model
python main.py --steps train_mlp

# Train Random Forest model
python main.py --steps train_rf
```

#### 3. Hyperparameter Tuning
```bash
python main.py --steps tune
```
Uses Optuna for Bayesian optimization of model hyperparameters.

#### 4. Ensemble Creation
```bash
python main.py --steps ensemble
```
Creates and trains multiple ensemble models that combine the base models.

#### 5. Analysis and Evaluation

```bash
# Comprehensive evaluation of all models
python main.py --steps evaluate

# Generate model explanations with SHAP
python main.py --steps interpret

# Perform fairness analysis across demographic groups
python main.py --steps fairness

# Quantify prediction uncertainty
python main.py --steps uncertainty
```

#### 6. Evaluation Scripts

The project includes evaluation scripts that can be run independently:

```bash
# Evaluate all trained models and compare performance
python -m src.evaluation.scripts.evaluate_models

# Evaluate specifically the Random Forest model with detailed metrics
python -m src.evaluation.scripts.evaluate_random_forest
```

These scripts provide a convenient way to evaluate model performance without running the full pipeline.

### Configuration
You can modify `config/default.yaml` to adjust:
- Model hyperparameters
- Data paths and settings
- Fairness analysis attributes
- Evaluation metrics
- Visualization options

## Advanced Features in Detail

### Ensemble Modelling

The system implements four complementary ensemble techniques:

1. **Weighted Ensemble**: Optimally weights model predictions based on validation performance
2. **Stacking Ensemble**: Uses predictions from base models as features for a meta-model
3. **Stacking CV Ensemble**: Cross-validated stacking to prevent overfitting
4. **Blending Ensemble**: Uses a separate holdout set to train the meta-model

### Fairness Analysis

The fairness analysis module evaluates model performance across demographic groups:

- **Metrics** include bias, error distributions, and coverage analysis
- **Visualisations** highlight performance differences across groups
- **Detailed reports** provide insights and recommendations
- **Attributes analysed** include gender, accident type, injury type, and more

To run the fairness analysis independently:
```bash
python main.py --steps fairness
```


### Uncertainty Quantification

The system provides calibrated prediction intervals:

- Uses **quantile regression** to estimate prediction intervals
- Provides **80% confidence intervals** for settlement values
- Calibrates intervals to ensure proper coverage
- Visualises uncertainty for different prediction ranges

To run the uncertainty quantification independently:
```bash
python main.py --steps uncertainty
```


### Model Interpretation

The interpretation module explains the model's predictions:

- Uses **SHAP values** to quantify feature importance
- Provides global and local explanations
- Visualises feature interactions and dependencies
- Helps identify key drivers of settlement values

## Performance and Results

The system achieves excellent performance on the test dataset:

| Model                  | RMSE    | MAE     | R²      |
|------------------------|---------|---------|---------|
| Stacking Ensemble      | 278.90  | 136.93  | 0.8799  |
| XGBoost                | 279.91  | 137.94  | 0.8790  |
| Random Forest          | 307.59  | 177.81  | 0.8539  |
| MLP (Neural Network)   | 459.68  | 279.47  | 0.6738  |


## Acknowledgments

- The open-source community for tools like scikit-learn, XGBoost, and SHAP
- Academic research on ensemble methods, uncertainty quantification, and fairness in ML