# App configuration class for the API interface module.

from django.apps import AppConfig


class ApiInterfaceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api_interface'