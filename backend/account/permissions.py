# Provides custom permission classes for role-based access control.

from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    message = 'Must be an admin user.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'ADMIN')


class IsMLEngineer(BasePermission):
    message = 'Must be an ML engineer.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'ML_ENGINEER')


class IsFinanceUser(BasePermission):
    message = 'Must be a finance team member.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'FINANCE')


class IsResourceOwner(BasePermission):
    message = 'You must be the owner of this resource.'

    def has_object_permission(self, request, view, obj):
        
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        elif hasattr(obj, 'id') and hasattr(request.user, 'id'):
            return obj.id == request.user.id
        return False


class AllowAutoApproval(BasePermission):
    """
    Permission class that allows all authenticated users to create and auto-approve claims.
    Use this to bypass role-specific restrictions for auto-approval flows.
    """
    message = 'Auto-approval requires an authenticated user.'
    
    def has_permission(self, request, view):
        # Any authenticated user can auto-approve claims
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        # Any authenticated user can interact with approved claims
        # Either own claims or, for finance/admin users, all claims
        if hasattr(obj, 'user'):
            if obj.user == request.user:
                return True
            if request.user.role in ['ADMIN', 'FINANCE']:
                return True
        return False