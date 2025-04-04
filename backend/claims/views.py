from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Avg, Count

from .models import Claim, ClaimDocument, ClaimHistory
from .serializers import (
    ClaimSerializer, 
    ClaimDetailSerializer, 
    ClaimReviewSerializer,
    ClaimDocumentSerializer,
    ClaimDocumentUploadSerializer
)
from account.permissions import IsAdminUser, IsFinanceUser


class ClaimViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing insurance claims
    """
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter claims based on user role"""
        user = self.request.user
        
        # Admin and finance users can see all claims
        if user.is_admin or user.is_finance:
            return Claim.objects.all()
        
        # Regular users can only see their own claims
        return Claim.objects.filter(user=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return ClaimDetailSerializer
        elif self.action == 'review_claim':
            return ClaimReviewSerializer
        return ClaimSerializer
    
    def perform_create(self, serializer):
        """Save the claim with the current user"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def user_claims(self, request):
        """Get all claims for the current user"""
        claims = Claim.objects.filter(user=request.user)
        page = self.paginate_queryset(claims)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(claims, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, (IsAdminUser | IsFinanceUser)])
    def review_claim(self, request, pk=None):
        """Action for admin/finance users to review claims"""
        claim = self.get_object()
        serializer = ClaimReviewSerializer(claim, data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, (IsAdminUser | IsFinanceUser)])
    def statistics(self, request):
        """Get statistics about claims for admin dashboard"""
        total_claims = Claim.objects.count()
        pending_claims = Claim.objects.filter(status='PENDING').count()
        approved_claims = Claim.objects.filter(status='APPROVED').count()
        rejected_claims = Claim.objects.filter(status='REJECTED').count()
        
        # Calculate averages
        avg_settlement = Claim.objects.filter(status='APPROVED').aggregate(Avg('settlementValue'))
        avg_claim_amount = Claim.objects.aggregate(
            avg_amount=Avg(Sum('travelCosts', 'lossOfEarnings', 'additionalExpenses'))
        )
        
        # Get recent claims
        recent_claims = Claim.objects.order_by('-submittedAt')[:5]
        recent_claims_serializer = self.get_serializer(recent_claims, many=True)
        
        # Get claims by injury type
        claims_by_injury = Claim.objects.values('injuryType').annotate(count=Count('id'))
        
        return Response({
            'total_claims': total_claims,
            'pending_claims': pending_claims,
            'approved_claims': approved_claims,
            'rejected_claims': rejected_claims,
            'approval_rate': approved_claims / total_claims if total_claims > 0 else 0,
            'avg_settlement': avg_settlement['settlementValue__avg'] if avg_settlement['settlementValue__avg'] else 0,
            'avg_claim_amount': avg_claim_amount['avg_amount'] if avg_claim_amount['avg_amount'] else 0,
            'recent_claims': recent_claims_serializer.data,
            'claims_by_injury': claims_by_injury,
        })


class ClaimDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing claim documents
    """
    queryset = ClaimDocument.objects.all()
    serializer_class = ClaimDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter documents based on user role"""
        user = self.request.user
        
        # Admin and finance users can see all documents
        if user.is_admin or user.is_finance:
            return ClaimDocument.objects.all()
        
        # Regular users can only see documents from their own claims
        return ClaimDocument.objects.filter(claim__user=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'upload_document':
            return ClaimDocumentUploadSerializer
        return ClaimDocumentSerializer
    
    @action(detail=False, methods=['post'], url_path='upload/(?P<claim_id>[^/.]+)')
    def upload_document(self, request, claim_id=None):
        """Upload a document for a specific claim"""
        try:
            # Check if claim exists and belongs to the user
            claim = Claim.objects.get(pk=claim_id)
            
            if request.user != claim.user and not (request.user.is_admin or request.user.is_finance):
                return Response(
                    {"detail": "You don't have permission to upload documents to this claim."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = ClaimDocumentUploadSerializer(
                data=request.data,
                context={'request': request, 'view': self}
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Claim.DoesNotExist:
            return Response(
                {"detail": "Claim not found."},
                status=status.HTTP_404_NOT_FOUND
            )