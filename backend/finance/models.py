from django.db import models
from account.models import User
from ml_interface.models import Prediction


class BillingRecord(models.Model):
    """
    Model to track billing information for ML model usage
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='billing_records')
    prediction = models.OneToOneField(
        Prediction, on_delete=models.SET_NULL, null=True, blank=True, related_name='billing_record'
    )
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    )
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    
    description = models.TextField(blank=True)
    invoice_number = models.CharField(max_length=50, unique=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - {self.user.email} - {self.amount} {self.currency}"


class UsageStatistics(models.Model):
    """
    Model to track user usage statistics for reporting
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_stats')
    date = models.DateField()
    
    # Usage metrics
    predictions_count = models.IntegerField(default=0)
    successful_predictions = models.IntegerField(default=0)
    failed_predictions = models.IntegerField(default=0)
    
    total_processing_time = models.FloatField(default=0.0)
    average_processing_time = models.FloatField(default=0.0)
    
    # Cost metrics
    billed_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']
    
    def __str__(self):
        return f"Usage stats for {self.user.email} on {self.date}"