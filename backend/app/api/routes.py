"""
MailTrace AI — Enterprise API Routing & Controller Layer.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse

from ..analyzers import correlation
from ..analyzers.imap_watcher import imap_watcher
from ..analyzers.live_dns import get_live_dns_intel, get_live_ip_intel
from ..analyzers.pipeline import (
    MAX_INPUT_BYTES,
    analyze_raw,
    campaign_detail,
    summarize,
)
from ..core.logging import logger
from ..models.schemas import (
    AnalysisDetail,
    AnalysisSummary,
    CampaignDetail,
    CampaignSummary,
    DnsLookupRequest,
    HealthResponse,
    ImapConnectRequest,
    StatsResponse,
)
from ..storage.store import store

router = APIRouter()

SAMPLE_DIR = Path(__file__).resolve().parents[3] / 'sample_emails'
SAMPLE_NAME_RE = re.compile(r'^[A-Za-z0-9_\-.]+\.eml$')


# ======================================================================
# System Health & Operational Telemetry
# ======================================================================

@router.get(
    '/health',
    response_model=HealthResponse,
    tags=["System"],
    summary="System health check & engine telemetry"
)
def health():
    analyses = store.load_analyses()
    campaigns = store.load_campaigns()
    return {
        'status': 'ok',
        'engine': 'MailTrace AI live analysis engine',
        'version': '1.0.0',
        'analyses_stored': len(analyses),
        'campaigns_count': len(campaigns),
        'imap_active': imap_watcher.is_running,
        'uptime_seconds': 0.0,
    }


# ======================================================================
# Live IMAP Mailbox Watcher Endpoints
# ======================================================================

@router.post(
    '/imap/connect',
    tags=["Live Ingestion"],
    summary="Connect and start background IMAP watcher"
)
def imap_connect(req: ImapConnectRequest):
    ok, msg = imap_watcher.connect_and_start(
        host=req.host,
        username=req.username,
        password=req.password,
        port=req.port,
        use_ssl=req.use_ssl,
        folder=req.folder,
        poll_interval=req.poll_interval,
        only_unread=req.only_unread,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {'success': True, 'message': msg, 'status': imap_watcher.get_status()}


@router.get(
    '/imap/status',
    tags=["Live Ingestion"],
    summary="Get current IMAP watcher telemetry"
)
def imap_status():
    return imap_watcher.get_status()


@router.post(
    '/imap/sync',
    tags=["Live Ingestion"],
    summary="Force an immediate IMAP mailbox sync cycle"
)
def imap_sync():
    res = imap_watcher.sync_now()
    if not res.get('success'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get('message', 'Sync failed')
        )
    return res


@router.post(
    '/imap/disconnect',
    tags=["Live Ingestion"],
    summary="Stop background IMAP watcher"
)
def imap_disconnect():
    imap_watcher.stop()
    return {'success': True, 'message': 'Live mailbox monitoring stopped.'}


# ======================================================================
# Live DNS & Threat Intelligence Endpoints
# ======================================================================

@router.post(
    '/dns/lookup',
    tags=["Intelligence"],
    summary="Query live DNS and origin IP intelligence"
)
def dns_lookup(req: DnsLookupRequest):
    dns_intel = get_live_dns_intel(req.domain)
    ip_intel = get_live_ip_intel(req.ip) if req.ip else None
    return {'domain_intel': dns_intel, 'ip_intel': ip_intel}


# ======================================================================
# Analysis Endpoints
# ======================================================================

@router.post(
    '/analyze',
    tags=["Analysis"],
    summary="Analyze pasted raw RFC email text"
)
def analyze(content: str = Body(..., embed=True)):
    try:
        return analyze_raw(content.encode('utf-8', errors='replace'), source='paste')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(f"[API] Text analysis failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Analysis failed safely: {exc}'
        )


@router.post(
    '/analyze/upload',
    tags=["Analysis"],
    summary="Analyze uploaded .EML / .MSG file"
)
async def analyze_upload(file: UploadFile = File(...)):
    name = file.filename or 'upload.eml'
    if not name.lower().endswith(('.eml', '.txt', '.msg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Only .eml / .txt email files are accepted.'
        )
    data = await file.read()
    if len(data) > MAX_INPUT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail='File exceeds the 2 MB upload limit.'
        )
    try:
        return analyze_raw(data, source=f'upload:{name}')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(f"[API] Upload analysis failed for {name}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Analysis failed safely: {exc}'
        )


# ======================================================================
# Test Samples Endpoints
# ======================================================================

def _safe_sample_path(filename: str) -> Path:
    if not SAMPLE_NAME_RE.match(filename):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid sample filename.')
    path = (SAMPLE_DIR / filename).resolve()
    if not str(path).startswith(str(SAMPLE_DIR.resolve())) or not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Sample not found.')
    return path


@router.get(
    '/samples',
    tags=["Samples"],
    summary="List available demo sample emails"
)
def list_samples():
    out = []
    descriptions = {
        '1_safe_notice.eml': 'Legitimate college placement notice — expect SAFE.',
        '2_phishing_credential.eml': 'Credential phishing (PayPal look-alike) — expect CRITICAL.',
        '3_impersonation_bec.eml': 'Executive impersonation / BEC wire-fraud — expect HIGH.',
        '4_invoice_fraud.eml': 'Fake invoice with risky attachment + shortener — expect HIGH.',
        '5_campaign_support.eml': 'Campaign email 1 of 3 (shared infrastructure).',
        '6_campaign_billing.eml': 'Campaign email 2 of 3 (shared infrastructure).',
        '7_campaign_account.eml': 'Campaign email 3 of 3 (shared infrastructure).',
    }
    if SAMPLE_DIR.exists():
        for p in sorted(SAMPLE_DIR.glob('*.eml')):
            out.append({
                'filename': p.name,
                'description': descriptions.get(p.name, 'Demo sample email.')
            })
    return {'samples': out}


@router.get(
    '/samples/content/{filename}',
    tags=["Samples"],
    summary="Get raw content of a demo sample"
)
def sample_content(filename: str):
    path = _safe_sample_path(filename)
    return {'filename': filename, 'content': path.read_text(encoding='utf-8', errors='replace')}


@router.post(
    '/analyze/sample/{filename}',
    tags=["Samples"],
    summary="Analyze a designated demo sample email"
)
def analyze_sample(filename: str):
    path = _safe_sample_path(filename)
    try:
        return analyze_raw(path.read_bytes(), source=f'sample:{filename}')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    '/samples/load',
    tags=["Samples"],
    summary="Batch load and analyze all demo sample emails"
)
def load_all_samples():
    results = []
    if not SAMPLE_DIR.exists():
        return {'loaded': 0, 'results': []}
    for p in sorted(SAMPLE_DIR.glob('*.eml')):
        try:
            r = analyze_raw(p.read_bytes(), source=f'sample:{p.name}')
            results.append(summarize(r))
        except Exception as exc:
            results.append({'filename': p.name, 'error': str(exc)})
    return {'loaded': len(results), 'results': results}


# ======================================================================
# Historical Analyses Endpoints
# ======================================================================

@router.get(
    '/analyses',
    tags=["History"],
    summary="List all historical email analyses"
)
def list_analyses():
    analyses = store.load_analyses()
    analyses.sort(key=lambda a: a.get('timestamp', ''), reverse=True)
    return {'count': len(analyses), 'analyses': [summarize(a) for a in analyses]}


@router.get(
    '/analyses/{analysis_id}',
    tags=["History"],
    summary="Get deep forensic record for an analysis"
)
def get_analysis(analysis_id: str):
    a = store.get_analysis(analysis_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Analysis not found.')
    out = dict(a)
    
    # attach related campaign activity
    related = []
    campaign = None
    if a.get('campaign_id'):
        campaign = store.get_campaign(a['campaign_id'])
    for rid in a.get('related_ids', []) or []:
        ra = store.get_analysis(rid)
        if ra:
            related.append({
                'id': ra['id'],
                'subject': ra.get('subject', '(No Subject)'),
                'sender': ra.get('sender'),
                'risk_score': ra.get('risk_score', 0),
                'classification': ra.get('classification', 'SAFE')
            })
    out['related'] = related
    if campaign:
        out['campaign'] = {
            'id': campaign['id'],
            'title': campaign['title'],
            'confidence': campaign['confidence'],
            'member_count': campaign['member_count'],
            'disclaimer': campaign['disclaimer']
        }
    return out


@router.delete(
    '/analyses/{analysis_id}',
    tags=["History"],
    summary="Delete an analysis and recompute campaigns"
)
def delete_analysis(analysis_id: str):
    if not store.delete_analysis(analysis_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Analysis not found.')
    correlation.recompute_campaigns(store)
    return {'deleted': True, 'id': analysis_id}


# ======================================================================
# Dashboard Stats & Aggregations
# ======================================================================

@router.get(
    '/stats',
    response_model=StatsResponse,
    tags=["Dashboard"],
    summary="Aggregated SOC statistics and risk score distribution"
)
def stats():
    analyses = store.load_analyses()
    campaigns = store.load_campaigns()
    dist = {'SAFE': 0, 'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'CRITICAL': 0}
    for a in analyses:
        cls = a.get('classification', 'SAFE')
        dist[cls] = dist.get(cls, 0) + 1
    return {
        'total': len(analyses),
        'critical': dist.get('CRITICAL', 0),
        'high': dist.get('HIGH', 0),
        'medium': dist.get('MEDIUM', 0),
        'low': dist.get('LOW', 0),
        'safe': dist.get('SAFE', 0),
        'campaigns': len(campaigns),
        'distribution': [{'name': k, 'value': v} for k, v in dist.items()],
        'imap_active': imap_watcher.is_running,
    }


# ======================================================================
# Attack DNA & Campaign Clusters
# ======================================================================

@router.get(
    '/campaigns',
    tags=["Campaigns"],
    summary="List all correlated attack campaigns"
)
def list_campaigns():
    campaigns = store.load_campaigns()
    out = []
    for c in campaigns:
        summaries = []
        for mid in c.get('member_ids', []):
            a = store.get_analysis(mid)
            if a:
                summaries.append({
                    'id': a['id'],
                    'subject': a.get('subject', '(No Subject)'),
                    'sender': a.get('sender'),
                    'risk_score': a.get('risk_score', 0),
                    'classification': a.get('classification', 'SAFE')
                })
        item = {
            k: c[k] for k in ('id', 'title', 'confidence', 'member_count',
                              'shared_indicators', 'disclaimer', 'created_at')
            if k in c
        }
        item['members'] = summaries
        out.append(item)
    return {'count': len(out), 'campaigns': out}


@router.get(
    '/campaigns/{campaign_id}',
    tags=["Campaigns"],
    summary="Get full Attack DNA graph and cluster details"
)
def get_campaign(campaign_id: str):
    c = store.get_campaign(campaign_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Campaign not found.')
    return campaign_detail(c)


# ======================================================================
# Workspace Maintenance
# ======================================================================

@router.post(
    '/reset',
    tags=["System"],
    summary="Clear all analyses and campaign clusters"
)
def reset():
    store.clear()
    return {'cleared': True}
