# Converts finance model instances to JSON format and validates input data.

from rest_framework import serializers
from .models import BillingRecord, UsageStatistics, InsuranceCompany, Invoice, InvoiceItem
from account.serializers import UserSerializer
from ml_interface.serializers import PredictionSerializer


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
    insurance_company_name = serializers.ReadOnlyField(source='insurance_company.name')
    
    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'insurance_company', 'insurance_company_name',
                 'created_at', 'issued_date', 'due_date', 'status', 'total_amount',
                 'currency', 'notes', 'paid_date', 'invoice_file', 'items']
        read_only_fields = ['id', 'created_at', 'insurance_company_name']


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