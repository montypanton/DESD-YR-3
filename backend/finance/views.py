# Implements API views to handle financial data requests and responses.

from django.db.models import Sum, Count, Avg, Q, F, Case, When, Value, IntegerField
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
from dateutil.relativedelta import relativedelta

from .models import BillingRecord, UsageStatistics, InsuranceCompany, Invoice, InvoiceItem, BillingRate
from .serializers import (
    BillingRecordSerializer, UsageStatisticsSerializer, UserBillingStatsSerializer,
    InsuranceCompanySerializer, InvoiceSerializer, InvoiceItemSerializer, BillingRateSerializer
)
from account.permissions import IsAdminUser, IsFinanceUser
from account.models import User
from ml_interface.models import Prediction

# Public view for insurance companies - no authentication required
class PublicInsuranceCompanyList(APIView):
    """Public API endpoint to list active insurance companies without authentication."""
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Only return active companies for public access
        companies = InsuranceCompany.objects.filter(is_active=True).order_by('name')
        serializer = InsuranceCompanySerializer(companies, many=True)
        return Response(serializer.data)


class InsuranceCompanyViewSet(viewsets.ModelViewSet):
    """API endpoint for insurance companies management."""
    queryset = InsuranceCompany.objects.all()
    serializer_class = InsuranceCompanySerializer
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'company_id', 'contact_email']
    ordering_fields = ['name', 'created_at']
    
    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        """Get all invoices for a specific insurance company."""
        company = self.get_object()
        invoices = Invoice.objects.filter(insurance_company=company)
        page = self.paginate_queryset(invoices)
        if page is not None:
            serializer = InvoiceSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def billing_records(self, request, pk=None):
        """Get all billing records for a specific insurance company."""
        company = self.get_object()
        records = BillingRecord.objects.filter(insurance_company=company)
        page = self.paginate_queryset(records)
        if page is not None:
            serializer = BillingRecordSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = BillingRecordSerializer(records, many=True)
        return Response(serializer.data)


