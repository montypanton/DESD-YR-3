# Registers ML-related models with the Django admin site.

from django.contrib import admin
from .models import MLModel, Prediction


class MLModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'version', 'model_type', 'created_by', 'created_at', 'is_active')
    list_filter = ('model_type', 'is_active', 'created_at')
    search_fields = ('name', 'version', 'description', 'created_by__email')
    readonly_fields = ('created_at', 'updated_at')


class PredictionAdmin(admin.ModelAdmin):
    list_display = ('id', 'model', 'user', 'status', 'created_at', 'processing_time')
    list_filter = ('status', 'created_at', 'model')
    search_fields = ('user__email', 'model__name', 'status')
    readonly_fields = ('created_at', 'processing_time')


admin.site.register(MLModel, MLModelAdmin)
admin.site.register(Prediction, PredictionAdmin)