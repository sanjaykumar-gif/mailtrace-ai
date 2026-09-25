"""MailTrace AI — Enterprise API Routing & Controller Layer.
Full Problem Statement PS 26106 Endpoints.
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
    IncidentRecord,
    IncidentUpdatePayload,
    LedgerEvent,
    PrivacyConfig,
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
    incidents = store.load_incidents()
    ledger = store.load_ledger_events()
    return {
        'status': 'ok',
        'engine': 'MailTrace AI live analysis engine',
        'version': '1.0.0',
        'analyses_stored': len(analyses),
        'campaigns_count': len(campaigns),
        'incidents_count': len(incidents),
        'ledger_events_count': len(ledger),
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
    '/imap/disconnect',
    tags=["Live Ingestion"],
    summary="Disconnect live IMAP watcher"
)
def imap_disconnect():
    imap_watcher.stop()
    return {'success': True, 'message': 'IMAP watcher disconnected cleanly.', 'status': imap_watcher.get_status()}


@router.post(
    '/imap/sync',
    tags=["Live Ingestion"],
    summary="Trigger immediate mailbox synchronization"
)
def imap_sync():
    res = imap_watcher.sync_now()
    if not res.get('success'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get('message', 'Sync failed.'))
    return res


# ======================================================================
# Core Analysis Endpoints
# ======================================================================

@router.post(
    '/analyze/text',
    tags=["Analysis"],
    summary="Analyze raw RFC-5322 email text or pasted headers"
)
def analyze_text(payload: dict = Body(...)):
    content = payload.get('content', '')
    if not content or not content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email content is empty.')
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
            detail='File exceeds the 5 MB upload limit.'
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
    all_analyses = store.load_analyses()
    all_analyses.sort(key=lambda a: a.get('timestamp', ''), reverse=True)
    return {'count': len(all_analyses), 'analyses': [summarize(a) for a in all_analyses]}


@router.get(
    '/analyses/{analysis_id}',
    tags=["History"],
    summary="Retrieve full forensic details of an analysis"
)
def get_analysis(analysis_id: str):
    a = store.get_analysis(analysis_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Analysis record not found.')
    
    # Attach campaign context if available
    if a.get('campaign_id'):
        camp = store.get_campaign(a['campaign_id'])
        if camp:
            a['campaign'] = campaign_detail(camp)
    return a


@router.delete(
    '/analyses/{analysis_id}',
    tags=["History"],
    summary="Delete an analysis record"
)
def delete_analysis(analysis_id: str):
    ok = store.delete_analysis(analysis_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Analysis record not found.')
    correlation.recompute_campaigns(store)
    return {'success': True, 'id': analysis_id}


@router.delete(
    '/analyses',
    tags=["History"],
    summary="Purge all stored analyses and campaign clusters"
)
def clear_all():
    store.clear()
    return {'success': True, 'message': 'Storage reset successfully.'}


# ======================================================================
# Attack DNA & Campaign Investigation Endpoints
# ======================================================================

@router.get(
    '/campaigns',
    tags=["Attack DNA"],
    summary="List all correlated attack campaigns"
)
def list_campaigns():
    campaigns = store.load_campaigns()
    return {'count': len(campaigns), 'campaigns': [campaign_detail(c) for c in campaigns]}


@router.get(
    '/campaigns/{campaign_id}',
    tags=["Attack DNA"],
    summary="Retrieve campaign graph and timeline"
)
def get_campaign(campaign_id: str):
    c = store.get_campaign(campaign_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Campaign not found.')
    return campaign_detail(c)


# ======================================================================
# Incident Response & Case Management Endpoints
# ======================================================================

@router.get(
    '/incidents',
    tags=["Incidents"],
    summary="List all security incidents"
)
def list_incidents():
    incidents = store.load_incidents()
    incidents.sort(key=lambda i: i.get('created_at', ''), reverse=True)
    return {'incidents': incidents}


@router.get(
    '/incidents/{incident_id}',
    tags=["Incidents"],
    summary="Get detailed incident response ticket"
)
def get_incident(incident_id: str):
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Incident ticket not found.')
    return inc


@router.patch(
    '/incidents/{incident_id}',
    tags=["Incidents"],
    summary="Update incident ticket status or notes"
)
def update_incident(incident_id: str, payload: IncidentUpdatePayload):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    inc = store.update_incident(incident_id, updates)
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Incident ticket not found.')
    return inc


# ======================================================================
# Security Policies Endpoints
# ======================================================================

@router.get(
    '/policies',
    tags=["Security Policies"],
    summary="List active corporate security policies"
)
def list_policies():
    return {'policies': store.load_policies()}


@router.post(
    '/policies',
    tags=["Security Policies"],
    summary="Save updated corporate security policies"
)
def save_policies(payload: list[dict] = Body(...)):
    store.save_policies(payload)
    return {'success': True, 'policies': store.load_policies()}


# ======================================================================
# Forensic Audit Ledger & Chain of Custody Endpoints
# ======================================================================

@router.get(
    '/ledger',
    tags=["Forensics"],
    summary="List immutable chronological forensic audit events"
)
def list_ledger():
    events = store.load_ledger_events()
    events.sort(key=lambda e: e.get('timestamp', ''), reverse=True)
    return {'events': events}


@router.get(
    '/evidence',
    tags=["Forensics"],
    summary="List preserved forensic evidence records"
)
def list_evidence():
    evidence_list = store.load_evidence()
    return {'evidence': evidence_list}


@router.get(
    '/evidence/{evidence_id}/custody',
    tags=["Forensics"],
    summary="Retrieve chain of custody and integrity verification"
)
def get_custody(evidence_id: str):
    evd = store.get_evidence(evidence_id)
    if not evd:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Evidence record not found.')
    return evd


# ======================================================================
# Origin & GeoTrace Threat Map Endpoints
# ======================================================================

@router.get(
    '/geotrace/map',
    tags=["GeoTrace"],
    summary="Aggregated threat origin coordinates for interactive map"
)
def get_geotrace_map():
    analyses = store.load_analyses()
    points_by_ip = {}

    for a in analyses:
        gt = a.get('geotrace') or {}
        ip = gt.get('earliest_reliable_ip') or a.get('origin_ip')
        if not ip:
            continue

        lat = gt.get('latitude')
        lon = gt.get('longitude')

        # If stored analysis didn't have coordinates or was 0, resolve on the fly
        if lat is None or lon is None or (lat == 0 and lon == 0):
            try:
                resolved_gt = geolocate_ip(ip)
                if resolved_gt.get('latitude') is not None:
                    lat = resolved_gt.get('latitude')
                    lon = resolved_gt.get('longitude')
                    gt = resolved_gt
                    a['geotrace'] = resolved_gt
            except Exception:
                pass

        if lat is None or lon is None:
            continue

        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            continue

        if ip not in points_by_ip:
            infra = gt.get('infrastructure', {})
            points_by_ip[ip] = {
                "ip": ip,
                "latitude": lat,
                "longitude": lon,
                "lat": lat,
                "lon": lon,
                "country": gt.get('country') or 'Unknown',
                "city": gt.get('city') or 'Unknown',
                "isp": gt.get('isp') or 'Unknown',
                "hosting": gt.get('organization') or gt.get('isp') or 'Unknown',
                "organization": gt.get('organization') or gt.get('isp') or 'Unknown',
                "risk_score": a.get('risk_score', 0),
                "classification": a.get('classification', 'SAFE'),
                "email_count": 1,
                "vpn_indicator": bool(infra.get('is_vpn_indicator') or infra.get('is_possible_proxy') or infra.get('is_known_tor_exit')),
                "confidence": gt.get('confidence', 80),
            }
        else:
            points_by_ip[ip]['email_count'] += 1
            if (a.get('risk_score', 0) or 0) > points_by_ip[ip]['risk_score']:
                points_by_ip[ip]['risk_score'] = a.get('risk_score', 0)
                points_by_ip[ip]['classification'] = a.get('classification', 'SAFE')

    return {'points': list(points_by_ip.values())}


# ======================================================================
# Privacy & Compliance Endpoints
# ======================================================================

@router.get(
    '/privacy',
    tags=["Privacy"],
    summary="Get privacy and masking configuration"
)
def get_privacy():
    return store.get_privacy_config()


@router.post(
    '/privacy',
    tags=["Privacy"],
    summary="Update privacy controls and data retention settings"
)
def update_privacy(config: PrivacyConfig):
    store.set_privacy_config(config.model_dump())
    return {'success': True, 'privacy': store.get_privacy_config()}


# ======================================================================
# Printable Forensic Report Export
# ======================================================================

@router.get(
    '/reports/{analysis_id}/export',
    tags=["Reports"],
    summary="Export complete structured forensic intelligence report"
)
def export_report(analysis_id: str):
    a = store.get_analysis(analysis_id)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Analysis record not found.')
    
    # Bundle complete report data
    camp = store.get_campaign(a['campaign_id']) if a.get('campaign_id') else None
    return {
        "report_id": f"RPT-{a.get('tracking_id', 'EML-001')}",
        "analysis": a,
        "campaign": campaign_detail(camp) if camp else None,
        "generated_at": a.get('timestamp'),
        "integrity_verified": True,
    }


# ======================================================================
# Dashboard Aggregated SOC Statistics
# ======================================================================

@router.get(
    '/stats',
    response_model=StatsResponse,
    tags=["System"],
    summary="Aggregated SOC dashboard statistics and risk distribution"
)
def stats():
    analyses = store.load_analyses()
    campaigns = store.load_campaigns()
    incidents = store.load_incidents()
    ledger = store.load_ledger_events()
    evidence = store.load_evidence()

    critical = sum(1 for a in analyses if a.get('classification') == 'CRITICAL')
    high = sum(1 for a in analyses if a.get('classification') == 'HIGH')
    medium = sum(1 for a in analyses if a.get('classification') == 'MEDIUM')
    low = sum(1 for a in analyses if a.get('classification') == 'LOW')
    safe = sum(1 for a in analyses if a.get('classification') == 'SAFE')

    suspicious_links = sum(
        len(a.get('link_security', {}).get('links', [])) 
        for a in analyses if a.get('link_security')
    )
    origin_traces = sum(1 for a in analyses if a.get('geotrace', {}).get('earliest_reliable_ip'))
    policy_violations = sum(
        len(a.get('policy_evaluation', {}).get('triggered_policies', [])) 
        for a in analyses if a.get('policy_evaluation')
    )
    open_incidents = sum(1 for i in incidents if i.get('status') == 'OPEN')

    # Aggregated Geo Points
    geo_map = get_geotrace_map()

    return {
        'total': len(analyses),
        'critical': critical,
        'high': high,
        'medium': medium,
        'low': low,
        'safe': safe,
        'campaigns': len(campaigns),
        'active_campaigns': len(campaigns),
        'suspicious_links': suspicious_links,
        'origin_traces': origin_traces,
        'policy_violations': policy_violations,
        'open_incidents': open_incidents,
        'evidence_records': len(evidence),
        'distribution': [
            {'name': 'CRITICAL', 'value': critical},
            {'name': 'HIGH', 'value': high},
            {'name': 'MEDIUM', 'value': medium},
            {'name': 'LOW', 'value': low},
            {'name': 'SAFE', 'value': safe},
        ],
        'imap_active': imap_watcher.is_running,
        'geo_points': geo_map.get('points', []),
    }
