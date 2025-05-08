# Debug view for invoice creation to diagnose issues
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from django.db import connection, transaction
import json
import traceback
from .models import Invoice, InsuranceCompany
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import uuid
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def debug_create_invoice(request):
    """
    Simple view to create an invoice with minimal processing.
    """
    try:
        # Parse request data
        data = request.data
        
        # Log the data received for debugging
        logger.info("DEBUG VIEW - Received data: %s", json.dumps(data, indent=2))
        print("DEBUG VIEW - Received data:", json.dumps(data, indent=2))
        
        # Validate required fields
        required_fields = ['insurance_company', 'issued_date', 'due_date', 'total_amount']
        for field in required_fields:
            if field not in data:
                return Response(
                    {"error": f"Missing required field: {field}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        # Get insurance company
        try:
            company_id = int(data['insurance_company'])
            company = InsuranceCompany.objects.get(id=company_id)
        except (ValueError, InsuranceCompany.DoesNotExist) as e:
            logger.error("Invalid insurance company ID: %s, Error: %s", data.get('insurance_company'), str(e))
            return Response(
                {"error": f"Invalid insurance company ID: {data.get('insurance_company')}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique invoice number
        invoice_number = f"DEBUG-{uuid.uuid4().hex[:8].upper()}"
        
        # Create invoice with minimal fields
        with transaction.atomic():
            # Log the values we'll be using to create the invoice
            logger.info("Creating invoice with: number=%s, company=%s, issued_date=%s, due_date=%s, amount=%s",
                       invoice_number, company.id, data['issued_date'], data['due_date'], data['total_amount'])
            
            invoice = Invoice.objects.create(
                invoice_number=invoice_number,
                insurance_company=company,
                issued_date=data['issued_date'],
                due_date=data['due_date'],
                total_amount=data['total_amount'],
                currency=data.get('currency', 'USD'),
                status=data.get('status', 'DRAFT'),
                notes=data.get('notes', '')
            )
            
        # Return success response
        return Response({
            "message": "Invoice created successfully via debug view",
            "id": invoice.id,
            "invoice_number": invoice.invoice_number
        }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        # Get detailed error with traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        
        logger.error("DEBUG VIEW - Error creating invoice: %s", error_msg)
        logger.error("DEBUG VIEW - Traceback: %s", error_trace)
        print(f"DEBUG VIEW - Error creating invoice: {error_msg}")
        print(f"DEBUG VIEW - Traceback: {error_trace}")
        
        # Check for database errors
        if connection.queries:
            last_query = connection.queries[-1]
            logger.error("DEBUG VIEW - Last DB query: %s", last_query.get('sql', 'No SQL'))
            print(f"DEBUG VIEW - Last DB query: {last_query.get('sql', 'No SQL')}")
            
        return Response({
            "error": f"Failed to create invoice: {error_msg}",
            "traceback": error_trace
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)