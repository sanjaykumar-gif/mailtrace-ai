"""MailTrace AI — FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.include_router(router, prefix='/api')


@app.get('/')
def root():
    return {
        'name': 'MailTrace AI',
        'tagline': 'From Suspicious Email to Attack Campaign.',
        'docs': '/docs',
        'health': '/api/health',
    }
