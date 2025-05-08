# Central configuration file for the Django project, including installed apps, middleware, and database setup.

import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent

# WARNING: secret key in .env + fallback key - keep secret :p
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default')

# WARNING: don't run with debug turned on
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# aplication definitions
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # third-party apps
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    
    # local apps
    'core',
    'account',
    'api_interface.apps.ApiInterfaceConfig',
    'ml_interface',
    'finance',
    'claims',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.ActivityLogMiddleware',  
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# db
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME', 'desd_db'),
        'USER': os.getenv('DB_USER', 'desd_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'desd_pass_123'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}


# custom user model
AUTH_USER_MODEL = 'account.User'

# password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]



# time zones / etc...
LANGUAGE_CODE = 'en-gb'
TIME_ZONE = 'Europe/London'
USE_I18N = True
USE_TZ = True



# tells Django where to store static files 
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Ensure model files are copied to media directory
if not os.path.exists(os.path.join(MEDIA_ROOT, 'ml_models')):
    os.makedirs(os.path.join(MEDIA_ROOT, 'ml_models'), exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



# default behaviour for API security 
# JWT, tokens for login / permissions 
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}



# JWT: controls tokens, scurity rules 
# settings control how tokens work and data they carry
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}



# needed to stop security blocks and allows communication between 
# backend and frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://frontend:3000",  
]

CORS_ALLOW_CREDENTIALS = True

# Allow all headers to fix CORS issues with custom headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-debug-mode',
]

# ML Model Settings
ML_MODELS_DIR = os.path.join(BASE_DIR.parent, 'DESD-YR-3', 'models')
DEFAULT_MODEL_PATH = os.path.join(ML_MODELS_DIR, 'random_forest_model.pkl')

# log-in configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'ml_verbose': {
            'format': '[ML] {levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/django.log'),
            'formatter': 'verbose',
        },
        'ml_file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs/ml.log'),
            'formatter': 'ml_verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'user_activity': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
        'ml_processor': {
            'handlers': ['ml_file', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ensures logs directory 
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)