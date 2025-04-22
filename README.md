# Settlement Value Prediction System

## Project Overview
This project implements a machine learning solution for predicting insurance claim settlement values. It's designed to streamline the negotiation process by providing accurate predictions early in the claims process, along with uncertainty quantification and fairness analysis.

## Features
- Data preprocessing pipeline with handling for categorical features and missing values
- Multiple ML models (XGBoost, MLP, Random Forest, Gradient Boosting)
- Advanced ensemble methods including stacking and weighted ensembles
- Prediction uncertainty quantification using quantile regression
- Model interpretability using SHAP values
- Fairness analysis across different demographic groups
- Comprehensive model evaluation and visualisation

## Project Structure
```
.
├── config/                  # Configuration files
│   └── default.yaml         # Default configuration settings
├── data/                    # Data directory
│   ├── Synthetic_Data_For_Students.csv  # Raw data file
│   └── processed_data/      # Generated during preprocessing
├── models/                  # Saved model files
├── results/                 # Analysis outputs and visualizations
│   ├── explanations/        # SHAP model explanations
│   ├── fairness/            # Fairness analysis across groups
│   └── uncertainty/         # Uncertainty quantification results
├── src/                     # Source code
│   ├── analysis/            # Code for model analysis
│   │   ├── fairness.py      # Fairness analysis functions
│   │   ├── interpret_predictions.py  # Model interpretation using SHAP
│   │   └── uncertainty.py   # Uncertainty quantification
│   ├── data/                # Data handling code
│   │   └── preprocessing.py # Data preprocessing pipeline
│   ├── evaluation/          # Model evaluation
│   │   ├── metrics.py       # Evaluation metrics
│   │   └── visualisation.py # Visualization functions
│   ├── models/              # Model implementations
│   │   ├── base_model.py    # Abstract base class for models
│   │   ├── ensemble.py      # Ensemble model implementations
│   │   ├── mlp_model.py     # Neural network model
│   │   └── xgboost_model.py # XGBoost model implementation
│   └── utils/               # Utility functions
│       ├── config.py        # Configuration loader
│       ├── io.py            # I/O utility functions
│       └── logger.py        # Logging utility
├── main.py                  # Main entry point for the application
├── requirements.txt         # Python dependencies
└── README.md                # This file
```

## Setup and Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd settlement-prediction-system
   ```

2. Create and activate a virtual environment (optional but recommended):
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

## Usage

### Run the Complete Pipeline
Run all steps in sequence:
```bash
python main.py --steps all
```

#### Data Preprocessing
Process the raw data and split into training and test sets:
```bash
python main.py --steps preprocess
```

#### Model Training
Train the base models:
```bash
python main.py --steps train_xgboost,train_mlp
```

#### Train and tune all models, including ensembles:
```bash
python main.py --steps train_xgboost,train_mlp,tune,ensemble
```

#### Evaluation and Analysis
Run comprehensive evaluation and analysis:
```bash
python main.py --steps evaluate,interpret,fairness,uncertainty
```

### Customization
You can modify the `config/default.yaml` file to adjust model hyperparameters, data paths, and other settings.

## Advanced Features

### Model Interpretation
The system uses SHAP (SHapley Additive exPlanations) to interpret model predictions and identify which features have the most impact on settlement values.

### Fairness Analysis
The system analyses model fairness across different demographic groups to identify and address potential biases in predictions.

### Uncertainty Quantification
Quantile regression is used to provide prediction intervals, giving users a better understanding of the uncertainty in predicted settlement values.