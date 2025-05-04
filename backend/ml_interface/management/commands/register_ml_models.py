import os
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from django.db import transaction
from ml_interface.models import MLModel
from ml_interface.ml_client import ml_client

logger = logging.getLogger(__name__)

User = get_user_model()

class Command(BaseCommand):
    help = 'Register ML models from the ML service in the Django database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--admin-email',
            type=str,
            default='admin@example.com',
            help='Admin user email to associate with models'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-registration even if models already exist'
        )

    def handle(self, *args, **options):
        admin_email = options['admin_email']
        force = options['force']
        
        # Find the admin user
        try:
            admin_user = User.objects.get(email=admin_email)
            self.stdout.write(f"Using admin user: {admin_user.email}")
        except User.DoesNotExist:
            self.stderr.write(f"Admin user with email {admin_email} not found. Please specify a valid admin email.")
            return
        
        # Check ML service health
        try:
            health_check = ml_client.health_check()
            if health_check.get('status') != 'ok':
                self.stderr.write(f"ML service health check failed: {health_check}")
                return
            self.stdout.write(f"ML service health check passed: {health_check}")
        except Exception as e:
            self.stderr.write(f"ML service health check error: {str(e)}")
            return
        
        # Get available models
        try:
            models_info = ml_client.list_models()
            if 'models' not in models_info:
                self.stderr.write(f"Failed to get models from ML service: {models_info}")
                return
            
            models = models_info['models']
            default_model = models_info.get('default_model')
            
            self.stdout.write(f"Found {len(models)} models in ML service. Default: {default_model}")
            
            if not models:
                self.stdout.write("No models available in ML service.")
                return
                
            # Register models in Django
            with transaction.atomic():
                for model_info in models:
                    model_name = model_info['name']
                    file_name = model_info['file_name']
                    
                    # Check if model already exists
                    existing_model = MLModel.objects.filter(name=model_name).first()
                    if existing_model and not force:
                        self.stdout.write(f"Model {model_name} already exists. Skipping.")
                        continue
                    
                    # Create temporary file copy for Django model - this is not ideal but needed for Django's file field
                    media_dir = os.path.join(settings.MEDIA_ROOT, 'ml_models')
                    os.makedirs(media_dir, exist_ok=True)
                    
                    # Get file path in ML service container
                    ml_model_path = model_info['path']
                    
                    # For local development, use the same file location
                    # Try multiple locations for the model file
                    local_model_paths = [
                        os.path.join(settings.BASE_DIR, '..', 'ml-service', 'models', file_name),
                        os.path.join(settings.BASE_DIR, '..', 'ml-service', 'models-copy', file_name),
                        f"/app/models/{file_name}"  # Try the path inside the container
                    ]
                    
                    local_model_path = None
                    for path in local_model_paths:
                        if os.path.exists(path):
                            local_model_path = path
                            self.stdout.write(f"Found model file at {path}")
                            break
                    if os.path.exists(local_model_path):
                        # Create or update model
                        if existing_model:
                            self.stdout.write(f"Updating existing model: {model_name}")
                            model = existing_model
                        else:
                            self.stdout.write(f"Creating new model: {model_name}")
                            model = MLModel(
                                name=model_name,
                                version="1.0",
                                description=f"Automatically registered model: {model_name}",
                                created_by=admin_user,
                                model_type="RandomForestRegressor" if "random_forest" in model_name else "XGBoostRegressor",
                                is_active=model_name == default_model,
                                input_format={"schema": "auto"},
                                output_format={"schema": "auto"}
                            )
                        
                        # Read the model file content
                        with open(local_model_path, 'rb') as f:
                            file_content = f.read()
                            model_filename = os.path.basename(local_model_path)
                            content_file = ContentFile(file_content, name=model_filename)
                            model.model_file.save(model_filename, content_file, save=False)
                        
                        # Save the model with validation disabled for now
                        model.save(skip_validation=True)
                        self.stdout.write(f"Successfully registered model: {model_name}, is_active={model.is_active}")
                    else:
                        self.stderr.write(f"Model file not found at {local_model_path}")
                
                # Set only one model active if needed
                if default_model:
                    # First make sure the default model is active
                    default_model_obj = MLModel.objects.filter(name=default_model).first()
                    if default_model_obj and not default_model_obj.is_active:
                        default_model_obj.is_active = True
                        default_model_obj.save()
                        self.stdout.write(f"Activated default model: {default_model}")
                    
                    # Deactivate all other models
                    active_models = MLModel.objects.filter(is_active=True).exclude(name=default_model)
                    if active_models.exists():
                        count = active_models.count()
                        active_models.update(is_active=False)
                        self.stdout.write(f"Deactivated {count} other models, set {default_model} as the only active model")
                
                self.stdout.write(self.style.SUCCESS("ML models registration complete"))
                
        except Exception as e:
            self.stderr.write(f"Error registering ML models: {str(e)}")
            import traceback
            self.stderr.write(traceback.format_exc())