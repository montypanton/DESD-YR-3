# Handles conversion of ML-related data between model instances and JSON.

from rest_framework import serializers
from .models import MLModel, Prediction
from account.serializers import UserSerializer
from .ml_processor import MLProcessor
import logging

logger = logging.getLogger('ml_interface')

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
        validated_data['status'] = 'PROCESSING'
        
        try:
            # Initialize ML processor
            processor = MLProcessor()
            model = validated_data['model']
            
            # Load the model
            processor.load_model(model.model_file.path)
            
            # Make prediction
            prediction_result = processor.predict(validated_data['input_data'])
            
            # Update validated data with prediction results
            validated_data['status'] = 'COMPLETED'
            validated_data['output_data'] = prediction_result
            validated_data['processing_time'] = prediction_result['processing_time']
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            validated_data['status'] = 'FAILED'
            validated_data['error_message'] = str(e)
            validated_data['output_data'] = {}
            validated_data['processing_time'] = 0
        
        return super().create(validated_data)