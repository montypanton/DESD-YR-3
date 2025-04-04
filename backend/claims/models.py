from django.db import models
from account.models import User

class Claim(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('REVIEWING', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    
    INJURY_TYPE_CHOICES = (
        ('Minor', 'Minor'),
        ('Moderate', 'Moderate'),
        ('Severe', 'Severe'),
        ('Critical', 'Critical'),
    )
    
    # User who submitted the claim
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claims')
    
    # Claim details
    injuryType = models.CharField(max_length=50, choices=INJURY_TYPE_CHOICES)
    recoveryTime = models.IntegerField(help_text="Expected recovery time in days")
    travelCosts = models.DecimalField(max_digits=10, decimal_places=2)
    lossOfEarnings = models.DecimalField(max_digits=10, decimal_places=2)
    additionalExpenses = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    
    # Claim processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    settlementValue = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reviewNotes = models.TextField(blank=True)
    reviewedBy = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_claims'
    )
    
    # Timestamps
    submittedAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    reviewedAt = models.DateTimeField(null=True, blank=True)
    
    # AI prediction (optional)
    predictedSettlement = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    confidenceScore = models.FloatField(null=True, blank=True)
    
    class Meta:
        ordering = ['-submittedAt']
    
    def __str__(self):
        return f"Claim #{self.id} - {self.user.email} - {self.status}"
    
    @property
    def total_claim_amount(self):
        """Calculate the total amount claimed"""
        return self.travelCosts + self.lossOfEarnings + self.additionalExpenses
    
    @property
    def days_since_submission(self):
        """Calculate days since submission"""
        from django.utils import timezone
        delta = timezone.now() - self.submittedAt
        return delta.days


class ClaimDocument(models.Model):
    """Model to store supporting documents for claims"""
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='documents')
    document = models.FileField(upload_to='claim_documents/')
    document_type = models.CharField(max_length=100)
    uploadedAt = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Document for Claim #{self.claim.id} - {self.document_type}"


class ClaimHistory(models.Model):
    """Model to track the history of status changes for a claim"""
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='history')
    from_status = models.CharField(max_length=20, choices=Claim.STATUS_CHOICES)
    to_status = models.CharField(max_length=20, choices=Claim.STATUS_CHOICES)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='claim_status_changes')
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-changed_at']
        verbose_name_plural = 'Claim histories'
    
    def __str__(self):
        return f"Claim #{self.claim.id} status change: {self.from_status} → {self.to_status}"