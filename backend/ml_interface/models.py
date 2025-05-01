# Defines models for storing data related to machine learning predictions.

from django.db import models
from django.conf import settings
import os
import joblib
import logging
import io
import traceback
from account.models import User

logger = logging.getLogger(__name__)

class MLModel(models.Model):
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    
    model_file = models.FileField(upload_to='ml_models/')
    model_type = models.CharField(max_length=100)
    input_format = models.JSONField(default=dict)
    output_format = models.JSONField(default=dict)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_models')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('name', 'version')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} v{self.version}"

    def get_model_path(self):
        """Get the absolute path to the model file"""
        if self.model_file:
            return os.path.join(settings.MEDIA_ROOT, self.model_file.name)
        return None

    def save(self, *args, **kwargs):
        """Save method with validation of uploaded model"""
        if self.model_file:
            try:
                model_path = self.get_model_path()
                if model_path and os.path.exists(model_path):
                    # Try to load the model to verify it's valid
                    loaded_model = joblib.load(model_path)
                    if not hasattr(loaded_model, 'predict'):
                        raise ValueError("Invalid model - no predict method")
                    
                    logger.info(f"Valid model file verified at {model_path}")
            except Exception as e:
                logger.error(f"Error validating model file: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise
        
        super().save(*args, **kwargs)


class Prediction(models.Model):
    model = models.ForeignKey(MLModel, on_delete=models.CASCADE, related_name='predictions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='predictions')
    
    input_data = models.JSONField()
    output_data = models.JSONField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    processing_time = models.FloatField(help_text="Processing time in seconds", null=True, blank=True)
    
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Prediction {self.id} - {self.model.name} - {self.status}"