"""MailTrace AI — Core Configuration & Environment Settings."""

import os
from pathlib import Path
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"

# Auto-load .env file if present
if ENV_FILE.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=ENV_FILE)
    except ImportError:
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())


class Settings(BaseModel):
    # Application Metadata
    APP_NAME: str = "MailTrace AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    
    # API & Server Configuration
    API_PREFIX: str = "/api"
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Security & Limits
    MAX_UPLOAD_BYTES: int = Field(default=int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024))), description="5 MB upload cap")
    CORS_ORIGINS: list[str] = ["*"]
    
    # Live IMAP Ingestion Defaults
    IMAP_SERVER: str = os.getenv("IMAP_SERVER", "imap.gmail.com")
    IMAP_USER: str = os.getenv("IMAP_USER", "").strip()
    IMAP_PASS: str = os.getenv("IMAP_PASS", "").strip()
    IMAP_PORT: int = int(os.getenv("IMAP_PORT", "993"))
    IMAP_SSL: bool = os.getenv("IMAP_SSL", "true").lower() in ("true", "1", "yes")
    IMAP_POLL_INTERVAL: int = int(os.getenv("IMAP_POLL_INTERVAL", "15"))  # seconds
    
    # External Threat Intelligence
    VT_API_KEY: str = os.getenv("VT_API_KEY", "").strip()
    DNS_TIMEOUT_SECONDS: float = float(os.getenv("DNS_TIMEOUT_SECONDS", "2.5"))


# Instantiate singleton settings
settings = Settings()
