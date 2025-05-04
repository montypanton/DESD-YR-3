# This is a modified version of the views.py file that uses the new ML service client
import os
import re
import logging
import uuid
import json
import traceback
from datetime import datetime

from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Claim, MLPrediction
from .serializers import ClaimSerializer, ClaimDetailSerializer
from ml_interface.models import MLModel
from ml_interface.ml_client import ml_client  # Import the ML service client
from account.permissions import IsAdminUser, IsMLEngineer, IsFinanceUser

logger = logging.getLogger(__name__)

class ClaimViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing claims.
    """
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ClaimDetailSerializer
        return ClaimSerializer
    
    def get_queryset(self):
        """Filter claims based on user role"""
        user = self.request.user
        
        # Admin and Finance users can see all claims
        if user.is_admin or user.is_finance:
            return Claim.objects.all()
        
        # ML Engineers can see all claims
        if user.is_ml_engineer:
            return Claim.objects.all()
        
        # Regular users can only see their own claims
        return Claim.objects.filter(user=user)
    
    def generate_reference_number(self):
        """Generate a unique reference number for a new claim."""
        # Format: CLM-YYYY-MM-DD-XXXX
        today = datetime.now().strftime('%Y-%m-%d')
        prefix = f"CLM-{today}"
        random_suffix = uuid.uuid4().hex[:6].upper()
        return f"{prefix}-{random_suffix}"
    
    def prepare_ml_input(self, claim_data):
        """Prepare claim data for ML processing."""
        # Start with all the claim data
        ml_input = claim_data.copy()
        
        # Add any processing needed to conform to ML model expectations
        
        # Add claim date if not present
        if 'Claim_Date' not in ml_input:
            ml_input['Claim_Date'] = datetime.now().strftime('%Y-%m-%d')
            
        return ml_input
    
    @action(detail=True, methods=['post'])
    def process_ml(self, request, pk=None):
        """Process claim with ML model to get prediction."""
        try:
            # Get the claim
            claim = self.get_object()
            
            # Get active ML model
            active_model = MLModel.objects.filter(is_active=True).first()
            if not active_model:
                logger.error("No active ML model found")
                raise serializers.ValidationError("No active ML model available")
            
            # Process ML prediction
            prediction = self.process_ml_prediction(claim, active_model)
            
            # Return prediction data
            return Response({
                'settlement_amount': prediction.settlement_amount,
                'confidence_score': prediction.confidence_score,
                'model': active_model.name
            })
            
        except Exception as e:
            logger.error(f"Error processing ML prediction: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def process_ml_prediction(self, claim, active_model=None):
        """Process the claim with ML model and update with prediction."""
        try:
            # If no active model provided, find one
            if not active_model:
                active_model = MLModel.objects.filter(is_active=True).first()
                if not active_model:
                    logger.error("No active ML model found")
                    raise serializers.ValidationError("No active ML model available")

            # Get claim data
            claim_data = claim.claim_data
            if not claim_data:
                logger.error("No claim data available for prediction")
                raise serializers.ValidationError("No claim data available for prediction")
                
            logger.debug(f"Original claim data: {claim_data}")
            
            # Process the data to match training format
            try:
                formatted_data = self.prepare_ml_input(claim_data)
                logger.debug(f"Formatted data for prediction: {formatted_data}")
            except Exception as e:
                logger.error(f"Error formatting input data: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise serializers.ValidationError(f"Error formatting input data: {str(e)}")
            
            # Send to ML service for prediction
            try:
                logger.info("Sending prediction request to ML service")
                model_name = active_model.name  # Use the model name from the database
                result = ml_client.predict(formatted_data, model_name)
                
                # Extract prediction result from ML service response
                prediction_data = result["prediction"]
                logger.info(f"ML service prediction result: {prediction_data}")
                
                # Create prediction object
                prediction = MLPrediction.objects.create(
                    model=active_model,
                    input_data=formatted_data,
                    output_data=result,
                    settlement_amount=prediction_data["settlement_amount"],
                    confidence_score=prediction_data["confidence_score"],
                    processing_time=prediction_data["processing_time"]
                )
                logger.info(f"Created prediction record with ID: {prediction.id}")
                
                # Update claim with new prediction
                claim.ml_prediction = prediction
                if claim.status == 'PENDING':
                    claim.status = 'COMPLETED'
                    logger.info(f"Updated claim status from PENDING to COMPLETED")
                claim.save()
                logger.info(f"Updated claim {claim.reference_number} with new prediction")
                
                return prediction
                
            except Exception as e:
                logger.error(f"Error getting prediction from ML service: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise serializers.ValidationError(f"Failed to get prediction from ML service: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error in process_ml_prediction: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            raise

    def perform_create(self, serializer):
        try:
            # Generate reference number
            reference_number = self.generate_reference_number()
            while Claim.objects.filter(reference_number=reference_number).exists():
                reference_number = self.generate_reference_number()

            # Save the claim with reference number
            claim = serializer.save(user=self.request.user, reference_number=reference_number)
            
            try:
                ml_prediction = self.process_ml_prediction(claim)
                return claim
            except Exception as e:
                # Log error but don't fail the claim submission
                logger.error(f"Error processing ML prediction: {str(e)}")
                claim.status = 'PENDING'
                claim.save()
                return claim

        except Exception as e:
            raise serializers.ValidationError({
                'error': f'Failed to create claim: {str(e)}'
            })
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent claims with optional limit."""
        limit = request.query_params.get('limit', 5)
        try:
            limit = int(limit)
        except ValueError:
            limit = 5
        
        # Get filtered queryset based on user role
        queryset = self.get_queryset().order_by('-created_at')[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get claim statistics."""
        # Get filtered queryset based on user role
        queryset = self.get_queryset()
        
        # Get statistics
        total_claims = queryset.count()
        pending_claims = queryset.filter(status='PENDING').count()
        completed_claims = queryset.filter(status='COMPLETED').count()
        approved_claims = queryset.filter(status='APPROVED').count()
        rejected_claims = queryset.filter(status='REJECTED').count()
        
        # Calculate average settlement amount for completed claims
        completed_with_prediction = queryset.filter(
            status='COMPLETED', 
            ml_prediction__isnull=False
        )
        
        avg_settlement = 0
        if completed_with_prediction.exists():
            settlement_sum = sum(claim.ml_prediction.settlement_amount for claim in completed_with_prediction)
            avg_settlement = settlement_sum / completed_with_prediction.count()
        
        return Response({
            'total_claims': total_claims,
            'pending_claims': pending_claims,
            'completed_claims': completed_claims,
            'approved_claims': approved_claims,
            'rejected_claims': rejected_claims,
            'average_settlement_amount': avg_settlement
        })