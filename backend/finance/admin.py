from django.contrib import admin
from .models import BillingRecord, UsageStatistics


class BillingRecordAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'user', 'amount', 'currency', 'payment_status', 'created_at')
    list_filter = ('payment_status', 'currency', 'created_at')
    search_fields = ('invoice_number', 'user__email', 'description')
    readonly_fields = ('created_at', 'updated_at')


class UsageStatisticsAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'predictions_count', 'successful_predictions', 'billed_amount')
    list_filter = ('date',)
    search_fields = ('user__email',)
    readonly_fields = ('date',)


admin.site.register(BillingRecord, BillingRecordAdmin)
admin.site.register(UsageStatistics, UsageStatisticsAdmin)