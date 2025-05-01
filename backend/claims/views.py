from rest_framework import viewsets, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Sum, Avg, Q
from django.shortcuts import get_object_or_404
import logging
import time
import traceback

from .models import Claim, MLPrediction
from .serializers import ClaimSerializer, ClaimDashboardSerializer, MLPredictionSerializer
from account.permissions import IsAdminUser, IsFinanceUser
from ml_interface.models import MLModel
from ml_interface.ml_processor import MLProcessor

logger = logging.getLogger('django')

class ClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_admin:
            return Claim.objects.all()
        return Claim.objects.filter(user=self.request.user)

    def generate_reference_number(self):
        """Generate a unique reference number for the claim"""
        import uuid
        return f'CLM-{uuid.uuid4().hex[:8].upper()}'

    def prepare_ml_input(self, input_data):
        """Prepare claim data for ML prediction by aligning with training data format"""
        logger.info("Starting to prepare claim data for ML input")
        logger.debug(f"Raw input data: {input_data}")
        
        processed_data = {}
        
        # Map boolean fields to 1/0
        bool_fields = [
            'Whiplash', 'Minor_Psychological_Injury', 'PoliceReportFiled',
            'WitnessPresent', 'Exceptional_Circumstances'
        ]
        for field in bool_fields:
            value = input_data.get(field.lower(), False)
            processed_data[field] = 1 if str(value).lower() in ['true', 'yes', '1'] else 0
            logger.debug(f"Processed boolean field {field}: {processed_data[field]}")

        # Map numeric fields
        numeric_fields = [
            'SpecialHealthExpenses', 'SpecialMedications', 'SpecialRehabilitation',
            'SpecialTherapy', 'SpecialEarningsLoss', 'SpecialUsageLoss',
            'SpecialAssetDamage', 'SpecialLoanerVehicle', 'SpecialTripCosts',
            'SpecialJourneyExpenses', 'SpecialFixes', 'SpecialReduction',
            'SpecialOverage', 'GeneralRest', 'GeneralFixed', 'GeneralUplift',
            'DriverAge', 'NumberOfPassengers', 'VehicleAge'
        ]
        for field in numeric_fields:
            value = input_data.get(field.lower(), 0)
            processed_data[field] = float(value) if value else 0.0
            logger.debug(f"Processed numeric field {field}: {processed_data[field]}")

        # Define all possible values for categorical fields
        categorical_mappings = {
            'Gender': ['Male', 'Female', 'Other'],
            'AccidentType': [
                'Rear end', 'Other side pulled out of side road', 'Other',
                'Rear end - 3 car - Clt at front', 'Other side changed lanes and collided with clt\'s vehicle',
                'Other side reversed into Clt\'s vehicle', 'Other side turned across Clt\'s path',
                'Rear end - Clt pushed into next vehicle', 'Other side pulled on to roundabout',
                'Other side drove on wrong side of the road',
                'Other side changed lanes on a roundabout colliding with clt\'s vehicle',
                'Other side reversed into clt\'s stationary vehicle',
                'Other side collided with Clt\'s parked vehicle'
            ],
            'Injury_Prognosis': [
                'A. 1 month', 'B. 2 months', 'C. 3 months', 'D. 4 months', 'E. 5 months',
                'F. 6 months', 'G. 7 months', 'H. 8 months', 'I. 9 months', 'J. 10 months',
                'K. 11 months', 'L. 12 months', 'M. 13 months', 'N. 14 months', 'O. 15 months',
                'P. 16 months', 'Q. 17 months', 'R. 18 months'
            ],
            'DominantInjury': ['Arms', 'Legs', 'Hips', 'Multiple'],
            'VehicleType': ['Car', 'Truck', 'Motorcycle'],
            'WeatherConditions': ['Sunny', 'Rainy', 'Snowy']
        }

        # One-hot encode categorical fields and ensure ALL possible values are represented
        for field, possible_values in categorical_mappings.items():
            value = input_data.get(field.lower(), '')
            value = value.strip() if isinstance(value, str) else str(value)
            
            # For each possible value, create a binary column
            for possible_value in possible_values:
                column_name = f"{field}_{possible_value.replace(' ', '_').replace('-', '_').replace('.', '')}"
                # Check for exact match or similar value based on business rules
                is_match = value.lower() == possible_value.lower()
                processed_data[column_name] = 1 if is_match else 0
                logger.debug(f"Processed categorical field {column_name}: {processed_data[column_name]}")

        # Add extra features
        processed_data['injury_severity_score'] = 1
        processed_data['vehicle_damage_multiplier'] = 1.0
        processed_data['weather_risk_factor'] = 1.0

        logger.info("Claim data preparation completed")
        logger.debug(f"Final processed data: {processed_data}")
        return {'claim_data': processed_data}

    def process_ml_prediction(self, claim):
        try:
            logger.info(f"Starting ML prediction for claim {claim.reference_number}")
            
            # Get the active ML model from the database
            active_model = MLModel.objects.filter(is_active=True).first()
            if not active_model:
                logger.error("No active ML model found")
                raise serializers.ValidationError("No active ML model found")

            logger.info(f"Using active model: {active_model.name} (version: {active_model.version})")

            # Format claim data
            claim_data = claim.claim_data
            logger.debug(f"Original claim data: {claim_data}")
            
            formatted_data = self.prepare_ml_input(claim_data)
            logger.debug(f"Formatted data for prediction: {formatted_data}")

            # Initialize ML processor and load model
            start_time = time.time()
            processor = MLProcessor()
            logger.info("Loading ML model...")
            processor.load_model(active_model.model_file.path)

            # Make prediction
            logger.info("Making prediction with formatted data")
            result = processor.predict(formatted_data)
            
            processing_time = time.time() - start_time
            logger.info(f"Total prediction process time: {processing_time:.2f} seconds")
            logger.debug(f"Prediction result: {result}")
            
            # Create ML prediction record
            try:
                prediction = MLPrediction.objects.create(
                    model=active_model,
                    input_data=formatted_data,
                    output_data=result,
                    settlement_amount=result['prediction'],
                    confidence_score=result['confidence'],
                    processing_time=result['processing_time']
                )
                logger.info(f"Created prediction record with ID: {prediction.id}")
            except Exception as e:
                logger.error(f"Error creating prediction record: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise
            
            # Update claim with prediction
            try:
                claim.ml_prediction = prediction
                claim.save()
                logger.info(f"Updated claim {claim.reference_number} with new prediction")
            except Exception as e:
                logger.error(f"Error updating claim with prediction: {str(e)}")
                logger.debug(f"Stack trace: {traceback.format_exc()}")
                raise

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

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Returns aggregated statistics for the current user's claims.
        """
        # For finance users, show stats for all claims
        if request.user.is_finance or request.user.is_admin or request.user.is_superuser:
            queryset = Claim.objects.all()
        else:
            # For regular users, filter by their own claims
            queryset = Claim.objects.filter(user=request.user)
        
        total_claims = queryset.count()
        approved_claims = queryset.filter(status='APPROVED').count()
        rejected_claims = queryset.filter(status='REJECTED').count()
        pending_claims = queryset.filter(Q(status='PENDING') | Q(status='PROCESSING')).count()
        
        total_claimed = queryset.aggregate(sum=Sum('amount'))['sum'] or 0
        
        approved_settlements = queryset.filter(
            ml_prediction__isnull=False,
            status='APPROVED'
        ).aggregate(
            sum=Sum('ml_prediction__settlement_amount')
        )['sum'] or 0
        
        recent_claims = queryset.order_by('-created_at')[:5]
        recent_serializer = ClaimSerializer(recent_claims, many=True)
        
        return Response({
            'total_claims': total_claims,
            'approved_claims': approved_claims,
            'rejected_claims': rejected_claims,
            'pending_claims': pending_claims,
            'total_claimed': total_claimed,
            'approved_settlements': approved_settlements,
            'recent_claims': recent_serializer.data
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
                    settlement_amount=result['prediction'],
                    confidence_score=result['confidence'],
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
            
            # Update claim with new prediction
            try:
                claim.ml_prediction = prediction
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