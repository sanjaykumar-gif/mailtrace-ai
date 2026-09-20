"""
MailTrace AI — FastAPI Enterprise Application Entry Point.
Explainable Email Threat Investigation & Attack Campaign Correlation Platform.
"""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .analyzers.imap_watcher import imap_watcher
from .analyzers.pipeline import analyze_raw
from .api.routes import router
from .core.config import settings
from .core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for clean startup and shutdown sequences."""
    logger.info(f"=== Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.APP_ENV}) ===")
    
    # Connect live IMAP watcher directly to analysis pipeline
    imap_watcher.on_email_received = lambda raw_bytes, src: analyze_raw(raw_bytes, source=src)
    
    # Auto-start IMAP watcher if credentials present in environment / .env
    if settings.IMAP_USER and settings.IMAP_PASS:
        logger.info(f"[IMAP] Auto-connecting live mailbox watcher for {settings.IMAP_USER}...")
        success, msg = imap_watcher.connect_and_start(
            host=settings.IMAP_SERVER,
            username=settings.IMAP_USER,
            password=settings.IMAP_PASS,
            port=settings.IMAP_PORT,
            use_ssl=settings.IMAP_SSL,
            poll_interval=settings.IMAP_POLL_INTERVAL,
        )
        logger.info(f"[IMAP] Watcher startup status: {msg}")

    yield

    # Clean shutdown
    logger.info(f"=== Shutting down {settings.APP_NAME} ===")
    if imap_watcher.is_running:
        logger.info("[IMAP] Stopping background IMAP watcher...")
        imap_watcher.stop()


app = FastAPI(
    title=settings.APP_NAME,
    description="Explainable Email Threat Investigation & Attack Campaign Correlation Platform "
                "— Real-time header forensics, SPF/DKIM/DMARC matrix, and multi-wave clustering.",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Correlation ID & Security Headers Middleware
@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.perf_counter()
    
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"[{req_id}] Unhandled Exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred. Please try again.",
                    "details": str(exc) if settings.DEBUG else None
                },
                "request_id": req_id
            }
        )
    
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
    
    if request.url.path not in ("/api/health", "/api/campaigns", "/api/imap/status"):
        logger.info(f"[{req_id}] {request.method} {request.url.path} -> {response.status_code} ({elapsed_ms:.1f}ms)")
        
    return response


# Register API Router
app.include_router(router, prefix=settings.API_PREFIX)


@app.get("/", tags=["System"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "tagline": "From Suspicious Email to Attack Campaign.",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
        "imap_active": imap_watcher.is_running,
    }
