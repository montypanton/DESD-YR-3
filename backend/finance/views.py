# Implements API views to handle financial data requests and responses.

from django.db.models import Sum, Count, Avg, Q, F, Case, When, Value, IntegerField
from django.utils import timezone
from rest_framework import viewsets, status, permissions, filters
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.http import HttpResponse
import uuid
import csv
import datetime
from datetime import timedelta
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
    
    @action(detail=True, methods=['get', 'post'])
    def generate_pdf(self, request, pk=None):
        """Generate a PDF invoice."""
        from .pdf_utils import generate_invoice_pdf, pdf_response
        
        invoice = self.get_object()
        
        # Generate PDF content
        pdf_content = generate_invoice_pdf(invoice)
        
        if not pdf_content:
            return Response(
                {"error": "Failed to generate PDF"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        # If it's a POST request, update the status
        if request.method == 'POST':
            invoice.status = 'ISSUED'
            invoice.save()
            
            # Store the generated PDF file
            if pdf_content:
                import os
                from django.core.files.base import ContentFile
                
                # Create the file name
                file_name = f"invoice_{invoice.invoice_number}.pdf"
                
                # Save the file to the invoice's file field
                invoice.invoice_file.save(file_name, ContentFile(pdf_content), save=True)
                
                return Response({
                    "message": "Invoice marked as issued and PDF generated",
                    "status": invoice.status,
                    "file_url": request.build_absolute_uri(invoice.invoice_file.url) if invoice.invoice_file else None
                })
            else:
                return Response({
                    "message": "Invoice marked as issued but PDF generation failed",
                    "status": invoice.status
                })
                
        # For GET requests, return the PDF directly
        return pdf_response(pdf_content, f"invoice_{invoice.invoice_number}.pdf")
    
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
        # Get claims data for dashboard metrics
        from claims.models import Claim
        
        # Calculate total claims value (sum of decided_settlement_amount for approved claims)
        # Handle potential NULL values in decided_settlement_amount with COALESCE
        from django.db.models.functions import Coalesce
        total_claimed = Claim.objects.filter(
            status='APPROVED'
        ).aggregate(
            sum=Sum(Coalesce('decided_settlement_amount', 'amount'))
        )['sum'] or 0
        
        # Get previous month for comparison - use created_at which is guaranteed to exist
        last_month = timezone.now() - timedelta(days=30)
        previous_total = Claim.objects.filter(
            status='APPROVED',
            created_at__lt=last_month
        ).aggregate(
            sum=Sum(Coalesce('decided_settlement_amount', 'amount'))
        )['sum'] or 0
        
        # Since all claims are auto-approved, count completed ML predictions instead
        pending_claims = Claim.objects.filter(
            ml_prediction__isnull=True
        ).count()
        
        # Get previous pending count for comparison
        previous_pending = Claim.objects.filter(
            ml_prediction__isnull=True,
            created_at__lt=last_month
        ).count()
        
        # Calculate average processing time for approved claims
        from django.db.models import F, ExpressionWrapper, fields, Value
        
        # For auto-approved claims, use a consistent processing time based on creation
        # For claims with reviewed_at, use actual review time
        processing_claims = Claim.objects.filter(
            status='APPROVED'
        ).annotate(
            processing_days=ExpressionWrapper(
                Coalesce(F('reviewed_at'), F('updated_at')) - F('created_at'),
                output_field=fields.DurationField()
            )
        )
        
        # Calculate average processing time in days
        avg_processing_days = 0
        if processing_claims.exists():
            total_days = sum([claim.processing_days.days for claim in processing_claims])
            avg_processing_days = total_days / processing_claims.count()
        
        # Get previous quarter processing time - consistent with current processing time calculation
        quarter_ago = timezone.now() - timedelta(days=90)
        previous_processing_claims = Claim.objects.filter(
            status='APPROVED',
            created_at__lt=quarter_ago
        ).annotate(
            processing_days=ExpressionWrapper(
                Coalesce(F('reviewed_at'), F('updated_at')) - F('created_at'),
                output_field=fields.DurationField()
            )
        )
        
        previous_avg_days = 0
        if previous_processing_claims.exists():
            # Avoid negative values by using abs()
            previous_total_days = sum([abs(claim.processing_days.days) for claim in previous_processing_claims])
            previous_avg_days = previous_total_days / previous_processing_claims.count()
        
        # Original billing metrics
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
        
        # Billing by company - include this month filter for more relevant data
        this_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        billing_by_company = BillingRecord.objects.filter(
            insurance_company__isnull=False,
            created_at__gte=this_month_start  # Only show current month data
        ).values(
            'insurance_company', 'insurance_company__name'
        ).annotate(
            total_amount=Sum('amount'),
            records_count=Count('id'),
            month=Value(this_month_start.strftime('%Y-%m'))  # Add month info
        ).order_by('-total_amount')
        
        # If no current month data, fall back to all-time data
        if not billing_by_company:
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
        
        # Force cache refresh by clearing the connection
        from django.db import connection
        connection.close()
        
        # Count approved claims for frontend stat - use direct SQL to bypass cache
        approved_claims_query = """
            SELECT COUNT(*) FROM claims_claim WHERE status = 'APPROVED'
        """
        with connection.cursor() as cursor:
            cursor.execute(approved_claims_query)
            approved_claims = cursor.fetchone()[0]
        
        # Calculate total claimed amount with direct SQL to bypass cache
        total_claimed_query = """
            SELECT COALESCE(SUM(COALESCE(decided_settlement_amount, amount)), 0)  
            FROM claims_claim WHERE status = 'APPROVED'
        """
        with connection.cursor() as cursor:
            cursor.execute(total_claimed_query)
            total_claimed = float(cursor.fetchone()[0] or 0)
        
        # Override the total_claimed with the direct SQL result
        total_claimed = total_claimed
        
        # Get current billable claims data - more suitable for dashboard display
        from .views import BillableClaimsView
        billable_view = BillableClaimsView()
        current_month = timezone.now().month
        current_year = timezone.now().year
        
        # Create a mock request with query params
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        mock_request = factory.get('/', {'year': current_year, 'month': current_month})
        mock_request.user = request.user
        
        # Get billable claims for the current month
        billable_claims_response = billable_view.get(mock_request)
        billable_claims = billable_claims_response.data
        
        # Log count info for debugging
        logger.info(f"Dashboard stats - approved_claims: {approved_claims}, total_claimed: {total_claimed}")
        
        # Get latest billing metrics using direct SQL
        billing_totals_query = """
            SELECT 
                COALESCE(SUM(amount), 0) as total_billed,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN amount ELSE 0 END), 0) as total_pending
            FROM finance_billingrecord
        """
        with connection.cursor() as cursor:
            cursor.execute(billing_totals_query)
            row = cursor.fetchone()
            direct_total_billed = float(row[0] or 0)
            direct_total_paid = float(row[1] or 0)
            direct_total_pending = float(row[2] or 0)
            
        # Generate timestamp for data freshness
        current_timestamp = timezone.now().isoformat()
            
        return Response({
            # Dashboard metrics
            'total_claimed': float(total_claimed),
            'previous_total': float(previous_total),
            'pending_claims': pending_claims,
            'previous_pending': previous_pending,
            'avg_processing_days': float(avg_processing_days),
            'previous_avg_days': float(previous_avg_days),
            'approved_claims': approved_claims, # Add this for frontend
            
            # Original metrics - use direct SQL results for consistency
            'total_billed': direct_total_billed,
            'total_paid': direct_total_paid,
            'total_pending': direct_total_pending,
            'payment_rate_percentage': 
                (direct_total_paid / direct_total_billed * 100) if direct_total_billed > 0 else 0,
            'active_users': active_users,
            'users_with_billing': users_with_billing,
            'recent_invoices': recent_invoices,
            'monthly_revenue': monthly_revenue,
            
            # New metrics
            'insurance_companies': insurance_companies,
            'billing_by_company': billing_by_company,
            'billable_claims': billable_claims, # Include current billable claims
            'data_timestamp': current_timestamp, # Add timestamp
            'recent_company_invoices': recent_company_invoices,
            'upcoming_due': upcoming_due,
            
            # Force cache refresh flag
            'cache_buster': str(uuid.uuid4())  # Add random value to ensure client doesn't cache
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
    """API endpoint for claims usage analytics for finance team."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        """
        Get usage analytics for claims grouped by insurance company and time period.
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
        
        # Import Claim model - only using direct claims data
        from claims.models import Claim
        
        # Base queryset using only the Claim model
        queryset = Claim.objects.select_related('user', 'user__insurance_company')
        
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
        from django.db.models.functions import TruncDay, TruncMonth, TruncYear
        
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
        
        # Group by company and date - only using real claims
        results = queryset.values(
            'user__insurance_company',
            'user__insurance_company__name',
            'date'
        ).annotate(
            count=Count('id'),
            approved=Sum(Case(
                When(status='APPROVED', then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )),
            rejected=Sum(Case(
                When(status='REJECTED', then=Value(1)),
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
                'claims_count': result['count'],
                'approved_claims': result['approved'],
                'rejected_claims': result['rejected'],
                'rate_per_claim': str(rate),
                'total_cost': str(rate * result['count']) if rate else '0.00'
            })
        
        return Response(formatted_results)


class BillableClaimsView(APIView):
    """API endpoint for fetching billable claims per company and month."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        """
        Get billable claims per company and month.
        Supports filtering by:
        - company_id: Insurance company ID
        - year: Year for the report (default: current year)
        - month: Month for the report (1-12, optional)
        """
        # Get query parameters
        company_id = request.query_params.get('company_id')
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month')
        
        try:
            year = int(year)
        except (ValueError, TypeError):
            year = timezone.now().year
            
        if month:
            try:
                month = int(month)
                if month < 1 or month > 12:
                    return Response(
                        {"error": "Month must be between 1 and 12"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                month = None
                
        # Start with all insurance companies that have active billing rates
        active_companies = InsuranceCompany.objects.filter(is_active=True)
        
        # Get active billing rates for all companies
        active_rates = {}
        for company in active_companies:
            rate = BillingRate.objects.filter(
                insurance_company=company,
                is_active=True
            ).first()
            
            if rate:
                active_rates[company.id] = {
                    'company_name': company.name,
                    'rate': float(rate.rate_per_claim)
                }
        
        # Now get approved claims by company
        from claims.models import Claim
        from django.db.models import F
        
        # Get the current year and month if filtering
        current_year = timezone.now().year
        current_month = timezone.now().month
        
        if not year:
            year = current_year
        if not month:
            month = current_month
        
        # Get all approved claims, including auto-approved ones
        claims_queryset = Claim.objects.filter(
            status='APPROVED'
        ).select_related('user', 'user__insurance_company')
        
        # Apply year/month filter using created_at (which is always set) instead of reviewed_at
        if year and month:
            claims_queryset = claims_queryset.filter(
                created_at__year=year,
                created_at__month=month
            )
        elif year:
            claims_queryset = claims_queryset.filter(created_at__year=year)
            
        # Apply company filter if provided
        if company_id:
            claims_queryset = claims_queryset.filter(user__insurance_company_id=company_id)
            
        # Get all claims grouped by company
        company_claims = {}
        for claim in claims_queryset:
            if not claim.user or not claim.user.insurance_company:
                continue
                
            company_id = claim.user.insurance_company.id
            company_name = claim.user.insurance_company.name
            
            if company_id not in company_claims:
                company_claims[company_id] = {
                    'company_name': company_name,
                    'claim_count': 0,
                    'total_amount': 0
                }
                
            company_claims[company_id]['claim_count'] += 1
            
            # Use decided_settlement_amount or fall back to ML prediction or original amount
            settlement_amount = 0
            if claim.decided_settlement_amount is not None:
                settlement_amount = float(claim.decided_settlement_amount)
            elif claim.ml_prediction and claim.ml_prediction.settlement_amount is not None:
                settlement_amount = float(claim.ml_prediction.settlement_amount)
            elif claim.amount is not None:
                settlement_amount = float(claim.amount)
                
            company_claims[company_id]['total_amount'] += settlement_amount
        
        # Combine the data and calculate billable amounts
        results = []
        
        # Format current month as "YYYY-MM"
        month_str = f"{year}-{month:02d}"
        
        # First add companies with claims
        for company_id, claim_data in company_claims.items():
            rate = 0
            if company_id in active_rates:
                rate = active_rates[company_id]['rate']
                
            billable_amount = rate * claim_data['claim_count']
            
            results.append({
                'month': month_str,
                'company_id': company_id,
                'company_name': claim_data['company_name'],
                'claim_count': claim_data['claim_count'],
                'total_settlement_amount': claim_data['total_amount'],
                'rate_per_claim': rate,
                'billable_amount': billable_amount
            })
        
        # Add companies with no claims but active rates
        for company_id, rate_data in active_rates.items():
            if company_id not in company_claims:
                results.append({
                    'month': month_str,
                    'company_id': company_id,
                    'company_name': rate_data['company_name'],
                    'claim_count': 0,
                    'total_settlement_amount': 0,
                    'rate_per_claim': rate_data['rate'],
                    'billable_amount': 0
                })
            
        return Response(results)


class CompanyUsersView(APIView):
    """API endpoint for fetching users under each company with their usage costs."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        """
        Get users under each company with their usage costs.
        Supports filtering by:
        - company_id: Insurance company ID
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        # Get query parameters
        company_id = request.query_params.get('company_id')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Process date filters
        if from_date:
            try:
                from_date = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid from_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if to_date:
            try:
                to_date = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid to_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Start with all users that belong to insurance companies
        from account.models import User
        
        # Filter users by insurance company if specified
        if company_id:
            users_queryset = User.objects.filter(
                insurance_company_id=company_id,
                is_active=True
            ).select_related('insurance_company')
        else:
            users_queryset = User.objects.filter(
                insurance_company__isnull=False,
                is_active=True
            ).select_related('insurance_company')
        
        # Get claims for each user
        from claims.models import Claim
        
        # Prepare result data
        result_data = []
        
        for user in users_queryset:
            # Get approved claims for this user
            claims_queryset = Claim.objects.filter(
                user=user,
                status='APPROVED',
                reviewed_by__isnull=False
            )
            
            # Apply date filters if provided
            if from_date:
                claims_queryset = claims_queryset.filter(reviewed_at__date__gte=from_date)
                
            if to_date:
                claims_queryset = claims_queryset.filter(reviewed_at__date__lte=to_date)
            
            # Count total approved claims
            approved_claims_count = claims_queryset.count()
            
            # Get billing rate for the user's company
            rate = 0
            if user.insurance_company:
                try:
                    billing_rate = BillingRate.objects.filter(
                        insurance_company=user.insurance_company,
                        is_active=True
                    ).first()
                    
                    if billing_rate:
                        rate = float(billing_rate.rate_per_claim)
                    else:
                        # Try to find any billing rate for this company, active or not
                        any_rate = BillingRate.objects.filter(
                            insurance_company=user.insurance_company
                        ).order_by('-effective_from').first()
                        
                        rate = float(any_rate.rate_per_claim) if any_rate else 0
                except Exception:
                    rate = 0
            
            # Calculate billable amount
            billable_amount = rate * approved_claims_count
            
            # Get pending claims for this user
            pending_claims_count = Claim.objects.filter(
                user=user,
                status__in=['PENDING', 'PROCESSING']
            ).count()
            
            # Format user data
            user_data = {
                'id': user.id,
                'email': user.email,
                'full_name': user.get_full_name(),
                'company_id': user.insurance_company.id if user.insurance_company else None,
                'company_name': user.insurance_company.name if user.insurance_company else None,
                'approved_claims_count': approved_claims_count,
                'pending_claims_count': pending_claims_count,
                'rate_per_claim': rate,
                'billable_amount': billable_amount,
                'last_active': user.last_login.isoformat() if user.last_login else None,
                'date_joined': user.date_joined.isoformat()
            }
            
            result_data.append(user_data)
        
        # Sort by billable amount (descending)
        result_data.sort(key=lambda x: (x['company_name'] or '', -x['billable_amount']))
        
        return Response(result_data)
        

class UsageSummaryView(APIView):
    """API endpoint for claims usage summary for finance team."""
    permission_classes = [IsAuthenticated, (IsFinanceUser | IsAdminUser)]
    
    def get(self, request):
        """
        Get a summary of claims usage with billing information.
        Supports filtering by:
        - from_date: Start date (YYYY-MM-DD)
        - to_date: End date (YYYY-MM-DD)
        """
        # Get query parameters
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        
        # Import the Claim model - using only real claims data
        from claims.models import Claim
        
        # Base queryset - only using claims
        queryset = Claim.objects.select_related('user', 'user__insurance_company')
        
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
        
        # Get total claims count
        total_claims = queryset.count()
        
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
                    'claims_count': stat['count'],
                    'rate_per_claim': str(rate),
                    'total_amount': str(total_amount)
                })
            except (BillingRate.DoesNotExist, AttributeError):
                # Include company even without a billing rate
                company_data.append({
                    'company_id': company_id,
                    'company_name': stat['user__insurance_company__name'],
                    'claims_count': stat['count'],
                    'rate_per_claim': '0.00',
                    'total_amount': '0.00'
                })
        
        # Get claims without company
        unassigned_count = queryset.filter(
            user__insurance_company__isnull=True
        ).count()
        
        # Date range
        date_range = {
            'from_date': from_date.isoformat() if from_date else None,
            'to_date': to_date.isoformat() if to_date else None
        }
        
        return Response({
            'total_claims': total_claims,
            'total_billable_amount': str(total_billable_amount),
            'companies': company_data,
            'unassigned_claims': unassigned_count,
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_company_rate(request):
    """
    Get billing rate information for a user's insurance company, 
    optionally based on a specific claim's creation date.
    This is used by the ML Usage Invoices page to display billing rates.
    """
    claim_id = request.query_params.get('claim_id')
    
    if claim_id:
        # Get the claim to determine the date and user's company at the time
        from claims.models import Claim
        try:
            claim = Claim.objects.get(id=claim_id)
            user = claim.user
            claim_date = claim.created_at
        except Claim.DoesNotExist:
            return Response(
                {"error": f"Claim with ID {claim_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Use the current user and current date
        user = request.user
        claim_date = timezone.now()
    
    # Check if user has an insurance company
    if not user.insurance_company:
        return Response({
            "company_name": "Unknown",
            "rate_per_claim": "0.00"
        })
    
    # Get the billing rate for this company at the claim date
    company = user.insurance_company
    
    try:
        # First try to find a rate that was specifically active at the claim date
        billing_rate = BillingRate.objects.filter(
            insurance_company=company,
            effective_from__lte=claim_date,
            is_active=True
        ).order_by('-effective_from').first()
        
        if not billing_rate:
            # Try to find any rate that covers this period
            billing_rate = BillingRate.objects.filter(
                insurance_company=company,
                effective_from__lte=claim_date,
                effective_to__gte=claim_date
            ).order_by('-effective_from').first()
        
        if not billing_rate:
            # Fall back to any rate for this company
            billing_rate = BillingRate.objects.filter(
                insurance_company=company
            ).order_by('-effective_from').first()
        
        rate = billing_rate.rate_per_claim if billing_rate else 0
    except Exception:
        rate = 0
    
    return Response({
        "company_name": company.name,
        "rate_per_claim": str(rate)
    })