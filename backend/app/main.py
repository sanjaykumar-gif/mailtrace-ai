"""MailTrace AI — FastAPI application entry point."""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Auto-load .env file if present
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_path)
    except ImportError:
        # Fallback basic .env loader if python-dotenv is not installed
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip()

from .analyzers.imap_watcher import imap_watcher
from .analyzers.pipeline import analyze_raw
from .api.routes import router

app = FastAPI(
    title='MailTrace AI',
    description='Explainable Email Threat Investigation & Attack Campaign '
                'Correlation Platform — SIH 2026 (SIH26106)',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Connect live IMAP watcher directly to analysis pipeline
imap_watcher.on_email_received = lambda raw_bytes, src: analyze_raw(raw_bytes, source=src)

# Auto-start IMAP watcher if credentials present in .env
imap_host = os.getenv('IMAP_SERVER', 'imap.gmail.com')
imap_user = os.getenv('IMAP_USER', '').strip()
imap_pass = os.getenv('IMAP_PASS', '').strip()
imap_port = int(os.getenv('IMAP_PORT', '993'))

if imap_user and imap_pass:
    print(f"[MailTrace AI] Auto-connecting live IMAP watcher for {imap_user}...")
    success, msg = imap_watcher.connect_and_start(
        host=imap_host,
        username=imap_user,
        password=imap_pass,
        port=imap_port,
        use_ssl=True,
    )
    print(f"[MailTrace AI] IMAP Status: {msg}")

app.include_router(router, prefix='/api')


@app.get('/')
def root():
    return {
        'name': 'MailTrace AI',
        'tagline': 'From Suspicious Email to Attack Campaign.',
        'docs': '/docs',
        'health': '/api/health',
        'imap_active': imap_watcher.is_connected,
    }

