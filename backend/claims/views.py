from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Sum, Avg, Q
from django.shortcuts import get_object_or_404
import logging
import time
import traceback
from datetime import datetime
from django.utils import timezone

from .models import Claim, MLPrediction
from .serializers import ClaimSerializer, ClaimDashboardSerializer, MLPredictionSerializer
from account.permissions import IsAdminUser, IsFinanceUser, AllowAutoApproval
from ml_interface.models import MLModel
from ml_interface.ml_processor import MLProcessor

logger = logging.getLogger('django')

class ClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    # Use AllowAutoApproval to ensure any authenticated user can submit claims
    permission_classes = [permissions.IsAuthenticated, AllowAutoApproval]
    
    def get_permissions(self):
        """
        Override to set specific permissions for different actions.
        - All authenticated users can create and view their own claims
        - Only finance/admin users can see all claims
        """
        # These endpoints still restricted to finance/admin users
        if self.action in ['statistics', 'export_claims', 'finance_dashboard']:
            self.permission_classes = [permissions.IsAuthenticated, IsFinanceUser | IsAdminUser]
        return super().get_permissions()

    def get_queryset(self):
        # Get the base queryset based on user permissions
        if self.request.user.is_admin or self.request.user.is_finance:
            queryset = Claim.objects.all()
        else:
            queryset = Claim.objects.filter(user=self.request.user)
        
        # Apply status filtering if status parameter is provided
        status_param = self.request.query_params.get('status')
        if status_param:
            # Handle special case for status parameter
            if status_param.upper() == 'PENDING':
                # Include both PENDING and COMPLETED claims for 'pending' filter
                queryset = queryset.filter(status__in=['PENDING', 'COMPLETED'])
            else:
                # For other statuses, filter exact match
                queryset = queryset.filter(status=status_param.upper())
                
            # Log the filtering for debugging
            logger.info(f"Filtered claims by status: {status_param.upper()}, count: {queryset.count()}")
        
        return queryset

    def generate_reference_number(self):
        """Generate a unique reference number for the claim"""
        import uuid
        return f'CLM-{uuid.uuid4().hex[:8].upper()}'

    def prepare_ml_input(self, input_data):
        """Prepare claim data for ML prediction by aligning with training data format"""
        logger.info("Starting to prepare claim data for ML input")
        logger.debug(f"Raw input data: {input_data}")
        
        # Extract claim data from nested structure if necessary
        claim_data = input_data.get('claim_data', input_data)
        
        # Format data as expected by MLProcessor
        formatted_data = {
            # Categorical fields from original data
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
            
            # Date fields - use current date if missing
            'Accident_Date': claim_data.get('Accident Date', datetime.now().isoformat()),
            'Claim_Date': claim_data.get('Claim Date', datetime.now().isoformat())
        }
        
        logger.info("Claim data preparation completed")
        logger.debug(f"Formatted claim data: {formatted_data}")
        
        return formatted_data

    def process_ml_prediction(self, claim):
        try:
            logger.info(f"Starting ML prediction for claim {claim.reference_number}")
            
            # Get the active ML model from the database
            active_model = MLModel.objects.filter(is_active=True).first()
            if not active_model:
                logger.error("No active ML model found")
                # Create a default model entry if none exists
                try:
                    logger.info("Creating a default model entry since none exists")
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    admin_user = User.objects.filter(is_admin=True).first() or User.objects.first()
                    
                    if admin_user:
                        active_model = MLModel.objects.create(
                            name="Default Model",
                            version="1.0",
                            description="Automatically created default model",
                            model_type="RandomForest",
                            is_active=True,
                            created_by=admin_user,
                            input_format={"format": "json"},
                            output_format={"format": "json"}
                        )
                        logger.info(f"Created default model with ID: {active_model.id}")
                    else:
                        logger.error("No admin user found to create default model")
                        raise serializers.ValidationError("No active ML model found and couldn't create a default one")
                except Exception as model_err:
                    logger.error(f"Failed to create default model: {str(model_err)}")
                    logger.debug(f"Stack trace: {traceback.format_exc()}")
                    raise serializers.ValidationError("No active ML model found and couldn't create a default one")

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
            
            # Try using ML service via client first
            try:
                from ml_interface.ml_client import ml_client
                logger.info("Attempting to use ML service via client")
                
                # Call the external ML service
                ml_result = ml_client.predict(formatted_data)
                
                if ml_result and 'settlement_amount' in ml_result:
                    logger.info(f"ML service prediction successful: {ml_result}")
                    result = ml_result
                else:
                    logger.warning(f"ML service returned invalid result, falling back to local processor: {ml_result}")
                    raise Exception("Invalid ML service result structure")
                    
            except Exception as ml_service_err:
                logger.warning(f"ML service prediction failed, falling back to local processor: {str(ml_service_err)}")
                logger.debug(f"ML service error stack trace: {traceback.format_exc()}")
                
                # Initialize ML processor and load model as fallback
                processor = MLProcessor()
                try:
                    model_path = active_model.get_model_path()
                    logger.info(f"Loading model from path: {model_path}")
                    processor.load_model(model_path)
                    
                    # Make prediction with local processor
                    logger.info("Making prediction with local processor")
                    result = processor.predict(formatted_data)
                    logger.info(f"Local prediction result: {result}")
                    
                except Exception as e:
                    logger.error(f"Failed to load model or make local prediction: {str(e)}")
                    logger.debug(f"Stack trace: {traceback.format_exc()}")
                    
                    # Last resort: Create a synthetic prediction based on claim data
                    logger.warning("Generating synthetic prediction as last resort")
                    
                    # Extract known values from claim data for calculation
                    special_damages = 0
                    general_damages = 0
                    
                    # Calculate special damages from claim data
                    for key, value in formatted_data.items():
                        if key.startswith('Special') and key != 'SpecialReduction':
                            try:
                                special_damages += float(value)
                            except (ValueError, TypeError):
                                pass
                    
                    # Calculate general damages from claim data
                    for key, value in formatted_data.items():
                        if key.startswith('General'):
                            try:
                                general_damages += float(value)
                            except (ValueError, TypeError):
                                pass
                    
                    # Apply a basic multiplicative model as fallback
                    base_amount = special_damages + general_damages
                    if base_amount <= 0:
                        base_amount = 1000  # Default minimum
                    
                    # Create synthetic prediction result
                    result = {
                        'settlement_amount': float(base_amount),
                        'confidence_score': 0.7,  # Lower confidence for synthetic result
                        'processing_time': 0.1,
                        'synthetic': True,  # Mark as synthetic
                        'input_data': formatted_data
                    }
                    logger.info(f"Generated synthetic prediction: {result}")
            
            # Ensure result has required fields
            if 'settlement_amount' not in result:
                result['settlement_amount'] = 1000.0
                logger.warning(f"Settlement amount missing in result, using default: {result['settlement_amount']}")
                
            if 'confidence_score' not in result:
                result['confidence_score'] = 0.8
                logger.warning(f"Confidence score missing in result, using default: {result['confidence_score']}")
                
            if 'processing_time' not in result:
                result['processing_time'] = 0.5
                logger.warning(f"Processing time missing in result, using default: {result['processing_time']}")
            
            # Create new prediction record
            try:
                # Critical - ensure values are properly formatted
                settlement_amount = float(result['settlement_amount'])
                confidence_score = float(result.get('confidence_score', 0.8))
                processing_time = float(result.get('processing_time', 0.5))
                
                # Handle potential zero or negative settlement amounts
                if settlement_amount <= 0:
                    logger.warning(f"Invalid settlement amount: {settlement_amount}, setting to minimum value")
                    settlement_amount = 1000.0  # Minimum fallback value
                
                prediction = MLPrediction.objects.create(
                    model=active_model,
                    input_data=formatted_data,
                    output_data=result,
                    settlement_amount=settlement_amount,
                    confidence_score=confidence_score,
                    processing_time=processing_time
                )
                logger.info(f"Created prediction record with ID: {prediction.id}")
            except Exception as e:
                logger.error(f"Error creating prediction record: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise serializers.ValidationError(f"Error saving prediction: {str(e)}")
            
            # AUTO-APPROVAL CHANGE: Update claim with new prediction and AUTO-APPROVE instead of setting to PENDING
            try:
                # CRITICAL: This is where the prediction is attached to the claim
                # First detach any existing prediction to avoid conflicts
                if claim.ml_prediction_id is not None and claim.ml_prediction_id != prediction.id:
                    logger.info(f"Replacing existing prediction {claim.ml_prediction_id} with new prediction {prediction.id}")
                
                # Explicitly set the prediction
                claim.ml_prediction = prediction
                
                # AUTO-APPROVAL CHANGE: Set claim to APPROVED status automatically
                claim.status = 'APPROVED'
                # Set the decided settlement amount to the ML-predicted amount
                claim.decided_settlement_amount = settlement_amount
                
                # AUTO-APPROVAL CHANGE: Record review timestamp using current time
                claim.reviewed_at = timezone.now()
                
                # Save the claim with the attached prediction, status, and settlement amount
                claim.save(update_fields=['ml_prediction', 'status', 'decided_settlement_amount', 'reviewed_at'])
                
                # Verify the attachment worked
                claim.refresh_from_db()
                if claim.ml_prediction_id == prediction.id:
                    logger.info(f"Successfully attached ML prediction {prediction.id} to claim {claim.reference_number}")
                    
                    # AUTO-APPROVAL CHANGE: Create a billing record for the automatically approved claim
                    try:
                        from finance.api_utils import ensure_billing_record_for_approved_claim
                        billing_result = ensure_billing_record_for_approved_claim(claim)
                        logger.info(f"Auto-approval billing record creation result: {billing_result['message']}")
                    except Exception as billing_error:
                        logger.error(f"Error creating billing record for auto-approved claim {claim.reference_number}: {str(billing_error)}")
                        logger.debug(f"Billing error stack trace: {traceback.format_exc()}")
                        # Continue processing even if billing record creation fails
                else:
                    logger.error(f"Failed to attach prediction {prediction.id} to claim {claim.reference_number}. Current prediction ID: {claim.ml_prediction_id}")
                    raise serializers.ValidationError(f"Failed to attach prediction to claim")
            except Exception as e:
                logger.error(f"Error updating claim with prediction: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise serializers.ValidationError(f"Error updating claim: {str(e)}")

            return prediction

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

            # Check for ML prediction data in request
            ml_prediction_data = self.request.data.get('ml_prediction')
            logger.info(f"ML prediction data in request: {ml_prediction_data}")
            
            # Save the claim with reference number
            claim = serializer.save(user=self.request.user, reference_number=reference_number)
            logger.info(f"Claim created with ID: {claim.id} and reference: {reference_number}")
            
            # AUTO-APPROVAL CHANGE: Set initial status to APPROVED
            claim.status = 'APPROVED'
            claim.save(update_fields=['status'])
            
            # Try to use ML prediction from request first if it's complete
            if ml_prediction_data and isinstance(ml_prediction_data, dict):
                try:
                    # Check if ML prediction data has required fields
                    required_fields = ['settlement_amount', 'confidence_score', 'input_data', 'output_data']
                    if all(field in ml_prediction_data for field in required_fields):
                        logger.info(f"Using ML prediction from request for claim {claim.reference_number}")
                        
                        # Get the active ML model
                        active_model = MLModel.objects.filter(is_active=True).first()
                        if not active_model:
                            logger.warning("No active ML model found")
                            active_model = None
                            
                        # Create ML prediction record
                        prediction = MLPrediction.objects.create(
                            model=active_model,
                            input_data=ml_prediction_data.get('input_data', {}),
                            output_data=ml_prediction_data.get('output_data', {}),
                            settlement_amount=float(ml_prediction_data.get('settlement_amount', 0)),
                            confidence_score=float(ml_prediction_data.get('confidence_score', 0.85)),
                            processing_time=float(ml_prediction_data.get('processing_time', 0.5))
                        )
                        
                        # Set prediction and decided settlement amount on claim
                        claim.ml_prediction = prediction
                        claim.decided_settlement_amount = float(ml_prediction_data.get('settlement_amount', 0))
                        claim.reviewed_at = timezone.now()  # Record automatic review time
                        claim.save(update_fields=['ml_prediction', 'decided_settlement_amount', 'reviewed_at'])
                        
                        logger.info(f"Successfully attached ML prediction {prediction.id} to claim {claim.reference_number}")
                        
                        # AUTO-APPROVAL CHANGE: Create billing record
                        try:
                            from finance.api_utils import ensure_billing_record_for_approved_claim
                            billing_result = ensure_billing_record_for_approved_claim(claim)
                            logger.info(f"Auto-approval billing record creation result: {billing_result['message']}")
                        except Exception as billing_error:
                            logger.error(f"Error creating billing record for auto-approved claim {claim.reference_number}: {str(billing_error)}")
                            logger.debug(f"Billing error stack trace: {traceback.format_exc()}")
                            # Continue processing even if billing record creation fails
                        
                        return claim
                    else:
                        logger.warning(f"Incomplete ML prediction data in request: {ml_prediction_data}")
                except Exception as e:
                    logger.error(f"Error processing ML prediction from request: {str(e)}")
                    logger.debug(f"Stack trace: {traceback.format_exc()}")
            
            # If ML prediction from request failed or is not present, generate a new one
            try:
                logger.info(f"Generating new ML prediction for claim {claim.reference_number}")
                ml_prediction = self.process_ml_prediction(claim)
                return claim
            except Exception as e:
                # Log error but don't fail the claim submission
                logger.error(f"Error processing ML prediction: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                
                # Even if ML processing fails, keep the claim approved with the claimed amount
                if claim.status != 'APPROVED':
                    claim.status = 'APPROVED'
                if not claim.decided_settlement_amount and claim.amount:
                    claim.decided_settlement_amount = claim.amount
                claim.reviewed_at = timezone.now()
                claim.save(update_fields=['status', 'decided_settlement_amount', 'reviewed_at'])
                
                # Try to create a billing record even if ML processing failed
                try:
                    from finance.api_utils import ensure_billing_record_for_approved_claim
                    billing_result = ensure_billing_record_for_approved_claim(claim)
                    logger.info(f"Auto-approval billing record creation result (fallback): {billing_result['message']}")
                except Exception as billing_error:
                    logger.error(f"Error creating fallback billing record for claim {claim.reference_number}: {str(billing_error)}")
                
                return claim

        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            raise serializers.ValidationError({
                'error': f'Failed to create claim: {str(e)}'
            })

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Returns aggregated statistics for the current user's claims.
        Updated to reflect automatic approval workflow.
        """
        # For finance users, show stats for all claims
        if request.user.is_finance or request.user.is_admin or request.user.is_superuser:
            queryset = Claim.objects.all()
        else:
            # For regular users, filter by their own claims
            queryset = Claim.objects.filter(user=request.user)
        
        total_claims = queryset.count()
        # All claims are now approved by default
        approved_claims = queryset.filter(status='APPROVED').count()
        # These statuses are no longer used but kept for API compatibility
        rejected_claims = 0
        pending_claims = 0
        completed_claims = total_claims
        
        total_claimed = queryset.aggregate(sum=Sum('amount'))['sum'] or 0
        
        # Calculate total settlements - now all claims should have a decided_settlement_amount
        decided_settlements = queryset.filter(
            decided_settlement_amount__isnull=False
        ).aggregate(
            sum=Sum('decided_settlement_amount')
        )['sum'] or 0
        
        # This section is kept for backward compatibility but should be 0
        # since all claims now have a decided settlement amount
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
            'rejected_claims': rejected_claims,  # Always 0 with new auto-approval flow
            'pending_claims': pending_claims,    # Always 0 with new auto-approval flow
            'completed_claims': completed_claims,
            'total_claimed': total_claimed,
            'approved_settlements': total_settlements,
            'total_billing_cost': float(total_billing_cost),
            'predictions_count': predictions_count,
            'rate_per_claim': rate_per_claim,
            'auto_approval_active': True,  # New flag to indicate auto-approval is active
            'recent_claims': recent_serializer.data
        })
        
    @action(detail=False, methods=['get'])
    def pending_review(self, request):
        """
        This endpoint is now deprecated as claims are automatically approved.
        Returns an empty list with a message explaining the change.
        """
        if not (request.user.is_finance or request.user.is_admin):
            return Response(
                {'error': 'Only finance team members can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Return an empty list with a message about the auto-approval flow
        return Response({
            'message': 'All claims are now automatically approved upon submission. There are no claims pending review.',
            'claims': []
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Returns detailed statistics about claims.
        For finance users and admins: returns stats for all claims
        For regular users: returns stats only for their own claims
        """
        # For finance users, show stats for all claims
        if request.user.is_finance or request.user.is_admin or request.user.is_superuser:
            queryset = Claim.objects.all()
        else:
            # For regular users, filter by their own claims
            queryset = Claim.objects.filter(user=request.user)
        
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
        
        # Add user distribution data for finance users
        response_data = {
            'monthly_claims': list(monthly_claims),
            'status_distribution': list(status_distribution),
            'avg_processing_time': avg_processing_time,
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
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Returns recent claims - useful for the finance dashboard
        """
        # Get limit parameter from request or default to 5
        limit = int(request.query_params.get('limit', 5))
        
        # Use the existing get_queryset method which already handles permissions
        queryset = self.get_queryset().order_by('-created_at')[:limit]
        
        # Use dashboard serializer for more compact representation
        serializer = ClaimDashboardSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rerun_prediction(self, request, pk=None):
        """Re-run ML prediction for a claim"""
        try:
            claim = self.get_object()
            logger.info(f"Starting prediction rerun for claim {claim.reference_number}")
            
            # Get active model
            active_model = MLModel.objects.filter(is_active=True).first()
            if not active_model:
                logger.error("No active ML model available")
                return Response(
                    {'error': "No active ML model available"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Using active model: {active_model.name} v{active_model.version}")
            
            # Get or prepare input data
            input_data = claim.claim_data
            if not input_data:
                logger.error("No claim data available for prediction")
                return Response(
                    {'error': "No claim data available for prediction"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.debug(f"Original claim data: {input_data}")

            # Process the data to match training format
            try:
                formatted_data = self.prepare_ml_input(input_data)
                logger.debug(f"Formatted data for prediction: {formatted_data}")
            except Exception as e:
                logger.error(f"Error formatting input data: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                return Response(
                    {'error': f"Error formatting input data: {str(e)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize ML processor and load model
            processor = MLProcessor()
            try:
                model_path = active_model.get_model_path()
                logger.info(f"Loading model from path: {model_path}")
                processor.load_model(model_path)
            except Exception as e:
                logger.error(f"Failed to load model: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                return Response(
                    {'error': f"Failed to load ML model: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Make prediction
            try:
                logger.info("Making prediction")
                result = processor.predict(formatted_data)
                logger.info(f"Prediction result: {result}")
            except Exception as e:
                logger.error(f"Error processing ML prediction: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                return Response(
                    {'error': f"Failed to process prediction: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Create new prediction record
            try:
                prediction = MLPrediction.objects.create(
                    model=active_model,
                    input_data=formatted_data,
                    output_data=result,
                    settlement_amount=result['settlement_amount'],
                    confidence_score=result['confidence_score'],
                    processing_time=result['processing_time']
                )
                logger.info(f"Created prediction record with ID: {prediction.id}")
            except Exception as e:
                logger.error(f"Error creating prediction record: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                return Response(
                    {'error': f"Error saving prediction: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Update claim with new prediction but maintain PENDING status
            try:
                claim.ml_prediction = prediction
                # Set status to PENDING to ensure it appears in finance review queue
                if claim.status != 'PENDING':
                    claim.status = 'PENDING'
                    logger.info(f"Updated claim status to PENDING for finance review")
                claim.save()
                logger.info(f"Updated claim {claim.reference_number} with new prediction")
            except Exception as e:
                logger.error(f"Error updating claim with prediction: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                return Response(
                    {'error': f"Error updating claim: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
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
        """Update the decided settlement amount for a claim - restricted to finance/admin users only"""
        # Check if user has finance or admin permissions
        if not (request.user.is_finance or request.user.is_admin):
            return Response(
                {'error': 'Only finance team members can set settlement amounts'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
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
    def review(self, request, pk=None):
        """
        This endpoint is deprecated as claims are now automatically approved.
        Retained for API compatibility but returns a message indicating the change.
        """
        # Return a message explaining the new automated approval flow
        return Response(
            {
                'message': 'All claims are now automatically approved upon submission.',
                'status': 'auto_approved'
            },
            status=status.HTTP_200_OK
        )
        
    @action(detail=False, methods=['get'])
    def ml_usage_invoices(self, request):
        """
        Return all claims with ML model usage and their associated billing rates 
        for the current user. For displaying user's ML Usage Invoice history.
        """
        # Get claims for the current user that have ML predictions
        queryset = self.get_queryset().filter(
            ml_prediction__isnull=False
        ).order_by('-created_at')
        
        # Serialize the claims
        serializer = self.get_serializer(queryset, many=True)
        claims_data = serializer.data
        
        # For each claim, fetch the billing rate information
        try:
            from finance.models import BillingRate
            
            # Get user's insurance company
            user_company = request.user.insurance_company
            
            if user_company:
                # Get all billing rates for this company
                billing_rates = BillingRate.objects.filter(
                    insurance_company=user_company
                ).order_by('-effective_from')
                
                # Create a map of effective dates to rates
                rate_map = {}
                for rate in billing_rates:
                    effective_from = rate.effective_from
                    effective_to = rate.effective_to or timezone.now().date()
                    rate_map[(effective_from, effective_to)] = rate.rate_per_claim
                
                # Add billing rate information to each claim
                for claim in claims_data:
                    claim_date = datetime.fromisoformat(claim['created_at']).date()
                    rate_per_claim = 0
                    
                    # Find the applicable rate for the claim's date
                    for date_range, rate in rate_map.items():
                        if date_range[0] <= claim_date and claim_date <= date_range[1]:
                            rate_per_claim = float(rate)
                            break
                    
                    # Add billing information to claim data
                    claim['billing_rate'] = rate_per_claim
                    claim['company_name'] = user_company.name
            else:
                # User does not belong to an insurance company
                for claim in claims_data:
                    claim['billing_rate'] = 0
                    claim['company_name'] = 'Unknown'
                    
        except Exception as e:
            logger.error(f"Error fetching billing rates: {str(e)}")
            logger.debug(f"Stack trace: {traceback.format_exc()}")
            # Fallback - add zero rates if we can't fetch the real ones
            for claim in claims_data:
                claim['billing_rate'] = 0
                claim['company_name'] = 'Unknown'
        
        return Response(claims_data)