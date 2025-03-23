# Root URL configuration for routing requests to app-level URLs and admin site.

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api_interface.urls')),
    path('api/account/', include('account.urls')),
    path('api/ml/', include('ml_interface.urls')),
    path('api/finance/', include('finance.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)