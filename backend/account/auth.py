from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from .models import User

class EmailBackend(ModelBackend):
    """
    Custom authentication backend for email-based login.
    """
    def authenticate(self, request, email=None, password=None, **kwargs):
        try:
            # Try to find a user with the given email
            user = User.objects.get(email=email)
            
            # Check if the password is correct
            if user.check_password(password):
                return user
            return None
        except User.DoesNotExist:
            return None
            
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None