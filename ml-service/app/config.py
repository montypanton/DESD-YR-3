import os
from pathlib import Path
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Application settings
APP_NAME = "ML Service"
API_PREFIX = "/api/v1"
DEBUG = os.getenv("DEBUG", "False") == "True"
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = os.getenv("MODELS_DIR", str(BASE_DIR / "models"))
DEFAULT_MODEL_PATH = os.getenv("DEFAULT_MODEL_PATH", str(Path(MODELS_DIR) / "random_forest_model.pkl"))

# Make sure the models directory exists
os.makedirs(MODELS_DIR, exist_ok=True)

# Security settings - in a real application, these would be more robust
API_KEY = os.getenv("API_KEY", "default-dev-key")
API_KEY_NAME = "X-API-Key"
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "default-backend-key")

# CORS
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
ALLOWED_ORIGINS = [
    BACKEND_URL,
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Configure logging
logging.basicConfig(
    level=logging.INFO if not DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)