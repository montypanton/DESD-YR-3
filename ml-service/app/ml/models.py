import os
import logging
from typing import Dict, List, Optional
import joblib
import pickle
from pathlib import Path
import glob

from app.config import MODELS_DIR, DEFAULT_MODEL_PATH, logger

class ModelManager:
    def __init__(self):
        self.models_dir = MODELS_DIR
        self.loaded_models: Dict[str, object] = {}
        self.default_model_path = DEFAULT_MODEL_PATH
    
    def scan_models(self) -> List[Dict]:
        """Scan the models directory for available models"""
        model_files = []
        
        # Check all .pkl and .joblib files
        for file_path in glob.glob(os.path.join(self.models_dir, "*.pkl")) + \
                        glob.glob(os.path.join(self.models_dir, "*.joblib")):
            file_name = os.path.basename(file_path)
            
            # Skip converted models (they appear as duplicates)
            if "_converted" in file_name:
                continue
                
            model_info = {
                "name": file_name.split(".")[0],
                "file_name": file_name,
                "path": file_path,
                "size": os.path.getsize(file_path),
                "last_modified": os.path.getmtime(file_path)
            }
            model_files.append(model_info)
            
        return model_files
    
    def get_model(self, model_name: Optional[str] = None) -> object:
        """Get a loaded model by name or the default model"""
        try:
            if model_name is None:
                # Use default model
                model_path = self.default_model_path
                model_name = os.path.basename(model_path).split(".")[0]
            else:
                # Check if this is a path or just a name
                if os.path.isabs(model_name):
                    model_path = model_name
                else:
                    # Try to find model file with matching name
                    potential_paths = [
                        os.path.join(self.models_dir, f"{model_name}.pkl"),
                        os.path.join(self.models_dir, f"{model_name}.joblib"),
                        os.path.join(self.models_dir, model_name)  # If full filename is provided
                    ]
                    
                    model_path = next((p for p in potential_paths if os.path.exists(p)), None)
                    
                    if not model_path:
                        raise FileNotFoundError(f"Model {model_name} not found in {self.models_dir}")
            
            # Check if model is already loaded
            if model_name in self.loaded_models:
                logger.info(f"Using already loaded model: {model_name}")
                return self.loaded_models[model_name]
            
            # Load the model
            try:
                # Try joblib first
                model = joblib.load(model_path)
                logger.info(f"Loaded model with joblib: {model_name}")
            except Exception as e:
                logger.warning(f"Joblib load failed: {str(e)}, trying pickle")
                # Try pickle if joblib fails
                with open(model_path, 'rb') as f:
                    model = pickle.load(f)
                logger.info(f"Loaded model with pickle: {model_name}")
            
            # Store for future use
            self.loaded_models[model_name] = model
            return model
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {str(e)}")
            raise

# Global model manager instance
model_manager = ModelManager()