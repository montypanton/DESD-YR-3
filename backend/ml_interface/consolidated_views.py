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
import numpy as np
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Max, Min, StdDev, F, FloatField
from django.db.models.functions import Cast
from collections import defaultdict
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


class MLPerformanceViewSet(viewsets.ViewSet):
    """
    API endpoint for getting ML model performance metrics.
    This provides metrics for the ML Performance Dashboard.
    """
    permission_classes = [IsAuthenticated]

    def _get_time_range_filter(self, time_range):
        """Helper to convert time range string to datetime filter"""
        now = timezone.now()
        if time_range == '7days':
            return now - timedelta(days=7)
        elif time_range == '30days':
            return now - timedelta(days=30)
        elif time_range == '90days':
            return now - timedelta(days=90)
        elif time_range == '1year':
            return now - timedelta(days=365)
        else:
            # Default to 30 days
            return now - timedelta(days=30)
    
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """
        Get performance metrics for a specific model.
        Includes confidence scores, processing times, etc.
        """
        try:
            # Get the model
            model = MLModel.objects.get(pk=pk)
            
            # Get time range from query params (default to 30 days)
            time_range = request.query_params.get('timeRange', '30days')
            min_date = self._get_time_range_filter(time_range)
            
            # Get all predictions for this model in the time range
            predictions = Prediction.objects.filter(
                model=model,
                created_at__gte=min_date,
                status='COMPLETED'
            )
            
            # Calculate metrics
            metrics = []
            
            # Get confidence scores from output_data
            confidence_scores = []
            for pred in predictions:
                try:
                    confidence_score = pred.output_data.get('confidence_score', 0)
                    confidence_scores.append(float(confidence_score))
                except (KeyError, ValueError, TypeError):
                    pass
            
            if confidence_scores:
                avg_confidence = sum(confidence_scores) / len(confidence_scores)
                confidence_trend = 0  # Calculate trend compared to previous period
                
                metrics.append({
                    'name': 'Average Confidence Score',
                    'value': avg_confidence,
                    'trend': confidence_trend
                })
            
            # Processing time metrics
            processing_times = []
            for pred in predictions:
                if pred.processing_time:
                    processing_times.append(pred.processing_time)
            
            if processing_times:
                avg_processing_time = sum(processing_times) / len(processing_times)
                metrics.append({
                    'name': 'Average Processing Time',
                    'value': f'{avg_processing_time:.3f}s',
                    'trend': 0
                })
            
            # Prediction count
            prediction_count = predictions.count()
            metrics.append({
                'name': 'Total Predictions',
                'value': prediction_count,
                'trend': 0
            })
            
            # Success rate
            success_count = predictions.filter(status='COMPLETED').count()
            if prediction_count > 0:
                success_rate = success_count / prediction_count
                metrics.append({
                    'name': 'Success Rate',
                    'value': success_rate,
                    'trend': 0
                })
            
            return Response(metrics)
            
        except MLModel.DoesNotExist:
            return Response(
                {'error': 'Model not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting model metrics: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def confusion_matrix(self, request, pk=None):
        """
        Get confusion matrix data for a specific model.
        For claims processing, this is a simplified 2x2 matrix showing
        correct/incorrect claim value predictions.
        """
        try:
            # Get the model
            model = MLModel.objects.get(pk=pk)
            
            # Get time range from query params
            time_range = request.query_params.get('timeRange', '30days')
            min_date = self._get_time_range_filter(time_range)
            
            # For demo purposes, we'll create a simple 2x2 matrix
            # In a real application, you would use actual prediction outcomes
            matrix = [
                [85, 15],  # Actual Accept: Predicted Accept, Predicted Reject
                [10, 90]   # Actual Reject: Predicted Accept, Predicted Reject
            ]
            
            labels = ['Accept', 'Reject']
            
            return Response({
                'matrix': matrix,
                'labels': labels
            })
            
        except MLModel.DoesNotExist:
            return Response(
                {'error': 'Model not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting confusion matrix: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def error_analysis(self, request, pk=None):
        """
        Get error analysis data for a specific model.
        """
        try:
            # Get the model
            model = MLModel.objects.get(pk=pk)
            
            # Get time range from query params
            time_range = request.query_params.get('timeRange', '30days')
            min_date = self._get_time_range_filter(time_range)
            
            # Sample error analysis data
            errors = [
                {
                    'category': 'Low Confidence Predictions',
                    'frequency': 12.5,
                    'impact': 'Medium',
                    'description': 'Predictions with confidence below 75% tend to have higher error rates.'
                },
                {
                    'category': 'Processing Time Spikes',
                    'frequency': 5.2,
                    'impact': 'Low',
                    'description': 'Occasional spikes in processing time observed for complex claims.'
                },
                {
                    'category': 'Missing Injury Data',
                    'frequency': 8.3,
                    'impact': 'High',
                    'description': 'Claims with incomplete injury data show significant prediction deviation.'
                }
            ]
            
            # Sample model comparison data (with different versions)
            comparison = []
            
            # Current model
            comparison.append({
                'version': model.version,
                'accuracy': 0.92,
                'f1_score': 0.91, 
                'error_rate': 0.08,
                'processing_time': 325
            })
            
            # Add previous versions for comparison
            previous_models = MLModel.objects.filter(
                name=model.name, 
                version__lt=model.version
            ).order_by('-version')[:2]
            
            for prev_model in previous_models:
                comparison.append({
                    'version': prev_model.version,
                    'accuracy': 0.89 - (float(model.version) - float(prev_model.version))/100,
                    'f1_score': 0.88 - (float(model.version) - float(prev_model.version))/100,
                    'error_rate': 0.11 + (float(model.version) - float(prev_model.version))/100,
                    'processing_time': 350 + int((float(model.version) - float(prev_model.version))*25)
                })
            
            return Response({
                'errors': errors,
                'comparison': comparison
            })
            
        except MLModel.DoesNotExist:
            return Response(
                {'error': 'Model not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting error analysis: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @action(detail=True, methods=['get'])
    def confidence_distribution(self, request, pk=None):
        """
        Get confidence score distribution for a specific model.
        """
        try:
            # Get the model
            model = MLModel.objects.get(pk=pk)
            
            # Get time range from query params
            time_range = request.query_params.get('timeRange', '30days')
            min_date = self._get_time_range_filter(time_range)
            
            # Get predictions
            predictions = Prediction.objects.filter(
                model=model,
                created_at__gte=min_date,
                status='COMPLETED'
            )
            
            # Extract confidence scores from output_data
            confidence_bins = {
                "90%-100%": 0,
                "80%-90%": 0,
                "70%-80%": 0,
                "60%-70%": 0,
                "50%-60%": 0,
                "0%-50%": 0
            }
            
            total_scored = 0
            
            for pred in predictions:
                try:
                    confidence_score = float(pred.output_data.get('confidence_score', 0))
                    total_scored += 1
                    
                    if confidence_score >= 0.9:
                        confidence_bins["90%-100%"] += 1
                    elif confidence_score >= 0.8:
                        confidence_bins["80%-90%"] += 1
                    elif confidence_score >= 0.7:
                        confidence_bins["70%-80%"] += 1
                    elif confidence_score >= 0.6:
                        confidence_bins["60%-70%"] += 1
                    elif confidence_score >= 0.5:
                        confidence_bins["50%-60%"] += 1
                    else:
                        confidence_bins["0%-50%"] += 1
                        
                except (KeyError, ValueError, TypeError):
                    pass
            
            # Convert counts to percentages
            distribution = []
            if total_scored > 0:
                for bin_name, count in confidence_bins.items():
                    distribution.append({
                        'range': bin_name,
                        'percentage': (count / total_scored) * 100
                    })
            
            return Response({
                'distribution': distribution,
                'total_predictions': total_scored
            })
            
        except MLModel.DoesNotExist:
            return Response(
                {'error': 'Model not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting confidence distribution: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )