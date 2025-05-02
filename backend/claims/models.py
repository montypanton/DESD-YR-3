from django.db import models
from django.contrib.auth import get_user_model
import os

User = get_user_model()

def claim_file_path(instance, filename):
    """
    Function to determine the file path for claim attachments.
    Files will be uploaded to MEDIA_ROOT/claims/claim_<id>/<filename>
    """
    return os.path.join('claims', f'claim_{instance.claim.id}', filename)

class Claim(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
    )
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claims')
    title = models.CharField(max_length=255)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    claim_data = models.JSONField()  # Storing the form inputs as JSON
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reference_number = models.CharField(max_length=50, unique=True)
    # This field will be NULL until ML processing is complete
    ml_prediction = models.OneToOneField('MLPrediction', on_delete=models.SET_NULL, null=True, blank=True, related_name='claim')
    # Final settlement amount decided by the insurance adjuster (can differ from ML prediction)
    decided_settlement_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    def __str__(self):
        return f"Claim {self.reference_number} - {self.user.email}"

class MLPrediction(models.Model):
    id = models.AutoField(primary_key=True)
    model = models.ForeignKey('ml_interface.MLModel', on_delete=models.SET_NULL, null=True)
    input_data = models.JSONField()
    output_data = models.JSONField()
    settlement_amount = models.DecimalField(max_digits=10, decimal_places=2)
    confidence_score = models.FloatField()
    processing_time = models.FloatField()  # in seconds
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Prediction {self.id} for Claim {self.claim.reference_number if hasattr(self, 'claim') else 'unknown'}"

    @property
    def prediction(self):
        """Return prediction data in a consistent format"""
        return {
            'settlement_amount': float(self.settlement_amount),
            'confidence_score': float(self.confidence_score),
            'processing_time': float(self.processing_time),
            'details': self.output_data.get('details', {})
        }