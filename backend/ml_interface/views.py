# Implements views to manage communication with the ML model and return results.

from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from .models import MLModel, Prediction
from .serializers import MLModelSerializer, PredictionSerializer
from account.permissions import IsAdminUser, IsMLEngineer




class MLModelViewSet(viewsets.ModelViewSet):
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):

        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, (IsMLEngineer | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):

        if self.request.user.is_admin or self.request.user.is_ml_engineer:
            return MLModel.objects.all()
        return MLModel.objects.filter(is_active=True)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        model = self.get_object()
        model.is_active = True
        model.save()
        return Response({"status": "model activated"})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        model = self.get_object()
        model.is_active = False
        model.save()
        return Response({"status": "model deactivated"})







class PredictionViewSet(viewsets.ModelViewSet):
    queryset = Prediction.objects.all()
    serializer_class = PredictionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['destroy']:
            self.permission_classes = [IsAuthenticated, (IsMLEngineer | IsAdminUser)]
        return super().get_permissions()
    
    def get_queryset(self):
        
        if self.request.user.is_admin or self.request.user.is_ml_engineer:
            return Prediction.objects.all()
        return Prediction.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_predictions(self, request):
        queryset = Prediction.objects.filter(user=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)