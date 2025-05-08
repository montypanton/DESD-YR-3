import logging
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from account.models import User
from finance.models import InsuranceCompany, BillingRate
from ml_interface.models import MLModel, Prediction

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Generate test Prediction data for Usage Analytics dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of predictions to generate'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to spread the predictions over'
        )
        parser.add_argument(
            '--company-id',
            type=int,
            help='Specific insurance company ID to use'
        )

    def handle(self, *args, **options):
        count = options['count']
        days = options['days']
        company_id = options.get('company_id')
        
        # Get or create ML model
        model = self._get_or_create_model()
        
        # Get company users
        company_users = self._get_company_users(company_id)
        
        if not company_users:
            self.stderr.write(self.style.ERROR('No company users found. Please create users with insurance companies first.'))
            return
            
        self.stdout.write(f'Found {len(company_users)} users across {len(set(u.insurance_company_id for u in company_users))} companies')
        
        # Generate predictions for past X days
        now = timezone.now()
        predictions_created = 0
        
        for i in range(count):
            # Random date within the past X days
            random_days = random.randint(0, days)
            random_date = now - timedelta(days=random_days)
            
            # Random user with company
            user = random.choice(company_users)
            
            # Random status with weight toward COMPLETED
            status = random.choices(
                ['COMPLETED', 'FAILED', 'PENDING'],
                weights=[0.85, 0.10, 0.05],
                k=1
            )[0]
            
            # Random processing time
            processing_time = random.uniform(0.5, 5.0) if status == 'COMPLETED' else None
            
            # Create prediction
            prediction = Prediction.objects.create(
                model=model,
                user=user,
                input_data={'incident_data': {'type': 'test', 'severity': random.randint(1, 5)}},
                output_data={'prediction': random.uniform(500, 5000), 'confidence': random.uniform(0.7, 0.99)},
                created_at=random_date,
                processing_time=processing_time,
                status=status,
                error_message=None if status != 'FAILED' else 'Test error message'
            )
            
            predictions_created += 1
            
            if predictions_created % 10 == 0:
                self.stdout.write(f'Created {predictions_created} predictions...')
                
        self.stdout.write(self.style.SUCCESS(f'Successfully created {predictions_created} predictions'))
        
    def _get_or_create_model(self):
        """Get or create a test ML model."""
        admin_user = User.objects.filter(role='ADMIN').first()
        
        if not admin_user:
            self.stderr.write(self.style.ERROR('No admin user found. Please create an admin user first.'))
            return None
            
        model, created = MLModel.objects.get_or_create(
            name='TestModel',
            version='1.0.0',
            defaults={
                'description': 'Test model for usage analytics',
                'model_type': 'regression',
                'input_format': {'incident_data': {'type': 'string', 'severity': 'number'}},
                'output_format': {'prediction': 'number', 'confidence': 'number'},
                'created_by': admin_user,
                'is_active': True,
                'model_file': None  # No actual file needed for test data
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created test ML model'))
        else:
            self.stdout.write('Using existing test ML model')
            
        return model
        
    def _get_company_users(self, company_id=None):
        """Get users with insurance companies."""
        # Base query - users with insurance companies assigned
        users = User.objects.filter(
            insurance_company__isnull=False,
            is_active=True
        )
        
        # Filter by specific company if requested
        if company_id:
            users = users.filter(insurance_company_id=company_id)
            
        # Get users list
        user_list = list(users)
        
        # If no users found, try to assign companies to some users
        if not user_list:
            self.stdout.write('No users with insurance companies found. Attempting to assign companies to users...')
            return self._assign_companies_to_users()
            
        return user_list
        
    def _assign_companies_to_users(self):
        """Assign insurance companies to users that don't have one."""
        # Get active companies
        companies = list(InsuranceCompany.objects.filter(is_active=True))
        
        if not companies:
            self.stderr.write(self.style.ERROR('No active insurance companies found. Please create insurance companies first.'))
            return []
            
        # Get users without insurance companies
        users = list(User.objects.filter(
            insurance_company__isnull=True,
            is_active=True
        )[:10])  # Limit to 10 users
        
        if not users:
            self.stderr.write(self.style.ERROR('No users without insurance companies found. Please create users first.'))
            return []
            
        # Assign companies to users
        updated_users = []
        for user in users:
            user.insurance_company = random.choice(companies)
            user.save()
            updated_users.append(user)
            self.stdout.write(f'Assigned {user.insurance_company.name} to user {user.email}')
            
        return updated_users