from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Claim(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('PROCESSING', 'Processing'),
    )
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claims')
    title = models.CharField(max_length=255)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # The amount claimed by user
    claim_data = models.JSONField()  # Storing the form inputs as JSON
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reference_number = models.CharField(max_length=50, unique=True)
    # This field will be NULL until ML processing is complete
    ml_prediction = models.OneToOneField('MLPrediction', on_delete=models.SET_NULL, null=True, blank=True, related_name='claim')
    
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
