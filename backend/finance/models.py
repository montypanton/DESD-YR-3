# Defines database models for storing user financial information.

from django.db import models
from account.models import User
from ml_interface.models import Prediction


class InsuranceCompany(models.Model):
    """Represents an insurance company for billing purposes."""
    
    name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    billing_email = models.EmailField()
    
    # Company identifier (e.g., tax ID)
    company_id = models.CharField(max_length=50, unique=True)
    
    # Contract details
    contract_number = models.CharField(max_length=50, blank=True)
    contract_start_date = models.DateField(null=True, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Insurance Companies"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class BillingRecord(models.Model):

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
    
    insurance_company = models.ForeignKey(
        InsuranceCompany, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='billing_records'
    )
    claim_reference = models.CharField(max_length=100, blank=True)
    due_date = models.DateField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - {self.user.email} - {self.amount} {self.currency}"


class Invoice(models.Model):
    """Represents a consolidated invoice to an insurance company."""
    
    invoice_number = models.CharField(max_length=50, unique=True)
    insurance_company = models.ForeignKey(InsuranceCompany, on_delete=models.CASCADE, related_name='invoices')
    
    created_at = models.DateTimeField(auto_now_add=True)
    issued_date = models.DateField()
    due_date = models.DateField()
    
    INVOICE_STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('ISSUED', 'Issued'),
        ('SENT', 'Sent'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    )
    status = models.CharField(max_length=20, choices=INVOICE_STATUS_CHOICES, default='DRAFT')
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    notes = models.TextField(blank=True)
    paid_date = models.DateField(null=True, blank=True)
    
    invoice_file = models.FileField(upload_to='invoices/', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - {self.insurance_company.name} - {self.total_amount} {self.currency}"


class InvoiceItem(models.Model):
    """Individual line items within an invoice."""
    
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    billing_record = models.ForeignKey(BillingRecord, on_delete=models.CASCADE, related_name='invoice_items')
    
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"Item: {self.description} for Invoice #{self.invoice.invoice_number}"


class UsageStatistics(models.Model):

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_stats')
    date = models.DateField()
    
    predictions_count = models.IntegerField(default=0)
    successful_predictions = models.IntegerField(default=0)
    failed_predictions = models.IntegerField(default=0)
    
    total_processing_time = models.FloatField(default=0.0)
    average_processing_time = models.FloatField(default=0.0)
    
    billed_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    insurance_company = models.ForeignKey(
        InsuranceCompany, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='usage_stats'
    )
    
    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']
    
    def __str__(self):
        return f"Usage stats for {self.user.email} on {self.date}"