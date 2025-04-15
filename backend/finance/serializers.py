# Converts finance model instances to JSON format and validates input data.

from rest_framework import serializers
from .models import BillingRecord, UsageStatistics
from account.serializers import UserSerializer
from ml_interface.serializers import PredictionSerializer


class BillingRecordSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    prediction = PredictionSerializer(read_only=True)
    
    class Meta:
        model = BillingRecord
        fields = ['id', 'user', 'prediction', 'amount', 'currency', 'payment_status',
                 'description', 'invoice_number', 'created_at', 'updated_at', 'paid_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class UsageStatisticsSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UsageStatistics
        fields = ['id', 'user', 'date', 'predictions_count', 'successful_predictions',
                 'failed_predictions', 'total_processing_time', 'average_processing_time',
                 'billed_amount']
        read_only_fields = fields


class UserBillingStatsSerializer(serializers.Serializer):
    total_billed = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    last_payment_date = serializers.DateTimeField()
    total_predictions = serializers.IntegerField()