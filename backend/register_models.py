#!/usr/bin/env python
"""
Script to manually register ML models from the ML service in Django.
This can be run directly inside the Django container.
"""

import os
import sys
import logging
import django

# Set up Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import Django models
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from ml_interface.models import MLModel
from ml_interface.ml_client import ml_client

User = get_user_model()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def register_models():
    """Register ML models from the ML service in Django."""
    
    # Get admin user
    try:
        admin_user = User.objects.get(email='admin@example.com')
        logger.info(f"Using admin user: {admin_user.email}")
    except User.DoesNotExist:
        logger.error("Admin user not found. Please create an admin user first.")
        return False

    # Check ML service health
    try:
        health_check = ml_client.health_check()
        if health_check.get('status') != 'ok':
            logger.error(f"ML service health check failed: {health_check}")
            return False
        logger.info(f"ML service health check passed: {health_check}")
    except Exception as e:
        logger.error(f"ML service health check error: {e}")
        return False

    # Get available models
    try:
        models_info = ml_client.list_models()
        if 'models' not in models_info:
            logger.error(f"Failed to get models from ML service: {models_info}")
            return False
        
        models = models_info['models']
        default_model = models_info.get('default_model')
        
        logger.info(f"Found {len(models)} models in ML service. Default: {default_model}")
        
        if not models:
            logger.warning("No models available in ML service.")
            return False

        # Register models in Django
        for model_info in models:
            model_name = model_info['name']
            file_name = model_info['file_name']
            
            # Check if model already exists
            existing_model = MLModel.objects.filter(name=model_name).first()
            if existing_model:
                logger.info(f"Model {model_name} already exists. Updating active status.")
                existing_model.is_active = (model_name == default_model)
                existing_model.save()
                continue
            
            # Create new model
            logger.info(f"Creating new model: {model_name}")
            
            # For local development, use the same file location
            local_model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ml-service', 'models', file_name)
            logger.info(f"Looking for model file at: {local_model_path}")
            
            if not os.path.exists(local_model_path):
                # Try alternative path
                local_model_path = f"/app/ml-service/models/{file_name}"
                logger.info(f"Trying alternative path: {local_model_path}")
                
                if not os.path.exists(local_model_path):
                    logger.error(f"Model file not found at {local_model_path}")
                    continue
            
            try:
                # Create model record
                model = MLModel(
                    name=model_name,
                    version="1.0",
                    description=f"Automatically registered model: {model_name}",
                    created_by=admin_user,
                    model_type="RandomForestRegressor",
                    is_active=(model_name == default_model)
                )
                
                # Read the model file content
                with open(local_model_path, 'rb') as f:
                    file_content = f.read()
                    model_filename = os.path.basename(local_model_path)
                    model.model_file.save(model_filename, ContentFile(file_content))
                
                logger.info(f"Successfully registered model: {model_name}, is_active={model.is_active}")
            except Exception as e:
                logger.error(f"Error creating model {model_name}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        # Set only one model active if needed
        if default_model:
            active_models = MLModel.objects.filter(is_active=True).exclude(name=default_model)
            if active_models.exists():
                active_models.update(is_active=False)
                logger.info(f"Set {default_model} as the only active model")
        
        logger.info("ML models registration complete")
        return True
        
    except Exception as e:
        logger.error(f"Error registering ML models: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    logger.info("Starting ML model registration")
    success = register_models()
    if success:
        logger.info("ML model registration successful")
        sys.exit(0)
    else:
        logger.error("ML model registration failed")
        sys.exit(1)