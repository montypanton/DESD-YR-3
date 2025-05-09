# Routes ML-related API endpoints to their corresponding views.

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .consolidated_views import MLModelViewSet, PredictionViewSet, MLPerformanceViewSet

router = DefaultRouter()
router.register(r'models', MLModelViewSet)
router.register(r'predictions', PredictionViewSet)
router.register(r'performance', MLPerformanceViewSet, basename='performance')

urlpatterns = [
    path('', include(router.urls)),
]