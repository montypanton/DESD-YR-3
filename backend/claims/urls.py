from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClaimViewSet

router = DefaultRouter()
router.register(r'', ClaimViewSet, basename='claim')

urlpatterns = [
    path('', include(router.urls)),
]