class InvoiceViewSet(viewsets.ModelViewSet):
    """API endpoint for invoice management."""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'insurance_company__name', 'status']
    ordering_fields = ['created_at', 'due_date', 'total_amount']
    
    def perform_create(self, serializer):
        # Generate a unique invoice number if not provided
        if not serializer.validated_data.get('invoice_number'):
            invoice_prefix = 'INV-'
            invoice_number = f"{invoice_prefix}{uuid.uuid4().hex[:8].upper()}"
            serializer.save(invoice_number=invoice_number)
        else:
            serializer.save()
    
    @action(detail=True, methods=['post'])
    def add_items(self, request, pk=None):
        """Add billing records as items to an invoice."""
        invoice = self.get_object()
        billing_record_ids = request.data.get('billing_record_ids', [])
        
        if not billing_record_ids:
            return Response(
                {"error": "No billing record IDs provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fetch the billing records
        billing_records = BillingRecord.objects.filter(id__in=billing_record_ids)
        
        # Create invoice items
        items_created = 0
        total_amount = 0
        
        for record in billing_records:
            # Skip if this record is already in an invoice item
            if hasattr(record, 'invoice_items') and record.invoice_items.exists():
                continue
                
            # Create new invoice item
            item = InvoiceItem.objects.create(
                invoice=invoice,
                billing_record=record,
                description=f"Claim: {record.claim_reference or record.invoice_number}",
                quantity=1,
                unit_price=record.amount,
                total_price=record.amount
            )
            
            items_created += 1
            total_amount += record.amount
        
        # Update the invoice total amount
        invoice.total_amount = invoice.total_amount + total_amount
        invoice.save()
        
        return Response({
            "message": f"Added {items_created} items to invoice",
            "total_amount": invoice.total_amount
        })
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate a PDF invoice."""
        invoice = self.get_object()
        
        # This would normally generate a PDF, but we'll just update the status for now
        invoice.status = 'ISSUED'
        invoice.save()
        
        return Response({
            "message": "Invoice marked as issued",
            "status": invoice.status
        })
    
    @action(detail=True, methods=['post'])
    def send_invoice(self, request, pk=None):
        """Send the invoice to the insurance company."""
        invoice = self.get_object()
        
        # This would normally send an email, but we'll just update the status
        invoice.status = 'SENT'
        invoice.save()
        
        return Response({
            "message": f"Invoice sent to {invoice.insurance_company.name}",
            "status": invoice.status
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Mark the invoice as paid."""
        invoice = self.get_object()
        
        paid_date = request.data.get('paid_date', timezone.now().date())
        
        invoice.status = 'PAID'
        invoice.paid_date = paid_date
        invoice.save()
        
        # Also mark all associated billing records as paid
        for item in invoice.items.all():
            item.billing_record.payment_status = 'PAID'
            item.billing_record.paid_at = timezone.now()
            item.billing_record.save()
        
        return Response({
            "message": "Invoice marked as paid",
            "status": invoice.status,
            "paid_date": invoice.paid_date
        })
    
    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        """Export the invoice details as CSV."""
        invoice = self.get_object()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.invoice_number}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Invoice Number', 'Company', 'Issue Date', 'Due Date', 'Status', 'Total Amount'])
        writer.writerow([
            invoice.invoice_number, 
            invoice.insurance_company.name,
            invoice.issued_date,
            invoice.due_date,
            invoice.status,
            invoice.total_amount
        ])
        
        writer.writerow([])
        writer.writerow(['Item', 'Description', 'Quantity', 'Unit Price', 'Total Price'])
        
        for item in invoice.items.all():
            writer.writerow([
                item.id,
                item.description,
                item.quantity,
                item.unit_price,
                item.total_price
            ])
        
        return response


class BillingRecordViewSet(viewsets.ModelViewSet):
    queryset = BillingRecord.objects.all()
    serializer_class = BillingRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'user__email', 'insurance_company__name']
    ordering_fields = ['created_at', 'amount', 'due_date']
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'list']:
            self.permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):
        if self.request.user.is_admin or self.request.user.is_finance:
            return BillingRecord.objects.all()
        return BillingRecord.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Generate a unique invoice number if not provided
        if not serializer.validated_data.get('invoice_number'):
            billing_prefix = 'BIL-'
            invoice_number = f"{billing_prefix}{uuid.uuid4().hex[:8].upper()}"
            serializer.save(invoice_number=invoice_number)
        else:
            serializer.save()
    
    @action(detail=False, methods=['get'])
    def my_billing(self, request):
        queryset = BillingRecord.objects.filter(user=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unbilled(self, request):
        """Get all billing records that haven't been added to an invoice."""
        # Check for insurance company filter
        company_id = request.query_params.get('insurance_company')
        
        # Start with all records without invoice items
        queryset = BillingRecord.objects.filter(invoice_items__isnull=True)
        
        # Filter by insurance company if specified
        if company_id:
            queryset = queryset.filter(insurance_company_id=company_id)
        
        # Additional filters
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(payment_status=status)
        
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
    
    @action(detail=False, methods=['post'])
    def bulk_assign_to_company(self, request):
        """Assign multiple billing records to an insurance company."""
        if not (request.user.is_admin or request.user.is_finance):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        record_ids = request.data.get('record_ids', [])
        company_id = request.data.get('insurance_company_id')
        
        if not record_ids:
            return Response({"error": "No billing record IDs provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not company_id:
            return Response({"error": "No insurance company ID provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            company = InsuranceCompany.objects.get(id=company_id)
        except InsuranceCompany.DoesNotExist:
            return Response({"error": "Insurance company not found"}, status=status.HTTP_404_NOT_FOUND)
        
        updated_count = BillingRecord.objects.filter(id__in=record_ids).update(insurance_company=company)
        
        return Response({
            "message": f"Assigned {updated_count} billing records to {company.name}",
            "updated_count": updated_count
        })


class UsageStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UsageStatistics.objects.all()
    serializer_class = UsageStatisticsSerializer
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__email', 'insurance_company__name']
    ordering_fields = ['date', 'billed_amount']
    
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
    
    @action(detail=False, methods=['get'])
    def by_company(self, request):
        """Get usage statistics grouped by insurance company."""
        # Group usage statistics by company
        stats = UsageStatistics.objects.values(
            'insurance_company', 'insurance_company__name'
        ).annotate(
            total_predictions=Sum('predictions_count'),
            total_billed=Sum('billed_amount'),
            avg_processing_time=Avg('average_processing_time')
        ).order_by('-total_billed')
        
        return Response(stats)


class BillingDashboardView(APIView):
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        # Original metrics
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
        
        # New metrics for insurance companies
        insurance_companies = InsuranceCompany.objects.filter(is_active=True).count()
        
        # Billing by company
        billing_by_company = BillingRecord.objects.filter(
            insurance_company__isnull=False
        ).values(
            'insurance_company', 'insurance_company__name'
        ).annotate(
            total_amount=Sum('amount'),
            records_count=Count('id')
        ).order_by('-total_amount')[:5]
        
        # Recent invoices to insurance companies
        recent_company_invoices = InvoiceSerializer(
            Invoice.objects.all().order_by('-created_at')[:5],
            many=True
        ).data
        
        # Upcoming due invoices
        today = timezone.now().date()
        upcoming_due = InvoiceSerializer(
            Invoice.objects.filter(
                due_date__gt=today,
                status__in=['ISSUED', 'SENT']
            ).order_by('due_date')[:5],
            many=True
        ).data
        
        return Response({
            # Original metrics
            'total_billed': total_billed,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'payment_rate_percentage': 
                (total_paid / total_billed * 100) if total_billed > 0 else 0,
            'active_users': active_users,
            'users_with_billing': users_with_billing,
            'recent_invoices': recent_invoices,
            'monthly_revenue': monthly_revenue,
            
            # New metrics
            'insurance_companies': insurance_companies,
            'billing_by_company': billing_by_company,
            'recent_company_invoices': recent_company_invoices,
            'upcoming_due': upcoming_due
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


class InvoicingStatsView(APIView):
    """API endpoint for invoice statistics."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        # Count invoices by status
        status_counts = Invoice.objects.values('status').annotate(count=Count('id'))
        
        # Total amounts by status
        status_amounts = Invoice.objects.values('status').annotate(total=Sum('total_amount'))
        
        # Monthly invoicing totals for the last 6 months
        today = timezone.now().date()
        six_months_ago = today - datetime.timedelta(days=180)
        
        monthly_totals = Invoice.objects.filter(
            created_at__gte=six_months_ago
        ).extra({
            'month': "to_char(created_at, 'YYYY-MM')"
        }).values('month').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        ).order_by('month')
        
        # Insurance companies with most invoices
        companies_with_most_invoices = Invoice.objects.values(
            'insurance_company', 'insurance_company__name'
        ).annotate(
            count=Count('id'),
            total=Sum('total_amount')
        ).order_by('-count')[:5]
        
        # Overdue invoices
        today = timezone.now().date()
        overdue_invoices = Invoice.objects.filter(
            due_date__lt=today,
            status__in=['ISSUED', 'SENT']
        ).count()
        
        overdue_amount = Invoice.objects.filter(
            due_date__lt=today,
            status__in=['ISSUED', 'SENT']
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        return Response({
            'status_counts': status_counts,
            'status_amounts': status_amounts,
            'monthly_totals': monthly_totals,
            'top_companies': companies_with_most_invoices,
            'overdue_invoices_count': overdue_invoices,
            'overdue_amount': overdue_amount
        })


class BillingRateViewSet(viewsets.ModelViewSet):
    """API endpoint for managing billing rates per insurance company."""
    queryset = BillingRate.objects.all()
    serializer_class = BillingRateSerializer
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['insurance_company__name']
    ordering_fields = ['effective_from', 'rate_per_claim', 'created_at']
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active billing rates."""
        active_rates = BillingRate.objects.filter(is_active=True)
        serializer = self.get_serializer(active_rates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_company(self, request, company_id=None):
        """Get billing rates for a specific company."""
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {"error": "company_id query parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = InsuranceCompany.objects.get(id=company_id)
        except InsuranceCompany.DoesNotExist:
            return Response(
                {"error": "Insurance company not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        rates = BillingRate.objects.filter(insurance_company=company)
        serializer = self.get_serializer(rates, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a billing rate."""
        rate = self.get_object()
        rate.is_active = False
        rate.effective_to = timezone.now().date()
        rate.save()
        
        serializer = self.get_serializer(rate)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a billing rate and deactivate any other active rates for this company."""
        rate = self.get_object()
        company = rate.insurance_company
        
        # Deactivate any currently active rates for this company
        BillingRate.objects.filter(
            insurance_company=company,
            is_active=True
        ).update(is_active=False)
        
        # Activate this rate
        rate.is_active = True
        rate.effective_from = timezone.now().date()
        rate.effective_to = None
        rate.save()
        
        serializer = self.get_serializer(rate)
        return Response(serializer.data)


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
        
        # Base queryset
        queryset = Prediction.objects.all()
        
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
            # Django doesn't have TruncWeek, so we'll use TruncDay and group manually
            queryset = queryset.extra({
                'date': "date_trunc('day', created_at)"
            })
            date_format = '%Y-%m-%d'
        elif time_range == 'yearly':
            queryset = queryset.extra({
                'date': "date_trunc('year', created_at)"
            })
            date_format = '%Y'
        else:  # Default to monthly
            queryset = queryset.extra({
                'date': "date_trunc('month', created_at)"
            })
            date_format = '%Y-%m'
        
        # Group by company and date
        results = queryset.values(
            'user__insurance_company',
            'user__insurance_company__name',
            'date'
        ).annotate(
            count=Count('id'),
            successful=Sum(Case(
                When(status='COMPLETED', then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )),
            failed=Sum(Case(
                When(status='FAILED', then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            ))
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
        
        # Base queryset
        queryset = Prediction.objects.all()
        
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
        
        # Get total predictions count
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
        unassigned_count = queryset.filter(
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


class ExportPredictionsView(APIView):
    """API endpoint for exporting ML predictions data."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request, format=None):
        """
        Export ML predictions data as CSV.
        Supports filtering by:
        - company_id: Insurance company ID
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        # Get query parameters
        company_id = request.query_params.get('company_id')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Base queryset
        queryset = Prediction.objects.all()
        
        # Apply company filter if provided
        if company_id:
            try:
                company = InsuranceCompany.objects.get(id=company_id)
                queryset = queryset.filter(user__insurance_company=company)
                company_name = company.name
            except InsuranceCompany.DoesNotExist:
                return Response(
                    {"error": f"Insurance company with ID {company_id} not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            company_name = "All Companies"
        
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
        
        # Get predictions with related data
        predictions = queryset.select_related('user', 'user__insurance_company').order_by('-created_at')
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="predictions_{company_name}_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Prediction ID', 'Date', 'User', 'Insurance Company', 'Status', 
            'Model Used', 'Processing Time (s)', 'Rate Per Claim', 'Billable Amount'
        ])
        
        # Write prediction data
        for prediction in predictions:
            # Get billing rate for this prediction's company
            rate = 0
            if prediction.user and prediction.user.insurance_company:
                try:
                    billing_rate = BillingRate.objects.filter(
                        insurance_company=prediction.user.insurance_company,
                        effective_from__lte=prediction.created_at,
                        is_active=True
                    ).order_by('-effective_from').first()
                    
                    if not billing_rate:
                        # Try to find any rate that covers this period
                        billing_rate = BillingRate.objects.filter(
                            insurance_company=prediction.user.insurance_company,
                            effective_from__lte=prediction.created_at,
                            effective_to__gte=prediction.created_at
                        ).order_by('-effective_from').first()
                    
                    rate = billing_rate.rate_per_claim if billing_rate else 0
                except (BillingRate.DoesNotExist, AttributeError):
                    rate = 0
            
            writer.writerow([
                prediction.id,
                prediction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                prediction.user.email if prediction.user else 'Unknown',
                prediction.user.insurance_company.name if prediction.user and prediction.user.insurance_company else 'None',
                prediction.status,
                prediction.model_name,
                prediction.processing_time,
                rate,
                rate if prediction.status == 'COMPLETED' else 0
            ])
        
        return response