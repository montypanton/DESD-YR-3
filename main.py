import os
import argparse
import subprocess
import time

def create_directories():
    """Create necessary directories for the project"""
    dirs = [
        'data/processed_data',
        'models',
        'results'
    ]
    
    for dir_path in dirs:
        os.makedirs(dir_path, exist_ok=True)
        print(f"Created directory: {dir_path}")

def run_pipeline(data_path, skip_preprocessing=False, skip_training=False):
    """Run the full machine learning pipeline"""
    start_time = time.time()
    
    print("=" * 80)
    print("SETTLEMENT VALUE PREDICTION PIPELINE")
    print("=" * 80)
    
    create_directories()
    
    # 1) preprocessing
    if not skip_preprocessing:
        print("\n" + "=" * 40)
        print("STEP 1: DATA PREPROCESSING")
        print("=" * 40)
        cmd = f"python src/preprocessing.py --input {data_path}"
        print(f"Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True)
    else:
        print("\nSkipping preprocessing step...")
    
    # 2) train mlp model
    if not skip_training:
        print("\n" + "=" * 40)
        print("STEP 2: TRAINING MLP MODEL")
        print("=" * 40)
        cmd = "python src/train_mlp.py"
        print(f"Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True)
    else:
        print("\nSkipping MLP training step...")
    
    # 3) train xgb model
    if not skip_training:
        print("\n" + "=" * 40)
        print("STEP 3: TRAINING XGBOOST MODEL")
        print("=" * 40)
        cmd = "python src/train_xgboost.py"
        print(f"Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True)
    else:
        print("\nSkipping XGBoost training step...")
    
    # 4) evaluate ensemble
    if not skip_training:
        print("\n" + "=" * 40)
        print("STEP 4: CREATING ENSEMBLE MODEL")
        print("=" * 40)
        cmd = "python src/ensemble.py"
        print(f"Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True)
    else:
        print("\nSkipping ensemble creation step...")
    
    # 5) calculate performence on test set
    print("\n" + "=" * 40)
    print("STEP 5: FINAL EVALUATION")
    print("=" * 40)
    cmd = f"python src/testing.py --input {data_path} --output results/predictions.csv"
    print(f"Running: {cmd}")
    subprocess.run(cmd, shell=True, check=True)
    
    # final) print summary
    elapsed_time = time.time() - start_time
    print("\n" + "=" * 40)
    print("PIPELINE COMPLETED")
    print(f"Total execution time: {elapsed_time:.2f} seconds")
    print("=" * 40)
    print("\nResults saved to: results/predictions.csv")
    print("Model files saved to: models/")

def main():
    parser = argparse.ArgumentParser(description='Run settlement value prediction ML pipeline')
    parser.add_argument('--data', type=str, required=True, help='Path to input data CSV file')
    parser.add_argument('--skip-preprocessing', action='store_true', help='Skip preprocessing step')
    parser.add_argument('--skip-training', action='store_true', help='Skip model training steps')
    args = parser.parse_args()
    
    run_pipeline(args.data, args.skip_preprocessing, args.skip_training)

if __name__ == "__main__":
    main()