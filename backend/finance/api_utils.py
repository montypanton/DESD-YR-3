# Utilities for standardizing API responses across finance endpoints

import logging
import uuid
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

from finance.models import BillingRecord, InsuranceCompany

logger = logging.getLogger(__name__)

def standard_response(data=None, message=None, errors=None, status_code=status.HTTP_200_OK, metadata=None):
    """
    Creates a standardized response format for all API endpoints.
    
    Args:
        data (any): The main response data
        message (str): Optional success/info message
        errors (dict/list/str): Optional error details
        status_code (int): HTTP status code
        metadata (dict): Optional metadata (pagination, etc.)
    
    Returns:
        Response: Standardized REST framework response
    """
    response_body = {
        "success": errors is None,
        "message": message,
        "data": data
    }
    
    if errors:
        response_body["errors"] = errors
        
    if metadata:
        response_body["metadata"] = metadata
        
    return Response(response_body, status=status_code)

def paginated_response(queryset, serializer_class, request, page_size=10, message=None):
    """
    Creates a paginated response with standardized format.
    
    Args:
        queryset: Django queryset to paginate
        serializer_class: Serializer class to use for data serialization
        request: Django request object containing pagination parameters
        page_size (int): Number of items per page
        message (str): Optional success/info message
        
    Returns:
        Response: Standardized paginated response
    """
    page = request.query_params.get('page', 1)
    try:
        page = int(page)
    except (TypeError, ValueError):
        page = 1
        
    custom_page_size = request.query_params.get('page_size')
    if custom_page_size:
        try:
            page_size = int(custom_page_size)
            # Limit max page size to prevent excessive queries
            page_size = min(page_size, 100)
        except (TypeError, ValueError):
            pass
    
    paginator = Paginator(queryset, page_size)
    
    try:
        page_obj = paginator.page(page)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)
    
    # Serialize the data for the current page
    serializer = serializer_class(page_obj, many=True, context={'request': request})
    
    # Construct pagination metadata
    metadata = {
        "pagination": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "next": page_obj.next_page_number() if page_obj.has_next() else None,
            "previous": page_obj.previous_page_number() if page_obj.has_previous() else None,
            "page_size": page_size
        }
    }
    
    return standard_response(
        data=serializer.data,
        message=message,
        metadata=metadata
    )

def error_response(error_message, details=None, status_code=status.HTTP_400_BAD_REQUEST):
    """
    Creates a standardized error response.
    
    Args:
        error_message (str): Main error message
        details (dict/list): Optional detailed error information
        status_code (int): HTTP status code
        
    Returns:
        Response: Standardized error response
    """
    errors = details if details else error_message
    
    return standard_response(
        data=None,
        message=error_message,
        errors=errors,
        status_code=status_code
    )

def exception_handler(exc, context=None, log_error=True):
    """
    Handles exceptions and returns standardized error response.
    
    Args:
        exc (Exception): The exception that occurred
        context (dict): Optional context information
        log_error (bool): Whether to log the error
        
    Returns:
        Response: Standardized error response
    """
    if log_error:
        logger.error(f"Exception occurred: {str(exc)}", exc_info=True)
    
    error_message = str(exc)
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    # You can customize how different exception types are handled
    # For example:
    # if isinstance(exc, ValidationError):
    #     status_code = status.HTTP_400_BAD_REQUEST
    
    return error_response(
        error_message=error_message,
        status_code=status_code
    )

