# Converts finance model instances to JSON format and validates input data.

from rest_framework import serializers
from .models import BillingRecord, UsageStatistics, InsuranceCompany, Invoice, InvoiceItem, BillingRate
from account.serializers import UserSerializer
from ml_interface.serializers import PredictionSerializer
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class InsuranceCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = ['id', 'name', 'contact_email', 'contact_phone', 'address', 'billing_email',
                 'company_id', 'contract_number', 'contract_start_date', 'contract_end_date',
                 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'invoice', 'billing_record', 'description', 'quantity', 
                 'unit_price', 'total_price']
        read_only_fields = ['id']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    insurance_company_name = serializers.CharField(required=False, read_only=True)
    invoice_number = serializers.CharField(required=False)  # Made optional
    
    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'insurance_company', 'insurance_company_name',
                 'created_at', 'issued_date', 'due_date', 'status', 'total_amount',
                 'currency', 'notes', 'paid_date', 'invoice_file', 'items']
        read_only_fields = ['id', 'created_at', 'insurance_company_name']
        
    def to_representation(self, instance):
        """
        Override to always provide the current insurance_company_name from the related company
        This ensures we always display the up-to-date company name, even if it changed after invoice creation
        """
        ret = super().to_representation(instance)
        # Always use the current company name from the relationship if available
        if instance.insurance_company:
            ret['insurance_company_name'] = instance.insurance_company.name
        return ret
        
    def create(self, validated_data):
        """
        Override create to ensure we handle invoice creation correctly
        """
        logger.info("Creating invoice with data: %s", validated_data)
        
        # Create the invoice - The invoice_number will be automatically generated in the view's perform_create method
        try:
            invoice = super().create(validated_data)
            logger.info("Invoice created successfully with ID: %s", invoice.id)
            return invoice
        except Exception as e:
            logger.error("Error creating invoice: %s", str(e))
            raise


class BillingRecordSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    prediction = PredictionSerializer(read_only=True)
    insurance_company_name = serializers.ReadOnlyField(source='insurance_company.name', default=None)
    
    class Meta:
        model = BillingRecord
        fields = ['id', 'user', 'prediction', 'amount', 'currency', 'payment_status',
                 'description', 'invoice_number', 'created_at', 'updated_at', 'paid_at',
                 'insurance_company', 'insurance_company_name', 'claim_reference', 'due_date']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class UsageStatisticsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    insurance_company_name = serializers.ReadOnlyField(source='insurance_company.name', default=None)
    
    class Meta:
        model = UsageStatistics
        fields = ['id', 'user', 'date', 'predictions_count', 'successful_predictions',
                 'failed_predictions', 'total_processing_time', 'average_processing_time',
                 'billed_amount', 'insurance_company', 'insurance_company_name']
        read_only_fields = fields


class UserBillingStatsSerializer(serializers.Serializer):
    total_billed = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    last_payment_date = serializers.DateTimeField()
    total_predictions = serializers.IntegerField()


class BillingRateSerializer(serializers.ModelSerializer):
    insurance_company_name = serializers.ReadOnlyField(source='insurance_company.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')
    
    class Meta:
        model = BillingRate
        fields = ['id', 'insurance_company', 'insurance_company_name', 'rate_per_claim', 
                 'effective_from', 'effective_to', 'is_active', 'created_at', 
                 'updated_at', 'created_by', 'created_by_name']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 
                          'insurance_company_name', 'created_by_name']
    
    def validate(self, data):
        """
        Validate the billing rate data.
        """
        # If effective_to is provided, it should be after effective_from
        if data.get('effective_to') and data.get('effective_from') and data['effective_to'] <= data['effective_from']:
            raise serializers.ValidationError("Effective end date must be after effective start date.")
        
        # If updating is_active to True, ensure no other active rates exist for this company
        if self.instance and 'is_active' in data and data['is_active']:
            company = data.get('insurance_company') or self.instance.insurance_company
            active_rates = BillingRate.objects.filter(
                insurance_company=company,
                is_active=True
            ).exclude(id=self.instance.id)
            
            if active_rates.exists():
                raise serializers.ValidationError(
                    "Another active billing rate already exists for this company. "
                    "Please deactivate it first."
                )
        
        return data
    
    def create(self, validated_data):
        """
        Add the user who created the rate.
        """
        validated_data['created_by'] = self.context['request'].user
        
        # Default effective_from to today if not provided
        if 'effective_from' not in validated_data:
            validated_data['effective_from'] = timezone.now().date()
        
        # If this is an active rate, deactivate any other active rates for this company
        if validated_data.get('is_active', True):
            company = validated_data['insurance_company']
            BillingRate.objects.filter(
                insurance_company=company,
                is_active=True
            ).update(is_active=False)
        
        return super().create(validated_data)