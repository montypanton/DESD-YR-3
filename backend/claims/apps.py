from django.apps import AppConfig

class ClaimsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'claims'
    
    def ready(self):
        import claims.signals  # Import signals when app is ready