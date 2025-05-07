import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from finance.models import InsuranceCompany, BillingRate
from account.models import User

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Create default billing rates for active insurance companies if they don\'t exist'
    
    def handle(self, *args, **options):
        admin_user = User.objects.filter(role='ADMIN').first()
        if not admin_user:
            self.stdout.write(self.style.ERROR('No admin user found. Please create an admin user first.'))
            return
            
        # Get all active insurance companies
        companies = InsuranceCompany.objects.filter(is_active=True)
        self.stdout.write(f'Found {companies.count()} active insurance companies')
        
        companies_with_rates = 0
        companies_created = 0
        
        for company in companies:
            # Check if company already has an active billing rate
            existing_rate = BillingRate.objects.filter(
                insurance_company=company,
                is_active=True
            ).first()
            
            if existing_rate:
                self.stdout.write(f'Company {company.name} already has active rate: £{existing_rate.rate_per_claim}')
                companies_with_rates += 1
                continue
                
            # Create default rate
            default_rate = 3.00  # £3.00 per claim
            
            # Create new billing rate
            BillingRate.objects.create(
                insurance_company=company,
                rate_per_claim=default_rate,
                effective_from=timezone.now().date(),
                is_active=True,
                created_by=admin_user
            )
            
            self.stdout.write(self.style.SUCCESS(f'Created default billing rate for {company.name}: £{default_rate}'))
            companies_created += 1
        
        # Summary
        self.stdout.write('=' * 50)
        self.stdout.write(f'Total companies: {companies.count()}')
        self.stdout.write(f'Companies with existing rates: {companies_with_rates}')
        self.stdout.write(f'Companies with new rates created: {companies_created}')