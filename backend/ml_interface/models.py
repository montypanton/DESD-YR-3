# Defines models for storing data related to machine learning predictions.

from django.db import models
from account.models import User


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