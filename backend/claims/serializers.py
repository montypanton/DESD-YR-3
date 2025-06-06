from rest_framework import serializers
from .models import Claim, MLPrediction
import uuid

class MLPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLPrediction
        fields = ['id', 'settlement_amount', 'confidence_score', 
                 'created_at', 'processing_time', 'input_data', 'output_data']

    def to_representation(self, instance):
        """Convert the prediction output to a more user-friendly format"""
        data = super().to_representation(instance)
        if instance.output_data:
            # Extract the main prediction details
            data['prediction'] = {
                'amount': float(instance.output_data.get('settlement_amount', 0)),
                'confidence': float(instance.output_data.get('confidence_score', 0)),
                'processing_time': float(instance.output_data.get('processing_time', 0))
            }
        return data


class ClaimSerializer(serializers.ModelSerializer):
    ml_prediction = MLPredictionSerializer(read_only=True)
    reviewed_by_email = serializers.SerializerMethodField(read_only=True)
    
    # Add these fields for direct access in the API
    ml_settlement_amount = serializers.SerializerMethodField(read_only=True)
    ml_confidence_score = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Claim
        fields = ['id', 'title', 'description', 'amount', 'claim_data', 'status', 
                 'created_at', 'updated_at', 'reference_number', 'ml_prediction', 'user',
                 'decided_settlement_amount', 'reviewed_by', 'reviewed_at', 'reviewed_by_email',
                 'ml_settlement_amount', 'ml_confidence_score']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'reference_number', 'ml_prediction',
                           'reviewed_by', 'reviewed_at', 'reviewed_by_email',
                           'ml_settlement_amount', 'ml_confidence_score']

    def get_reviewed_by_email(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.email
        return None
        
    def get_ml_settlement_amount(self, obj):
        """Get ML prediction settlement amount directly for easy access"""
        if obj.ml_prediction:
            return float(obj.ml_prediction.settlement_amount)
        return None
        
    def get_ml_confidence_score(self, obj):
        """Get ML prediction confidence score directly for easy access"""
        if obj.ml_prediction:
            return float(obj.ml_prediction.confidence_score)
        return None

    def create(self, validated_data):
        validated_data['reference_number'] = f"CLM-{uuid.uuid4().hex[:8].upper()}"
        return super().create(validated_data)
        
    def to_representation(self, instance):
        """Override to ensure ML prediction data is included"""
        data = super().to_representation(instance)
        
        # If ml_prediction is None, but we should have one, requery to ensure it's loaded
        if data['ml_prediction'] is None and instance.ml_prediction_id is not None:
            instance.refresh_from_db()
            if instance.ml_prediction:
                data['ml_prediction'] = MLPredictionSerializer(instance.ml_prediction).data
                
                # Also update the direct access fields
                data['ml_settlement_amount'] = float(instance.ml_prediction.settlement_amount)
                data['ml_confidence_score'] = float(instance.ml_prediction.confidence_score)
        
        return data


class ClaimDashboardSerializer(serializers.ModelSerializer):
    settlement_amount = serializers.SerializerMethodField()
    reviewed_by_email = serializers.SerializerMethodField(read_only=True)
    submitter_email = serializers.SerializerMethodField(read_only=True)
    ml_prediction_data = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Claim
        fields = ['id', 'reference_number', 'title', 'amount', 'status', 'created_at', 
                  'settlement_amount', 'user', 'decided_settlement_amount', 'reviewed_by',
                  'reviewed_at', 'reviewed_by_email', 'submitter_email', 'ml_prediction_data']
        
    def get_settlement_amount(self, obj):
        # First check if there's a decided settlement amount
        if obj.decided_settlement_amount is not None:
            return obj.decided_settlement_amount
        # Fall back to ML prediction if available
        if obj.ml_prediction:
            return obj.ml_prediction.settlement_amount
        return None
        
    def get_reviewed_by_email(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.email
        return None
        
    def get_submitter_email(self, obj):
        if obj.user:
            return obj.user.email
        return None
        
    def get_ml_prediction_data(self, obj):
        """Get ML prediction details for display in dashboard"""
        if obj.ml_prediction:
            return {
                'settlement_amount': float(obj.ml_prediction.settlement_amount),
                'confidence_score': float(obj.ml_prediction.confidence_score),
                'processing_time': float(obj.ml_prediction.processing_time),
                'id': obj.ml_prediction.id
            }
        return None