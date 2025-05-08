"""
Consolidated views for the claims app.
This combines the functionality from both views.py and views_modified.py
into a single clean implementation.
"""
import os
import re
import logging
import uuid
import json
import traceback
from datetime import datetime

from django.shortcuts import get_object_or_404
from django.db.models import Count, Sum, Avg, Q
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Claim, MLPrediction
from .serializers import ClaimSerializer, ClaimDashboardSerializer, MLPredictionSerializer
from ml_interface.models import MLModel
from ml_interface.ml_client import ml_client  # Import the ML service client
from account.permissions import IsAdminUser, IsMLEngineer, IsFinanceUser
from account.models import User  # Import the User model to access insurance_company

logger = logging.getLogger(__name__)

class ClaimViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing claims.
    """
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return the appropriate serializer class based on the action."""
        if self.action == 'recent' or self.action == 'dashboard':
            return ClaimDashboardSerializer
        return ClaimSerializer
    
    def get_queryset(self):
        """Filter claims based on user role."""
        user = self.request.user
        
        # Admin, Finance, and ML Engineer users can see all claims
        if user.is_admin or user.is_finance or user.is_ml_engineer:
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
        logger.info("Starting to prepare claim data for ML input")
        logger.debug(f"Raw input data: {claim_data}")
        
        # Extract claim data from nested structure if necessary
        claim_data = claim_data.get('claim_data', claim_data)
        
        # Format data as expected by ML service
        formatted_data = {
            # Categorical fields
            'AccidentType': str(claim_data.get('AccidentType', '')),
            'Vehicle Type': str(claim_data.get('Vehicle Type', '')),
            'Weather Conditions': str(claim_data.get('Weather Conditions', '')),
            'Injury_Prognosis': str(claim_data.get('Injury_Prognosis', '')),
            'Dominant injury': str(claim_data.get('Dominant injury', '')),
            'Gender': str(claim_data.get('Gender', '')),
            'Exceptional_Circumstances': str(claim_data.get('Exceptional_Circumstances', '')),
            'Minor_Psychological_Injury': str(claim_data.get('Minor_Psychological_Injury', '')),
            
            # Boolean fields
            'Whiplash': str(claim_data.get('Whiplash', False)),
            'Police_Report_Filed': str(claim_data.get('Police Report Filed', False)),
            'Witness_Present': str(claim_data.get('Witness Present', False)),
            
            # Numeric fields - default to 0 if missing
            'SpecialHealthExpenses': float(claim_data.get('SpecialHealthExpenses', 0)),
            'SpecialReduction': float(claim_data.get('SpecialReduction', 0)),
            'SpecialOverage': float(claim_data.get('SpecialOverage', 0)),
            'GeneralRest': float(claim_data.get('GeneralRest', 0)),
            'SpecialEarningsLoss': float(claim_data.get('SpecialEarningsLoss', 0)),
            'SpecialUsageLoss': float(claim_data.get('SpecialUsageLoss', 0)),
            'SpecialMedications': float(claim_data.get('SpecialMedications', 0)),
            'SpecialAssetDamage': float(claim_data.get('SpecialAssetDamage', 0)),
            'SpecialRehabilitation': float(claim_data.get('SpecialRehabilitation', 0)),
            'SpecialFixes': float(claim_data.get('SpecialFixes', 0)),
            'GeneralFixed': float(claim_data.get('GeneralFixed', 0)),
            'GeneralUplift': float(claim_data.get('GeneralUplift', 0)),
            'SpecialLoanerVehicle': float(claim_data.get('SpecialLoanerVehicle', 0)),
            'SpecialTripCosts': float(claim_data.get('SpecialTripCosts', 0)),
            'SpecialJourneyExpenses': float(claim_data.get('SpecialJourneyExpenses', 0)),
            'SpecialTherapy': float(claim_data.get('SpecialTherapy', 0)),
            'Vehicle_Age': float(claim_data.get('Vehicle Age', 0)),
            'Driver_Age': float(claim_data.get('Driver Age', 0)),
            'Number_of_Passengers': float(claim_data.get('Number of Passengers', 0)),
            
            # Date fields
            'Accident_Date': claim_data.get('Accident Date', datetime.now().isoformat()),
            'Claim_Date': claim_data.get('Claim Date', datetime.now().isoformat())
        }
        
        logger.info("Claim data preparation completed")
        logger.debug(f"Formatted claim data: {formatted_data}")
        
        return formatted_data
    
    def process_ml_prediction(self, claim, active_model=None):
        """Process the claim with ML model and update with prediction."""
        try:
            logger.info(f"Starting ML prediction for claim {claim.reference_number}")
            
            # Get active ML model if not provided
            if not active_model:
                active_model = MLModel.objects.filter(is_active=True).first()
                if not active_model:
                    logger.error("No active ML model found")
                    raise serializers.ValidationError("No active ML model available")

            logger.info(f"Using active model: {active_model.name} v{active_model.version}")

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
            
            # Send to ML service for prediction using the client
            try:
                logger.info("Sending prediction request to ML service")
                model_name = active_model.name  # Use the model name from the database
                result = ml_client.predict(formatted_data, model_name)
                
                # Extract prediction result
                if isinstance(result, dict) and 'prediction' in result:
                    prediction_data = result["prediction"]
                else:
                    prediction_data = result
                    
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
                
                # Update claim with new prediction and change status to COMPLETED
                claim.ml_prediction = prediction
                # Update status from PENDING to COMPLETED once prediction is available
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
        """Create a new claim and process ML prediction."""
        try:
            # Generate reference number
            reference_number = self.generate_reference_number()
            while Claim.objects.filter(reference_number=reference_number).exists():
                reference_number = self.generate_reference_number()

            # Save the claim with reference number
            claim = serializer.save(user=self.request.user, reference_number=reference_number)
            
            try:
                # Process ML prediction
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
    
    def perform_update(self, serializer):
        """Update the claim."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Returns aggregated statistics for the current user's claims.
        """
        # Get filtered queryset based on user role
        queryset = self.get_queryset()
        
        total_claims = queryset.count()
        approved_claims = queryset.filter(status='APPROVED').count()
        rejected_claims = queryset.filter(status='REJECTED').count()
        pending_claims = queryset.filter(Q(status='PENDING') | Q(status='PROCESSING')).count()
        completed_claims = queryset.filter(status='COMPLETED').count()
        
        total_claimed = queryset.aggregate(sum=Sum('amount'))['sum'] or 0
        
        # Calculate total settlements including both decided amounts and ML predictions
        # First, get claims with decided settlement amounts
        decided_settlements = queryset.filter(
            decided_settlement_amount__isnull=False
        ).aggregate(
            sum=Sum('decided_settlement_amount')
        )['sum'] or 0
        
        # Then get claims with ML predictions but no decided amount
        ml_settlements = queryset.filter(
            decided_settlement_amount__isnull=True,
            ml_prediction__isnull=False
        ).aggregate(
            sum=Sum('ml_prediction__settlement_amount')
        )['sum'] or 0
        
        # Total settlements is the sum of both
        total_settlements = decided_settlements + ml_settlements
        
        # Calculate the total ML service cost based on number of predictions and company rate
        total_billing_cost = 0
        rate_per_claim = 0
        predictions_count = 0
        try:
            # Get the company's rate per prediction
            from finance.models import BillingRate
            user_company = request.user.insurance_company
            
            # Count number of predictions for this user
            predictions_count = queryset.filter(ml_prediction__isnull=False).count()
            
            if user_company:
                # Get active billing rate for the user's company
                billing_rate = BillingRate.objects.filter(
                    insurance_company=user_company,
                    is_active=True
                ).first()
                
                if billing_rate:
                    # Get rate per claim
                    rate_per_claim = float(billing_rate.rate_per_claim)
                    
                    # Calculate total cost: rate per claim * number of predictions
                    total_billing_cost = rate_per_claim * predictions_count
                else:
                    logger.warning(f"No active billing rate found for company {user_company.name}")
            else:
                logger.info("User does not belong to any insurance company")
        except Exception as e:
            logger.error(f"Error calculating ML service cost: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
        
        recent_claims = queryset.order_by('-created_at')[:5]
        recent_serializer = ClaimSerializer(recent_claims, many=True)
        
        return Response({
            'total_claims': total_claims,
            'approved_claims': approved_claims,
            'rejected_claims': rejected_claims,
            'pending_claims': pending_claims,
            'completed_claims': completed_claims,
            'total_claimed': total_claimed,
            'total_settlements': total_settlements,
            'total_billing_cost': float(total_billing_cost),
            'predictions_count': predictions_count,
            'rate_per_claim': rate_per_claim,
            'recent_claims': recent_serializer.data
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Returns detailed statistics about claims.
        For finance users and admins: returns stats for all claims
        For regular users: returns stats only for their own claims
        """
        # Get filtered queryset based on user role
        queryset = self.get_queryset()
        
        monthly_claims = queryset.extra(
            select={'month': "DATE_FORMAT(created_at, '%%Y-%%m')"}
        ).values('month').annotate(count=Count('id')).order_by('month')
        
        status_distribution = queryset.values('status').annotate(count=Count('id'))
        
        processing_time_data = []
        for claim in queryset.filter(status__in=['APPROVED', 'REJECTED']):
            if claim.updated_at and claim.created_at:
                days = (claim.updated_at - claim.created_at).days
                processing_time_data.append(days)
        
        avg_processing_time = sum(processing_time_data) / len(processing_time_data) if processing_time_data else 0
        
        # Calculate average settlement amount for completed claims
        completed_with_prediction = queryset.filter(
            status='COMPLETED', 
            ml_prediction__isnull=False
        )
        
        avg_settlement = 0
        if completed_with_prediction.exists():
            settlement_sum = sum(claim.ml_prediction.settlement_amount for claim in completed_with_prediction)
            avg_settlement = settlement_sum / completed_with_prediction.count()
        
        # Add user distribution data for finance/admin users
        response_data = {
            'monthly_claims': list(monthly_claims),
            'status_distribution': list(status_distribution),
            'avg_processing_time': avg_processing_time,
            'average_settlement_amount': avg_settlement
        }
        
        # Add user-specific statistics for finance/admin users
        if request.user.is_finance or request.user.is_admin or request.user.is_superuser:
            user_claim_counts = queryset.values('user__email').annotate(
                count=Count('id'),
                total_amount=Sum('amount')
            ).order_by('-count')
            
            response_data['user_distribution'] = list(user_claim_counts)
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'])
    def my_claims(self, request):
        """
        Returns only the current user's claims.
        """
        queryset = Claim.objects.filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Returns recent claims - useful for dashboards
        """
        # Get limit parameter from request or default to 5
        limit = request.query_params.get('limit', 5)
        try:
            limit = int(limit)
        except ValueError:
            limit = 5
        
        # Use the existing get_queryset method which already handles permissions
        queryset = self.get_queryset().order_by('-created_at')[:limit]
        
        # Use the appropriate serializer
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rerun_prediction(self, request, pk=None):
        """Re-run ML prediction for a claim"""
        try:
            claim = self.get_object()
            logger.info(f"Starting prediction rerun for claim {claim.reference_number}")
            
            # Simply call our process_ml_prediction method
            prediction = self.process_ml_prediction(claim)
            
            # Return prediction results
            serializer = MLPredictionSerializer(prediction)
            logger.info("Successfully completed prediction rerun")
            return Response({'prediction': serializer.data})
            
        except Exception as e:
            logger.error(f"Unexpected error in rerun_prediction: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            return Response(
                {'error': f"Failed to re-run prediction: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['put'])
    def settlement(self, request, pk=None):
        """Update the decided settlement amount for a claim"""
        try:
            claim = self.get_object()
            
            # Validate the settlement amount
            settlement_amount = request.data.get('settlement_amount')
            if settlement_amount is None:
                return Response(
                    {'error': 'Settlement amount is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # Convert to decimal and validate
                settlement_amount = float(settlement_amount)
                if settlement_amount < 0:
                    return Response(
                        {'error': 'Settlement amount must be a positive number'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'Settlement amount must be a valid number'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the decided settlement amount
            claim.decided_settlement_amount = settlement_amount
            claim.save()
            
            # Return the updated claim
            serializer = self.get_serializer(claim)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating settlement amount: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            return Response(
                {'error': f"Failed to update settlement amount: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
            
    @action(detail=False, methods=['post'], permission_classes=[])
    def predict(self, request):
        """Get a prediction without saving a claim"""
        try:
            # Get input data
            input_data = request.data.get('input_data')
            if not input_data:
                return Response(
                    {'error': 'Input data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get active ML model
            active_model = MLModel.objects.filter(is_active=True).first()
            if not active_model:
                logger.error("No active ML model found")
                return Response(
                    {'error': 'No active ML model available'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            # Try to use ML client directly for prediction
            try:
                result = ml_client.predict(input_data, active_model.name)
                logger.info(f"ML prediction result: {result}")
                
                return Response({
                    'settlement_amount': result.get('settlement_amount', 0),
                    'confidence_score': result.get('confidence_score', 0.85),
                    'model': active_model.name
                })
            except Exception as e:
                logger.error(f"ML prediction error: {str(e)}")
                return Response(
                    {'error': f'ML prediction failed: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except Exception as e:
            logger.error(f"Error in predict: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )