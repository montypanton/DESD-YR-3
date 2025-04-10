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
        # Generate a unique reference number
        validated_data['reference_number'] = f"CLM-{uuid.uuid4().hex[:8].upper()}"
        return super().create(validated_data)