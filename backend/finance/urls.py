# Maps HTTP routes to finance-related views for API access.

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BillingRecordViewSet, UsageStatisticsViewSet, 
    BillingDashboardView, UserBillingStatsView,
    InsuranceCompanyViewSet, InvoiceViewSet, InvoicingStatsView,
    PublicInsuranceCompanyList, BillingRateViewSet,
    UsageAnalyticsView, UsageSummaryView, ExportPredictionsView
)
from claims.views import ClaimViewSet

router = DefaultRouter()
router.register(r'billing', BillingRecordViewSet)
router.register(r'usage-stats', UsageStatisticsViewSet)
router.register(r'insurance-companies', InsuranceCompanyViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'claims', ClaimViewSet, basename='finance-claims')
router.register(r'billing-rates', BillingRateViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', BillingDashboardView.as_view(), name='billing-dashboard'),
    path('user-stats/', UserBillingStatsView.as_view(), name='user-billing-stats'),
    path('user-stats/<int:user_id>/', UserBillingStatsView.as_view(), name='user-billing-stats-detail'),
    path('invoicing-stats/', InvoicingStatsView.as_view(), name='invoicing-stats'),
    
    # Analytics endpoints
    path('usage-analytics/', UsageAnalyticsView.as_view(), name='usage-analytics'),
    path('usage-summary/', UsageSummaryView.as_view(), name='usage-summary'),
    path('export-predictions/', ExportPredictionsView.as_view(), name='export-predictions'),
    
    # Public endpoint for insurance companies - doesn't require authentication
    path('public/insurance-companies/', PublicInsuranceCompanyList.as_view(), name='public-insurance-companies'),
]