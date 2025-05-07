import logging
from django.core.management.base import BaseCommand, CommandError
from claims.models import Claim
from finance.api_utils import ensure_billing_record_for_approved_claim

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate billing records for approved claims that don\'t have them yet'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            help='Do a dry run without actually creating billing records',
        )
        parser.add_argument(
            '--company-id',
            dest='company_id',
            type=int,
            help='Only process claims from users of a specific insurance company',
        )
        parser.add_argument(
            '--limit',
            dest='limit',
            type=int,
            help='Limit the number of claims to process',
        )
    
    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        company_id = options.get('company_id')
        limit = options.get('limit')
        
        # Get all approved claims
        claims = Claim.objects.filter(
            status='APPROVED', 
            reviewed_by__isnull=False
        ).select_related('user', 'user__insurance_company')
        
        # Filter by company if specified
        if company_id:
            claims = claims.filter(user__insurance_company_id=company_id)
            self.stdout.write(f"Filtering claims for company ID: {company_id}")
        
        # Apply limit if specified
        if limit:
            claims = claims[:limit]
            self.stdout.write(f"Limiting to {limit} claims")
            
        total_claims = claims.count()
        self.stdout.write(f"Found {total_claims} approved claims")
        
        # Track statistics
        created_count = 0
        already_exists_count = 0
        error_count = 0
        
        # Process each claim
        for i, claim in enumerate(claims, 1):
            self.stdout.write(f"Processing claim {i}/{total_claims}: {claim.reference_number}")
            
            # Check if this is a dry run
            if dry_run:
                self.stdout.write(f"  DRY RUN: Would have created billing record for claim {claim.reference_number}")
                continue
                
            # Try to create a billing record
            try:
                result = ensure_billing_record_for_approved_claim(claim)
                
                if not result['success']:
                    self.stdout.write(self.style.ERROR(f"  Error: {result['message']}"))
                    error_count += 1
                    continue
                    
                if 'existing billing record' in result['message']:
                    self.stdout.write(self.style.WARNING(f"  {result['message']}"))
                    already_exists_count += 1
                else:
                    self.stdout.write(self.style.SUCCESS(f"  {result['message']}"))
                    created_count += 1
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Error processing claim {claim.reference_number}: {str(e)}"))
                error_count += 1
        
        # Print summary
        self.stdout.write("\nSummary:")
        self.stdout.write(f"Total claims processed: {total_claims}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No billing records were actually created"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Billing records created: {created_count}"))
            self.stdout.write(self.style.WARNING(f"Billing records already existed: {already_exists_count}"))
            self.stdout.write(self.style.ERROR(f"Errors: {error_count}"))