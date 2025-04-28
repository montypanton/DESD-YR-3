import yaml
import os

# Default configuration
DEFAULT_CONFIG = {
    'data': {
        'input_path': 'data/Synthetic_Data_For_Students.csv',
        'target_column': 'SettlementValue',
        'test_size': 0.2,
        'random_state': 42
    },
    'models': {
        'mlp': {
            'hidden_layers': [100, 50],
            'max_iter': 1000
        },
        'xgboost': {
            'n_estimators': 200,
            'max_depth': 6,
            'learning_rate': 0.1
        },
        'lightgbm': {
            'n_estimators': 200,
            'max_depth': 6,
            'learning_rate': 0.1,
            'num_leaves': 31
        }
    },
    'paths': {
        'processed_data': 'data/processed_data',
        'models': 'models',
        'results': 'results2'
    },
    'random_forest': {
        'n_estimators': 200,
        'max_depth': 10
    },
    'tune': {
        'models': ['lightgbm', 'xgboost', 'mlp', 'random_forest'],
        'n_trials': 50
    },
    'fairness': {
        'sensitive_attributes': ['Gender', 'AccidentType', 'Dominant injury', 'Whiplash', 'Vehicle Type', 'Weather Conditions', 'Injury_Prognosis']
    }
}

def load_config(config_path='config/default.yaml'):
    """Load configuration from YAML file."""
    try:
        if not os.path.exists(config_path):
            print(f"Warning: Config file {config_path} not found. Using default configuration.")
            return DEFAULT_CONFIG
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Make sure we have all required sections, fill in with defaults if missing
        if not config:
            print("Warning: Empty config file. Using default configuration.")
            return DEFAULT_CONFIG
            
        # Ensure all required sections exist
        for section, section_data in DEFAULT_CONFIG.items():
            if section not in config:
                print(f"Warning: Section '{section}' missing from config. Using default values.")
                config[section] = section_data
            else:
                # Check subsections
                for key, value in section_data.items():
                    if key not in config[section]:
                        print(f"Warning: Key '{key}' missing from section '{section}'. Using default value.")
                        config[section][key] = value
        
        return config
    
    except Exception as e:
        print(f"Error loading configuration: {e}")
        print("Using default configuration instead.")
        return DEFAULT_CONFIG