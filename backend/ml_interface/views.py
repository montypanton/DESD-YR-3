# Implements views to manage communication with the ML model and return results.

import os
import joblib
import pickle
import logging
import traceback
import tempfile
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from .models import MLModel, Prediction
from .serializers import MLModelSerializer, PredictionSerializer
from account.permissions import IsAdminUser, IsMLEngineer

logger = logging.getLogger(__name__)

class MLModelViewSet(viewsets.ModelViewSet):
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, (IsMLEngineer | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):
        if self.request.user.is_admin or self.request.user.is_ml_engineer:
            return MLModel.objects.all()
        return MLModel.objects.filter(is_active=True)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        model = self.get_object()
        model.is_active = True
        model.save()
        return Response({"status": "model activated"})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        model = self.get_object()
        model.is_active = False
        model.save()
        return Response({"status": "model deactivated"})
    
    def destroy(self, request, *args, **kwargs):
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
                    # Try to load with pickle first
                    with open(temp_file.name, 'rb') as f:
                        model = pickle.load(f)
                    
                    # Create the media directory if it doesn't exist
                    media_path = os.path.join(settings.MEDIA_ROOT, 'ml_models')
                    os.makedirs(media_path, exist_ok=True)
                    
                    # Save using joblib in the correct location
                    output_filename = f"{model_file.name.rsplit('.', 1)[0]}_converted.joblib"
                    output_path = os.path.join(media_path, output_filename)
                    
                    # Save the model using joblib
                    joblib.dump(model, output_path)
                    logger.info(f"Successfully converted and saved model to {output_path}")
                    
                    # Update the model_file field to point to the new joblib file
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
                        # Try to load with pickle first
                        with open(temp_file.name, 'rb') as f:
                            model = pickle.load(f)
                        
                        # Save using joblib in the correct location
                        output_filename = f"{model_file.name.rsplit('.', 1)[0]}_converted.joblib"
                        output_path = os.path.join(settings.MEDIA_ROOT, 'ml_models', output_filename)
                        
                        # Save the model using joblib
                        joblib.dump(model, output_path)
                        logger.info(f"Successfully converted and saved updated model to {output_path}")
                        
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
    queryset = Prediction.objects.all()
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['destroy']:
            self.permission_classes = [IsAuthenticated, (IsMLEngineer | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):
        if self.request.user.is_admin or self.request.user.is_ml_engineer:
            return Prediction.objects.all()
        return Prediction.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_predictions(self, request):
        queryset = Prediction.objects.filter(user=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)