def ensure_billing_record_for_approved_claim(claim):
    """
    Ensures a billing record exists for an approved claim.
    
    This is the single source of truth for billing record creation logic.
    All API endpoints that approve claims should use this function.
    
    Args:
        claim: The Claim object that has been approved
        
    Returns:
        dict: A response containing:
            - success (bool): Whether the operation was successful
            - billing_record: The BillingRecord object (if successful)
            - message: A description of what happened
            - error: Error message (if unsuccessful)
    """
    # Force refresh the claim from the database to ensure we have the latest status
    # This is crucial to prevent stale data issues
    from django.db import connection
    connection.close()  # Force close any open connections to ensure fresh data
    
    # Reload claim from database
    from claims.models import Claim
    try:
        claim_id = claim.id
        claim = Claim.objects.get(id=claim_id)
    except Exception as e:
        logger.error(f"Error reloading claim {claim_id}: {str(e)}")
    
    # Only create billing records for approved claims
    if claim.status != 'APPROVED':
        return {
            'success': False,
            'message': f"Not creating billing record - claim status is {claim.status}",
            'error': "Claim not approved"
        }
    
    # Check if billing record already exists for this claim
    existing_records = BillingRecord.objects.filter(claim_reference=claim.reference_number)
    if existing_records.exists():
        return {
            'success': True,
            'billing_record': existing_records.first(),
            'message': f"Using existing billing record for claim {claim.reference_number}"
        }
    
    # Calculate billing amount (using decided settlement amount if available)
    amount = 100.00  # Default fallback amount
    
    if hasattr(claim, 'decided_settlement_amount') and claim.decided_settlement_amount is not None:
        if float(claim.decided_settlement_amount) > 0:
            amount = float(claim.decided_settlement_amount)
    elif hasattr(claim, 'ml_prediction') and claim.ml_prediction and hasattr(claim.ml_prediction, 'settlement_amount'):
        if claim.ml_prediction.settlement_amount is not None and float(claim.ml_prediction.settlement_amount) > 0:
            amount = float(claim.ml_prediction.settlement_amount)
    elif hasattr(claim, 'amount') and claim.amount is not None:
        if float(claim.amount) > 0:
            amount = float(claim.amount)
    
    # Create unique invoice number with timestamp to ensure uniqueness
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
    invoice_number = f"BR-{claim.reference_number}-{timestamp}"
    
    # Default description
    description = f"Claim settlement for claim #{claim.reference_number}"
    
    # Default currency
    currency = 'USD'
    
    # Wrap the entire creation process in a transaction to ensure atomicity
    with transaction.atomic():
        try:
            # Check if user has an insurance company
            user = claim.user
            insurance_company = getattr(user, 'insurance_company', None)
            
            # If user doesn't have an insurance company, try to assign a random one
            if insurance_company is None:
                # Check if there are any active insurance companies
                companies = InsuranceCompany.objects.filter(is_active=True)
                if companies.exists():
                    # Assign the first available company
                    insurance_company = companies.first()
                    user.insurance_company = insurance_company
                    user.save(update_fields=['insurance_company'])
                    logger.info(f"Assigned insurance company {insurance_company.name} to user {user.email}")
            
            # Create the billing record with the insurance company (if available)
            billing_record = BillingRecord.objects.create(
                user=user,
                amount=amount,
                currency=currency,
                payment_status='PENDING',
                description=description,
                invoice_number=invoice_number,
                insurance_company=insurance_company,
                claim_reference=claim.reference_number,
                due_date=timezone.now().date() + timedelta(days=30)
            )
            
            logger.info(f"Successfully created billing record {billing_record.id} for claim {claim.reference_number}, amount={amount}")
            return {
                'success': True,
                'billing_record': billing_record,
                'message': f"Created new billing record for claim {claim.reference_number}"
            }
            
        except Exception as e:
            logger.error(f"Error creating billing record for claim {claim.reference_number}: {str(e)}")
            
            # Try one more time with simplified data as a fallback
            try:
                billing_record = BillingRecord.objects.create(
                    user=user,
                    amount=amount,
                    currency=currency,
                    payment_status='PENDING',
                    description=description,
                    invoice_number=invoice_number,
                    claim_reference=claim.reference_number,
                    due_date=timezone.now().date() + timedelta(days=30)
                )
                logger.info(f"Created simplified billing record {billing_record.id} as fallback")
                return {
                    'success': True,
                    'billing_record': billing_record,
                    'message': f"Created billing record with fallback method"
                }
            except Exception as e2:
                logger.error(f"Final error creating billing record for claim {claim.reference_number}: {str(e2)}")
                return {
                    'success': False,
                    'error': str(e2),
                    'message': f"Failed to create billing record after multiple attempts"
                }

def standardize_billing_records(billing_records):
    """
    Formats billing records into a standardized response format.
    
    Args:
        billing_records: A list of BillingRecord objects or a queryset
        
    Returns:
        dict: A standardized response with:
            - success (bool): Whether the operation was successful
            - count (int): Number of records
            - records (list): The formatted billing records
    """
    formatted_records = []
    
    for record in billing_records:
        formatted_record = {
            'id': record.id,
            'invoice_number': record.invoice_number,
            'amount': float(record.amount),
            'currency': record.currency,
            'payment_status': record.payment_status,
            'description': record.description or f"Claim settlement for {record.claim_reference}",
            'claim_reference': record.claim_reference,
            'created_at': record.created_at.isoformat(),
            'updated_at': record.updated_at.isoformat(),
            'paid_at': record.paid_at.isoformat() if record.paid_at else None,
            'due_date': record.due_date.isoformat() if record.due_date else None,
            'insurance_company': record.insurance_company.name if record.insurance_company else None
        }
        formatted_records.append(formatted_record)
    
    return {
        'success': True,
        'count': len(formatted_records),
        'records': formatted_records
    }