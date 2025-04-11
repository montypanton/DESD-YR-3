from rest_framework import serializers
from .models import Claim, MLPrediction
import uuid

class MLPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLPrediction
        fields = ['id', 'settlement_amount', 'confidence_score', 'created_at']


class ClaimSerializer(serializers.ModelSerializer):
    ml_prediction = MLPredictionSerializer(read_only=True)
    
    class Meta:
        model = Claim
        fields = ['id', 'title', 'description', 'amount', 'claim_data', 'status', 
                 'created_at', 'updated_at', 'reference_number', 'ml_prediction']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'reference_number', 'ml_prediction']

    def create(self, validated_data):
        validated_data['reference_number'] = f"CLM-{uuid.uuid4().hex[:8].upper()}"
        print("Creating claim with data:", validated_data)
        instance = super().create(validated_data)
        print("Created claim:", instance.id)
        return instance


class ClaimDashboardSerializer(serializers.ModelSerializer):
    settlement_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Claim
        fields = ['id', 'reference_number', 'title', 'amount', 'status', 'created_at', 'settlement_amount']
        
    def get_settlement_amount(self, obj):
        if obj.ml_prediction:
            return obj.ml_prediction.settlement_amount
        return None