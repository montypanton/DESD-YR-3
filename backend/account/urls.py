# Routes incoming API requests to the appropriate account-related views.

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, ProfileView, 
    ChangePasswordView, UserViewSet, ActivityLogViewSet
)


router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'activity-logs', ActivityLogViewSet)

urlpatterns = [
    
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    
    path('', include(router.urls)),
]