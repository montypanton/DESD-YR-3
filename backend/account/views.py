# Implements the logic for user registration, login, and profile-related API views.

from django.contrib.auth import login, logout
from django.utils import timezone
from rest_framework import status, permissions, viewsets, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, ActivityLog
from .serializers import (
    UserSerializer, UserDetailSerializer, RegisterSerializer, LoginSerializer,
    PasswordChangeSerializer, ProfileUpdateSerializer, ActivityLogSerializer
)
from .permissions import IsAdminUser, IsMLEngineer, IsFinanceUser


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        
        user.last_login = timezone.now()
        user.save()
        
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            
            refresh_token = request.data.get('refresh')
            if refresh_token:
                
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({"success": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            
            if not request.user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            
            
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            return Response({"success": "Password updated successfully"}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]  # Allow all authenticated users initially
    serializer_class = UserDetailSerializer
    
    def get_permissions(self):
        """
        Override to set custom permissions for different actions
        - List/Create/Update/Delete: Admin only
        - Retrieve (detail view): Admin or Finance users
        """
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        else:  # For 'retrieve' and custom actions
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        # Admin users can see all users
        if self.request.user.is_admin or self.request.user.is_superuser:
            return User.objects.all()
        # Finance users can see all users for claim processing
        elif hasattr(self.request.user, 'is_finance') and self.request.user.is_finance:
            return User.objects.all()
        # Regular users can only see themselves
        return User.objects.filter(id=self.request.user.id)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({"status": "user activated"})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({"status": "user deactivated"})
    
    @action(detail=True, methods=['post'])
    def delete_user(self, request, pk=None):
        user = self.get_object()
        
        # Don't allow users to delete themselves
        if user.id == request.user.id:
            return Response(
                {"error": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Create activity log before deleting user
            ActivityLog.objects.create(
                user=request.user,
                action="deleted",
                resource_type="user",
                resource_id=user.id,
                additional_data={"deleted_user": user.email, "deleted_by": request.user.email}
            )
            
            username = user.email
            
            # Manually delete related objects from models that may have foreign key constraints
            # This is a safer approach than relying on CASCADE which might fail if tables don't exist
            try:
                # Use raw SQL to delete any entries from billing_records if the table exists
                from django.db import connection
                with connection.cursor() as cursor:
                    # Check if the table exists first
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM information_schema.tables 
                        WHERE table_name = 'finance_billingrecord'
                        AND table_schema = DATABASE()
                    """)
                    if cursor.fetchone()[0] > 0:
                        # Table exists, delete related records
                        cursor.execute("DELETE FROM finance_billingrecord WHERE user_id = %s", [user.id])
            except Exception as e:
                # Log but continue if there's an issue with this specific operation
                print(f"Warning: Could not clean up billing records: {str(e)}")
            
            # Now safely delete the user
            user.delete()
            
            return Response(
                {"success": f"User {username} has been permanently deleted"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            # Log the error for debugging
            print(f"Error deleting user: {str(e)}")
            return Response(
                {"error": "An error occurred while deleting the user."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def approve_user(self, request, pk=None):
        user = self.get_object()
        
        # Check if user is pending approval
        if user.approval_status != 'PENDING':
            return Response(
                {"error": "This user is not pending approval."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user.approval_status = 'APPROVED'
        user.save()
        
        # Create activity log for the approval
        ActivityLog.objects.create(
            user=request.user,
            action="approved",
            resource_type="user",
            resource_id=user.id,
            additional_data={"approved_user": user.email, "approved_by": request.user.email}
        )
        
        return Response({"status": "User approved successfully"}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject_user(self, request, pk=None):
        user = self.get_object()
        
        # Check if user is pending approval
        if user.approval_status != 'PENDING':
            return Response(
                {"error": "This user is not pending approval."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user.approval_status = 'REJECTED'
        user.save()
        
        # Create activity log for the rejection
        ActivityLog.objects.create(
            user=request.user,
            action="rejected",
            resource_type="user",
            resource_id=user.id,
            additional_data={"rejected_user": user.email, "rejected_by": request.user.email}
        )
        
        return Response({"status": "User rejected successfully"}, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminUser])
    def pending_approval(self, request):
        """Returns a list of users pending approval"""
        queryset = User.objects.filter(approval_status='PENDING')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all().order_by('-timestamp')  # Order by newest first
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ActivityLog.objects.all().order_by('-timestamp')
        
        # Check if user is admin
        if not self.request.user.is_admin and not self.request.user.is_superuser:
            queryset = queryset.filter(user=self.request.user)
        
        # Handle filtering parameters
        user_id = self.request.query_params.get('user')
        action = self.request.query_params.get('action')
        resource_type = self.request.query_params.get('resource_type')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if user_id:
            queryset = queryset.filter(user__id=user_id)
        if action:
            queryset = queryset.filter(action=action)
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
            
        # Handle limit parameter (for dashboard's recent activity)
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except (ValueError, TypeError):
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        queryset = ActivityLog.objects.filter(user=request.user).order_by('-timestamp')
        
        # Handle limit parameter
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except (ValueError, TypeError):
                pass
                
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)