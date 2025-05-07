"""
Consolidated views for the ML interface app.
This combines the functionality from both views.py and views_modified.py
into a single clean implementation.
"""
import os
import joblib
import pickle
import logging
import traceback
import tempfile
import shutil
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from .models import MLModel, Prediction
from .serializers import MLModelSerializer, PredictionSerializer
from account.permissions import IsAdminUser, IsMLEngineer
from .ml_client import ml_client  # Import the ML service client

logger = logging.getLogger(__name__)

class MLModelViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing ML models.
    """
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Return appropriate permissions based on the action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, (IsMLEngineer | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filter models based on user role."""
        if self.request.user.is_admin or self.request.user.is_ml_engineer:
            return MLModel.objects.all()
        return MLModel.objects.filter(is_active=True)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a model."""
        model = self.get_object()
        model.is_active = True
        model.save()
        return Response({"status": "model activated"})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a model."""
        model = self.get_object()
        model.is_active = False
        model.save()
        return Response({"status": "model deactivated"})
    
    def destroy(self, request, *args, **kwargs):
        """Delete a model and its file."""
        try:
            instance = self.get_object()
            # Delete the actual model file from storage
            if instance.model_file:
                if os.path.isfile(instance.model_file.path):
                    os.remove(instance.model_file.path)
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        """Create a new ML model and upload it to the ML service."""
        try:
            # Get the uploaded file
            model_file = self.request.FILES.get('model_file')
            if not model_file:
                raise ValueError("No model file provided")

            # Create a temporary file to handle the upload
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                for chunk in model_file.chunks():
                    temp_file.write(chunk)
                temp_file.flush()

                try:
                    # Get model name from serializer
                    model_name = serializer.validated_data.get('name')
                    
                    # Upload model to ML service
                    result = ml_client.upload_model(temp_file.name, model_name)
                    
                    if isinstance(result, dict) and 'error' in result:
                        raise ValueError(f"ML service rejected model: {result['error']}")
                    
                    logger.info(f"Model successfully uploaded to ML service as {model_name}")
                    
                    # Create the media directory if it doesn't exist
                    media_path = os.path.join(settings.MEDIA_ROOT, 'ml_models')
                    os.makedirs(media_path, exist_ok=True)
                    
                    # Save the file in the correct location
                    output_filename = f"{model_file.name.rsplit('.', 1)[0]}_converted.joblib"
                    output_path = os.path.join(media_path, output_filename)
                    
                    # Copy the file to the media location
                    shutil.copy(temp_file.name, output_path)
                    logger.info(f"Model file saved to {output_path}")
                    
                    # Update the model_file field to point to the new path
                    serializer.validated_data['model_file'].name = f"ml_models/{output_filename}"
                    
                except Exception as e:
                    logger.error(f"Error processing model file: {str(e)}")
                    logger.debug(f"Stack trace: {traceback.format_exc()}")
                    raise ValueError(f"Invalid model file: {str(e)}")
                
                finally:
                    # Clean up the temporary file
                    if os.path.exists(temp_file.name):
                        os.unlink(temp_file.name)

            # Save with the converted model file
            instance = serializer.save(created_by=self.request.user)
            logger.info(f"Successfully created MLModel: {instance.name} v{instance.version}")
            return instance

        except Exception as e:
            logger.error(f"Error creating MLModel: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            raise

    def perform_update(self, serializer):
        """Update an ML model and upload it to the ML service if file provided."""
        try:
            # Handle model file update similar to create
            model_file = self.request.FILES.get('model_file')
            if model_file:
                # Similar processing as in perform_create
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    for chunk in model_file.chunks():
                        temp_file.write(chunk)
                    temp_file.flush()

                    try:
                        # Upload model to ML service
                        model_name = serializer.validated_data.get('name')
                        result = ml_client.upload_model(temp_file.name, model_name)
                        
                        if isinstance(result, dict) and 'error' in result:
                            raise ValueError(f"ML service rejected model: {result['error']}")
                        
                        logger.info(f"Model successfully uploaded to ML service as {model_name}")
                        
                        # Save to media location
                        output_filename = f"{model_file.name.rsplit('.', 1)[0]}_converted.joblib"
                        output_path = os.path.join(settings.MEDIA_ROOT, 'ml_models', output_filename)
                        
                        # Copy the file to the media location
                        shutil.copy(temp_file.name, output_path)
                        logger.info(f"Model file saved to {output_path}")
                        
                        # Update the model_file field
                        serializer.validated_data['model_file'].name = f"ml_models/{output_filename}"
                        
                    except Exception as e:
                        logger.error(f"Error processing updated model file: {str(e)}")
                        logger.debug(f"Stack trace: {traceback.format_exc()}")
                        raise ValueError(f"Invalid model file: {str(e)}")
                    
                    finally:
                        # Clean up the temporary file
                        if os.path.exists(temp_file.name):
                            os.unlink(temp_file.name)

            instance = serializer.save()
            logger.info(f"Successfully updated MLModel: {instance.name} v{instance.version}")
            return instance

        except Exception as e:
            logger.error(f"Error updating MLModel: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            raise


class PredictionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing ML predictions.
    """
    queryset = Prediction.objects.all()
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Override to allow prediction without authentication.
        """
        if self.action in ['predict']:
            permission_classes = []
        elif self.action in ['destroy']:
            permission_classes = [IsAuthenticated, (IsMLEngineer | IsAdminUser)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter predictions based on user role."""
        if self.request.user.is_admin or self.request.user.is_ml_engineer:
            return Prediction.objects.all()
        return Prediction.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_predictions(self, request):
        """Get predictions for the current user."""
        queryset = Prediction.objects.filter(user=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ml_service_health(self, request):
        """Check ML service health."""
        result = ml_client.health_check()
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def available_models(self, request):
        """Get available models from ML service."""
        result = ml_client.list_models()
        return Response(result)
        
    @action(detail=False, methods=['post'])
    def predict(self, request):
        """Make a prediction using the ML service."""
        try:
            input_data = request.data.get('input_data')
            model_name = request.data.get('model_name')
            
            if not input_data:
                return Response(
                    {'error': 'Input data is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the ML client to make prediction
            result = ml_client.predict(input_data, model_name)
            
            return Response(result)
        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )