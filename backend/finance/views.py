# Implements API views to handle financial data requests and responses.

from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import BillingRecord, UsageStatistics
from .serializers import (
    BillingRecordSerializer, UsageStatisticsSerializer, UserBillingStatsSerializer
)
from account.permissions import IsAdminUser, IsFinanceUser
from account.models import User





class BillingRecordViewSet(viewsets.ModelViewSet):
    queryset = BillingRecord.objects.all()
    serializer_class = BillingRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'list']:
            self.permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):
        if self.request.user.is_admin or self.request.user.is_finance:
            return BillingRecord.objects.all()
        return BillingRecord.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_billing(self, request):
        queryset = BillingRecord.objects.filter(user=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        if not (request.user.is_admin or request.user.is_finance):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        record = self.get_object()
        record.payment_status = 'PAID'
        record.paid_at = timezone.now()
        record.save()
        
        return Response({"status": "marked as paid"})





class UsageStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UsageStatistics.objects.all()
    serializer_class = UsageStatisticsSerializer
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get_queryset(self):
        if self.request.user.is_admin or self.request.user.is_finance:
            return UsageStatistics.objects.all()
        return UsageStatistics.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_usage(self, request):
        queryset = UsageStatistics.objects.filter(user=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)





class BillingDashboardView(APIView):
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):

        total_billed = BillingRecord.objects.aggregate(Sum('amount'))['amount__sum'] or 0
        total_paid = BillingRecord.objects.filter(
            payment_status='PAID'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        total_pending = BillingRecord.objects.filter(
            payment_status='PENDING'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        

        active_users = User.objects.filter(is_active=True).count()
        users_with_billing = User.objects.filter(
            billing_records__isnull=False
        ).distinct().count()
        

        recent_invoices = BillingRecordSerializer(
            BillingRecord.objects.all().order_by('-created_at')[:5],
            many=True
        ).data
        

        this_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = BillingRecord.objects.filter(
            created_at__gte=this_month
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        return Response({
            'total_billed': total_billed,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'payment_rate_percentage': 
                (total_paid / total_billed * 100) if total_billed > 0 else 0,
            'active_users': active_users,
            'users_with_billing': users_with_billing,
            'recent_invoices': recent_invoices,
            'monthly_revenue': monthly_revenue,
        })






class UserBillingStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id=None):

        if user_id and user_id != request.user.id:
            if not (request.user.is_admin or request.user.is_finance):
                return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        target_user_id = user_id or request.user.id
        
        records = BillingRecord.objects.filter(user_id=target_user_id)
        total_billed = records.aggregate(Sum('amount'))['amount__sum'] or 0
        pending_amount = records.filter(
            payment_status='PENDING'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        paid_amount = records.filter(
            payment_status='PAID'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        last_payment = records.filter(
            payment_status='PAID'
        ).order_by('-paid_at').first()
        
        last_payment_date = last_payment.paid_at if last_payment else None
        
        total_predictions = User.objects.get(id=target_user_id).predictions.count()
        
        return Response({
            'total_billed': total_billed,
            'pending_amount': pending_amount,
            'paid_amount': paid_amount,
            'last_payment_date': last_payment_date,
            'total_predictions': total_predictions
        })