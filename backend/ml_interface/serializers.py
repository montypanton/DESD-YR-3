from rest_framework import serializers
from .models import MLModel, Prediction
from account.serializers import UserSerializer


class MLModelSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = MLModel
        fields = ['id', 'name', 'version', 'description', 'model_file', 'model_type',
                 'input_format', 'output_format', 'created_by', 'created_at', 
                 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class PredictionSerializer(serializers.ModelSerializer):
    model = MLModelSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    model_id = serializers.PrimaryKeyRelatedField(
        write_only=True, queryset=MLModel.objects.filter(is_active=True), source='model'
    )
    
    class Meta:
        model = Prediction
        fields = ['id', 'model', 'model_id', 'user', 'input_data', 'output_data',
                 'created_at', 'processing_time', 'status', 'error_message']
        read_only_fields = ['id', 'output_data', 'user', 'created_at', 
                           'processing_time', 'status', 'error_message']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = 'PENDING'
        
        # In a real implementation, this would trigger a background task
        # to process the model prediction. For now, we'll just mock it.
        validated_data['status'] = 'COMPLETED'
        validated_data['output_data'] = {
            'result': 'This is a mock prediction result',
            'confidence': 0.85
        }
        validated_data['processing_time'] = 1.2
        
        return super().create(validated_data)