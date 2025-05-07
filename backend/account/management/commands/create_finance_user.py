from django.core.management.base import BaseCommand
from account.models import User
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Creates a finance user for the system'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email for the finance user')
        parser.add_argument('--password', type=str, help='Password for the finance user')
        parser.add_argument('--first_name', type=str, help='First name')
        parser.add_argument('--last_name', type=str, help='Last name')

    def handle(self, *args, **options):
        email = options['email'] or input('Enter email for finance user: ')
        password = options['password'] or input('Enter password for finance user: ')
        first_name = options['first_name'] or input('Enter first name: ')
        last_name = options['last_name'] or input('Enter last name: ')
        
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User with email {email} already exists'))
            return
        
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='FINANCE',
            is_active=True
        )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created finance user: {user.email}'))