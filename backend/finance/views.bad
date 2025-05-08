"""This is a fixed version of the views.py file for finance app, focused on fixing
the analytics dashboard issues."""

from django.db.models import Sum, Count, Avg, Q, F, Case, When, Value, IntegerField, Subquery, OuterRef
from django.utils import timezone
from rest_framework import viewsets, status, permissions, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.http import HttpResponse
import uuid
import csv
import datetime
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.db.models.functions import TruncDay, TruncMonth, TruncYear

from .models import BillingRecord, UsageStatistics, InsuranceCompany, Invoice, InvoiceItem, BillingRate
from .serializers import (
    BillingRecordSerializer, UsageStatisticsSerializer, UserBillingStatsSerializer,
    InsuranceCompanySerializer, InvoiceSerializer, InvoiceItemSerializer, BillingRateSerializer
)
from account.permissions import IsAdminUser, IsFinanceUser
from account.models import User
from ml_interface.models import Prediction
from claims.models import Claim

class UsageAnalyticsView(APIView):
    """API endpoint for ML predictions usage analytics."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        """
        Get usage analytics for ML predictions grouped by insurance company and time period.
        Supports filtering by:
        - company_id: Insurance company ID
        - time_range: 'weekly', 'monthly', 'yearly'
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        # Get query parameters
        company_id = request.query_params.get('company_id')
        time_range = request.query_params.get('time_range', 'monthly')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Base queryset - FIXED to use Claims that link to both insurance company and ML predictions
        queryset = Claim.objects.filter(
            status='APPROVED',
            # Make sure we have ML predictions
            ml_prediction__isnull=False,
            # Ensure the user has an insurance company
            user__insurance_company__isnull=False
        ).select_related('user', 'user__insurance_company', 'ml_prediction')
        
        # Apply company filter if provided
        if company_id:
            try:
                company = InsuranceCompany.objects.get(id=company_id)
                queryset = queryset.filter(user__insurance_company=company)
            except InsuranceCompany.DoesNotExist:
                return Response(
                    {"error": f"Insurance company with ID {company_id} not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Apply date filters if provided
        if from_date:
            try:
                from_date = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                return Response(
                    {"error": "Invalid from_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if to_date:
            try:
                to_date = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                return Response(
                    {"error": "Invalid to_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Define date truncation based on time_range
        if time_range == 'weekly':
            # Django doesn't have TruncWeek, so we'll use TruncDay
            queryset = queryset.annotate(date=TruncDay('created_at'))
            date_format = '%Y-%m-%d'
        elif time_range == 'yearly':
            queryset = queryset.annotate(date=TruncYear('created_at'))
            date_format = '%Y'
        else:  # Default to monthly
            queryset = queryset.annotate(date=TruncMonth('created_at'))
            date_format = '%Y-%m'
        
        # Group by company and date
        results = queryset.values(
            'user__insurance_company',
            'user__insurance_company__name',
            'date'
        ).annotate(
            count=Count('id'),
            successful=Count('ml_prediction', filter=Q(ml_prediction__status='COMPLETED')),
            failed=Count('ml_prediction', filter=Q(ml_prediction__status='FAILED'))
        ).order_by('user__insurance_company__name', 'date')
        
        # Format results
        formatted_results = []
        for result in results:
            # Skip if insurance company is null
            if result['user__insurance_company'] is None:
                continue
            
            # Get active billing rate for the company
            company_id = result['user__insurance_company']
            date_obj = result['date']
            
            try:
                billing_rate = BillingRate.objects.filter(
                    insurance_company_id=company_id,
                    effective_from__lte=date_obj,
                    is_active=True
                ).order_by('-effective_from').first()
                
                if not billing_rate:
                    # Try to find any rate that covers this period
                    billing_rate = BillingRate.objects.filter(
                        insurance_company_id=company_id,
                        effective_from__lte=date_obj,
                        effective_to__gte=date_obj
                    ).order_by('-effective_from').first()
                
                rate = billing_rate.rate_per_claim if billing_rate else 0
            except (BillingRate.DoesNotExist, AttributeError):
                rate = 0
            
            date_str = date_obj.strftime(date_format)
            
            formatted_results.append({
                'company_id': company_id,
                'company_name': result['user__insurance_company__name'],
                'date': date_str,
                'time_range': time_range,
                'predictions_count': result['count'],
                'successful_predictions': result['successful'],
                'failed_predictions': result['failed'],
                'rate_per_claim': str(rate),
                'total_cost': str(rate * result['count']) if rate else '0.00'
            })
        
        return Response(formatted_results)


class UsageSummaryView(APIView):
    """API endpoint for ML predictions usage summary."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        """
        Get a summary of ML predictions usage with billing information.
        Supports filtering by:
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        # Get query parameters
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Base queryset - FIXED to use Claims model instead of Prediction model
        queryset = Claim.objects.filter(
            status='APPROVED',
            ml_prediction__isnull=False,
            user__insurance_company__isnull=False
        ).select_related('user', 'user__insurance_company', 'ml_prediction')
        
        # Apply date filters if provided
        if from_date:
            try:
                from_date = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=from_date)
            except ValueError:
                return Response(
                    {"error": "Invalid from_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if to_date:
            try:
                to_date = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=to_date)
            except ValueError:
                return Response(
                    {"error": "Invalid to_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get total predictions count (actually claims count)
        total_predictions = queryset.count()
        
        # Group by company
        company_stats = queryset.values(
            'user__insurance_company',
            'user__insurance_company__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Get active billing rates for each company
        company_data = []
        total_billable_amount = 0
        
        for stat in company_stats:
            company_id = stat['user__insurance_company']
            
            # Skip if insurance company is null
            if company_id is None:
                continue
            
            try:
                # Get the active billing rate for this company
                billing_rate = BillingRate.objects.filter(
                    insurance_company_id=company_id,
                    is_active=True
                ).first()
                
                rate = billing_rate.rate_per_claim if billing_rate else 0
                total_amount = rate * stat['count']
                total_billable_amount += total_amount
                
                company_data.append({
                    'company_id': company_id,
                    'company_name': stat['user__insurance_company__name'],
                    'predictions_count': stat['count'],
                    'rate_per_claim': str(rate),
                    'total_amount': str(total_amount)
                })
            except (BillingRate.DoesNotExist, AttributeError):
                # Include company even without a billing rate
                company_data.append({
                    'company_id': company_id,
                    'company_name': stat['user__insurance_company__name'],
                    'predictions_count': stat['count'],
                    'rate_per_claim': '0.00',
                    'total_amount': '0.00'
                })
        
        # Get predictions without company
        unassigned_count = Claim.objects.filter(
            status='APPROVED',
            ml_prediction__isnull=False,
            user__insurance_company__isnull=True
        ).count()
        
        # Date range
        date_range = {
            'from_date': from_date.isoformat() if from_date else None,
            'to_date': to_date.isoformat() if to_date else None
        }
        
        return Response({
            'total_predictions': total_predictions,
            'total_billable_amount': str(total_billable_amount),
            'companies': company_data,
            'unassigned_predictions': unassigned_count,
            'date_range': date_range
        })