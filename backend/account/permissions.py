from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allows access only to admin users.
    """
    message = 'Must be an admin user.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'ADMIN')


class IsMLEngineer(BasePermission):
    """
    Allows access only to ML engineer users.
    """
    message = 'Must be an ML engineer.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'ML_ENGINEER')


class IsFinanceUser(BasePermission):
    """
    Allows access only to finance team users.
    """
    message = 'Must be a finance team member.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'FINANCE')


class IsResourceOwner(BasePermission):
    """
    Allows access only to the owner of a resource.
    """
    message = 'You must be the owner of this resource.'

    def has_object_permission(self, request, view, obj):
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        # If no user field, check if the object is a user instance
        elif hasattr(obj, 'id') and hasattr(request.user, 'id'):
            return obj.id == request.user.id
        return False