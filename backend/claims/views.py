from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Sum, Avg, Q
from .models import Claim
from .serializers import ClaimSerializer, ClaimDashboardSerializer
from account.permissions import IsAdminUser, IsFinanceUser

class ClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Claim.objects.all()
        
        # If a user filter is specified, apply it regardless of current user's role
        user_id = self.request.query_params.get('user', None)
        if user_id is not None:
            queryset = queryset.filter(user_id=user_id)
        else:
            # If no specific user filter, apply regular permission logic
            # Finance users and admins should see all claims
            if self.request.user.is_finance or self.request.user.is_admin or self.request.user.is_superuser:
                pass  # queryset is already all claims
            else:
                # Regular users should only see their own claims
                queryset = queryset.filter(user=self.request.user)
                
        return queryset

    def perform_create(self, serializer):
        print("Creating new claim for user:", self.request.user.email)
        print("Data:", serializer.validated_data)
        serializer.save(user=self.request.user)
        print("Claim created successfully")

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