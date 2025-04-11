from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, Sum, Avg, Q
from .models import Claim
from .serializers import ClaimSerializer, ClaimDashboardSerializer

class ClaimViewSet(viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Claim.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Returns aggregated statistics for the current user's claims.
        """
        user = request.user
        queryset = Claim.objects.filter(user=user)
        
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
        Returns detailed statistics about the user's claims.
        """
        user = request.user
        queryset = Claim.objects.filter(user=user)
        
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
        
        return Response({
            'monthly_claims': list(monthly_claims),
            'status_distribution': list(status_distribution),
            'avg_processing_time': avg_processing_time,
        })