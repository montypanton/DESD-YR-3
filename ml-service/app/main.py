from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import logging

from app.config import API_PREFIX, APP_NAME, DEBUG, ALLOWED_ORIGINS, logger
from app.api.routes import router as api_router

# Create FastAPI app
app = FastAPI(
    title=APP_NAME,
    description="Machine Learning service for insurance claims prediction",
    version="1.0.0",
    debug=DEBUG,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
    return response

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "detail": str(exc)},
    )

# Include API routes
app.include_router(api_router, prefix=API_PREFIX)

# Root endpoint
@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to the ML Service API",
        "documentation": "/docs",
        "health": f"{API_PREFIX}/health",
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {APP_NAME}")
    # Make sure the models directory exists
    os.makedirs(os.path.dirname(os.environ.get("MODELS_DIR", "./models")), exist_ok=True)
    
# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {APP_NAME}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)