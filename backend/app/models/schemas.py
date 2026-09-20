"""MailTrace AI — Strongly Typed Pydantic v2 Schemas & Data Contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Literal, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

# Classification Literals
ClassificationType = Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]


# ======================================================================
# Generic API Envelopes
# ======================================================================

class ApiError(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Any | None = Field(default=None, description="Optional diagnostic details")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    error: ApiError | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ======================================================================
# Request Schemas
# ======================================================================

class AnalyzeTextRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Raw RFC 5322 email string or header dump")


class ImapConnectRequest(BaseModel):
    host: str = Field(..., min_length=1, description="IMAP server hostname (e.g., imap.gmail.com)")
    username: str = Field(..., min_length=1, description="Email address or mailbox login")
    password: str = Field(..., min_length=1, description="Account password or App Password (16-char)")
    port: int = Field(default=993, ge=1, le=65535, description="IMAP SSL port")
    use_ssl: bool = Field(default=True, description="Enable TLS/SSL encryption")
    folder: str = Field(default="INBOX", description="Target mailbox folder")
    poll_interval: int = Field(default=15, ge=5, le=300, description="Polling frequency in seconds")
    only_unread: bool = Field(default=False, description="Scan only unread messages")


class DnsLookupRequest(BaseModel):
    domain: str = Field(..., min_length=1, description="Domain name to query")
    ip: str | None = Field(default=None, description="Optional IP address for GeoIP/ASN lookup")


# ======================================================================
# Threat Indicators & Analysis Models
# ======================================================================

class ThreatIndicator(BaseModel):
    id: str = Field(..., description="Unique indicator rule identifier")
    group: str = Field(..., description="Threat category (auth, urgency, url, headers, reputation, etc.)")
    label: str = Field(..., description="Human-readable rule label")
    evidence: str = Field(..., description="Concrete forensic evidence string extracted from email")
    points: int = Field(default=0, ge=0, le=100, description="Assigned risk penalty points")


class SenderInfo(BaseModel):
    name: str = ""
    address: str = ""
    display_name: str = ""


class AuthResult(BaseModel):
    spf: str | None = None
    dkim: str | None = None
    dmarc: str | None = None
    arc: str | None = None
    raw: str | None = None


class AnalysisSummary(BaseModel):
    id: str = Field(..., description="Unique analysis UUID")
    timestamp: str = Field(..., description="ISO 8601 analysis timestamp")
    subject: str = Field(default="(No Subject)")
    sender: dict[str, Any] | None = None
    sender_domain: str = ""
    risk_score: int = Field(..., ge=0, le=100)
    classification: ClassificationType
    campaign_id: str | None = None
    source: str = "upload"


class AnalysisDetail(BaseModel):
    id: str
    timestamp: str
    sha1: str
    source: str
    subject: str
    sender: dict[str, Any] | None = None
    sender_domain: str = ""
    recipient: str | None = None
    risk_score: int = Field(..., ge=0, le=100)
    classification: ClassificationType
    phishing_probability: float = Field(..., ge=0.0, le=1.0)
    indicators: list[ThreatIndicator] = []
    explanation: dict[str, Any] = {}
    auth: dict[str, Any] = {}
    hops: list[dict[str, Any]] = []
    urls: list[dict[str, Any]] = []
    url_domains: list[str] = []
    public_ips: list[str] = []
    live_dns: dict[str, Any] | None = None
    live_ip: dict[str, Any] | None = None
    vt_intel: dict[str, Any] | None = None
    campaign_id: str | None = None
    related_ids: list[str] = []
    related: list[dict[str, Any]] = []
    campaign: dict[str, Any] | None = None
    raw_headers: str | None = None
    times_seen: int = 1


# ======================================================================
# Campaign & Graph Models
# ======================================================================

class CampaignMemberSummary(BaseModel):
    id: str
    subject: str
    sender: dict[str, Any] | None = None
    risk_score: int
    classification: ClassificationType


class CampaignSummary(BaseModel):
    id: str
    title: str
    confidence: int = Field(..., ge=0, le=100)
    member_count: int
    shared_indicators: list[dict[str, Any]] = []
    disclaimer: str
    created_at: str
    members: list[CampaignMemberSummary] = []


class CampaignDetail(BaseModel):
    id: str
    title: str
    confidence: int
    member_count: int
    shared_indicators: list[dict[str, Any]] = []
    disclaimer: str
    created_at: str
    members: list[dict[str, Any]] = []
    graph: dict[str, Any] = {}


# ======================================================================
# System Stats & Health Models
# ======================================================================

class StatDistribution(BaseModel):
    name: str
    value: int


class StatsResponse(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    safe: int
    campaigns: int
    distribution: list[StatDistribution]
    imap_active: bool


class HealthResponse(BaseModel):
    status: str = "ok"
    engine: str = "MailTrace AI live analysis engine"
    version: str = "1.0.0"
    analyses_stored: int
    campaigns_count: int
    imap_active: bool
    uptime_seconds: float = 0.0
