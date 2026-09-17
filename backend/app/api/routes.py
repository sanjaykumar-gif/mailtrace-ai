"""FastAPI routes for MailTrace AI."""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, Body, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..analyzers import correlation
from ..analyzers.imap_watcher import imap_watcher
from ..analyzers.live_dns import get_live_dns_intel, get_live_ip_intel
from ..analyzers.pipeline import (MAX_INPUT_BYTES, analyze_raw, campaign_detail,
                                  summarize)
from ..storage.store import store

router = APIRouter()

SAMPLE_DIR = Path(__file__).resolve().parents[3] / 'sample_emails'
SAMPLE_NAME_RE = re.compile(r'^[A-Za-z0-9_\-.]+\.eml$')


class ImapConnectRequest(BaseModel):
    host: str
    username: str
    password: str
    port: int = 993
    use_ssl: bool = True
    folder: str = 'INBOX'
    poll_interval: int = 15
    only_unread: bool = False


class DnsLookupRequest(BaseModel):
    domain: str
    ip: str | None = None


@router.get('/health')
def health():
    return {
        'status': 'ok',
        'engine': 'MailTrace AI live analysis engine',
        'analyses_stored': len(store.load_analyses()),
        'imap_active': imap_watcher.is_running,
    }


# ======================================================================
# Live IMAP Mailbox Watcher Endpoints
# ======================================================================

@router.post('/imap/connect')
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
        raise HTTPException(status_code=400, detail=msg)
    return {'success': True, 'message': msg, 'status': imap_watcher.get_status()}


@router.get('/imap/status')
def imap_status():
    return imap_watcher.get_status()


@router.post('/imap/sync')
def imap_sync():
    res = imap_watcher.sync_now()
    if not res.get('success'):
        raise HTTPException(status_code=400, detail=res.get('message', 'Sync failed'))
    return res


@router.post('/imap/disconnect')
def imap_disconnect():
    imap_watcher.stop()
    return {'success': True, 'message': 'Live mailbox monitoring stopped.'}


# ======================================================================
# Live DNS & Threat Intelligence Endpoints
# ======================================================================

@router.post('/dns/lookup')
def dns_lookup(req: DnsLookupRequest):
    dns_intel = get_live_dns_intel(req.domain)
    ip_intel = get_live_ip_intel(req.ip) if req.ip else None
    return {'domain_intel': dns_intel, 'ip_intel': ip_intel}


# ======================================================================
# Analysis Endpoints
# ======================================================================

@router.post('/analyze')
def analyze(content: str = Body(..., embed=True)):
    try:
        return analyze_raw(content.encode('utf-8', errors='replace'), source='paste')
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500,
                            detail=f'Analysis failed safely: {exc}')


@router.post('/analyze/upload')
async def analyze_upload(file: UploadFile):
    name = file.filename or 'upload.eml'
    if not name.lower().endswith(('.eml', '.txt', '.msg')):
        raise HTTPException(status_code=400,
                            detail='Only .eml / .txt email files are accepted.')
    data = await file.read()
    if len(data) > MAX_INPUT_BYTES:
        raise HTTPException(status_code=400,
                            detail='File exceeds the 2 MB upload limit.')
    try:
        return analyze_raw(data, source=f'upload:{name}')
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500,
                            detail=f'Analysis failed safely: {exc}')


@router.get('/samples')
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
            out.append({'filename': p.name,
                        'description': descriptions.get(p.name, 'Demo sample email.')})
    return {'samples': out}


def _safe_sample_path(filename: str) -> Path:
    if not SAMPLE_NAME_RE.match(filename):
        raise HTTPException(status_code=400, detail='Invalid sample filename.')
    path = (SAMPLE_DIR / filename).resolve()
    if not str(path).startswith(str(SAMPLE_DIR.resolve())) or not path.exists():
        raise HTTPException(status_code=404, detail='Sample not found.')
    return path


@router.get('/samples/content/{filename}')
def sample_content(filename: str):
    path = _safe_sample_path(filename)
    return {'filename': filename, 'content': path.read_text(encoding='utf-8', errors='replace')}


@router.post('/analyze/sample/{filename}')
def analyze_sample(filename: str):
    path = _safe_sample_path(filename)
    try:
        return analyze_raw(path.read_bytes(), source=f'sample:{filename}')
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post('/samples/load')
def load_all_samples():
    results = []
    if not SAMPLE_DIR.exists():
        return JSONResponse({'loaded': 0, 'results': []})
    for p in sorted(SAMPLE_DIR.glob('*.eml')):
        try:
            r = analyze_raw(p.read_bytes(), source=f'sample:{p.name}')
            results.append(summarize(r))
        except Exception as exc:
            results.append({'filename': p.name, 'error': str(exc)})
    return {'loaded': len(results), 'results': results}


@router.get('/analyses')
def list_analyses():
    analyses = store.load_analyses()
    analyses.sort(key=lambda a: a.get('timestamp', ''), reverse=True)
    return {'count': len(analyses), 'analyses': [summarize(a) for a in analyses]}


@router.get('/analyses/{analysis_id}')
def get_analysis(analysis_id: str):
    a = store.get_analysis(analysis_id)
    if not a:
        raise HTTPException(status_code=404, detail='Analysis not found.')
    out = dict(a)
    # attach related-activity info if this email belongs to a campaign
    related = []
    campaign = None
    if a.get('campaign_id'):
        campaign = store.get_campaign(a['campaign_id'])
    for rid in a.get('related_ids', []) or []:
        ra = store.get_analysis(rid)
        if ra:
            related.append({'id': ra['id'], 'subject': ra['subject'],
                            'sender': ra['sender'], 'risk_score': ra['risk_score'],
                            'classification': ra['classification']})
    out['related'] = related
    if campaign:
        out['campaign'] = {'id': campaign['id'], 'title': campaign['title'],
                           'confidence': campaign['confidence'],
                           'member_count': campaign['member_count'],
                           'disclaimer': campaign['disclaimer']}
    return out


@router.delete('/analyses/{analysis_id}')
def delete_analysis(analysis_id: str):
    if not store.delete_analysis(analysis_id):
        raise HTTPException(status_code=404, detail='Analysis not found.')
    correlation.recompute_campaigns(store)
    return {'deleted': True, 'id': analysis_id}


@router.get('/stats')
def stats():
    analyses = store.load_analyses()
    campaigns = store.load_campaigns()
    dist = {'SAFE': 0, 'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'CRITICAL': 0}
    for a in analyses:
        dist[a.get('classification', 'SAFE')] = dist.get(a.get('classification', 'SAFE'), 0) + 1
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


@router.get('/campaigns')
def list_campaigns():
    campaigns = store.load_campaigns()
    out = []
    for c in campaigns:
        summaries = []
        for mid in c.get('member_ids', []):
            a = store.get_analysis(mid)
            if a:
                summaries.append({'id': a['id'], 'subject': a['subject'],
                                  'sender': a['sender'], 'risk_score': a['risk_score'],
                                  'classification': a['classification']})
        item = {k: c[k] for k in ('id', 'title', 'confidence', 'member_count',
                                  'shared_indicators', 'disclaimer', 'created_at')}
        item['members'] = summaries
        out.append(item)
    return {'count': len(out), 'campaigns': out}


@router.get('/campaigns/{campaign_id}')
def get_campaign(campaign_id: str):
    c = store.get_campaign(campaign_id)
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found.')
    return campaign_detail(c)


@router.post('/reset')
def reset():
    store.clear()
    return {'cleared': True}
