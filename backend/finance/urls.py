# Maps HTTP routes to finance-related views for API access.

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BillingRecordViewSet, UsageStatisticsViewSet, 
    BillingDashboardView, UserBillingStatsView
)

router = DefaultRouter()
router.register(r'billing', BillingRecordViewSet)
router.register(r'usage-stats', UsageStatisticsViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', BillingDashboardView.as_view(), name='billing-dashboard'),
    path('user-stats/', UserBillingStatsView.as_view(), name='user-billing-stats'),
    path('user-stats/<int:user_id>/', UserBillingStatsView.as_view(), name='user-billing-stats-detail'),
]