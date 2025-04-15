from django.contrib import admin
from .models import Claim, MLPrediction

@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ('reference_number', 'user', 'title', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference_number', 'user__email', 'title', 'description')
    readonly_fields = ('reference_number', 'created_at', 'updated_at')

@admin.register(MLPrediction)
class MLPredictionAdmin(admin.ModelAdmin):
    list_display = ('id', 'settlement_amount', 'confidence_score', 'created_at')
    list_filter = ('created_at',)