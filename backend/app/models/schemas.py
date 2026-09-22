"""MailTrace AI — Strongly Typed Pydantic v2 Schemas & Data Contracts.
Full Problem Statement PS 26106 Alignment.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Literal, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

# Classification Literals
ClassificationType = Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
IncidentStatusType = Literal["OPEN", "INVESTIGATING", "CONTAINED", "CLOSED"]
PolicyActionType = Literal["QUARANTINE", "ADMIN_ALERT", "BLOCK_DOMAIN", "TAG_SUBJECT", "LOG_AUDIT"]


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
    host: str = Field(..., min_length=1, description="IMAP server hostname")
    username: str = Field(..., min_length=1, description="Email address or mailbox login")
    password: str = Field(..., min_length=1, description="Account password or App Password")
    port: int = Field(default=993, ge=1, le=65535, description="IMAP SSL port")
    use_ssl: bool = Field(default=True, description="Enable TLS/SSL encryption")
    folder: str = Field(default="INBOX", description="Target mailbox folder")
    poll_interval: int = Field(default=15, ge=5, le=300, description="Polling frequency in seconds")
    only_unread: bool = Field(default=False, description="Scan only unread messages")


class DnsLookupRequest(BaseModel):
    domain: str = Field(..., min_length=1, description="Domain name to query")
    ip: str | None = Field(default=None, description="Optional IP address for GeoIP/ASN lookup")


class IncidentUpdatePayload(BaseModel):
    status: IncidentStatusType | None = None
    analyst: str | None = None
    notes: str | None = None
    mitigation_applied: str | None = None


class PrivacyConfig(BaseModel):
    mask_pii: bool = Field(default=True, description="Mask email addresses (e.g. j***@example.com)")
    mask_ips: bool = Field(default=False, description="Mask IP octets for compliance")
    retention_days: int = Field(default=30, ge=1, le=365, description="Data retention limit in days")
    audit_logging_enabled: bool = Field(default=True, description="Enforce immutable tamper-evident logs")


# ======================================================================
# Sub-component Analysis Models
# ======================================================================

class ThreatIndicator(BaseModel):
    id: str = Field(..., description="Unique indicator rule identifier")
    group: str = Field(..., description="Threat category (auth, urgency, url, headers, reputation, etc.)")
    label: str = Field(..., description="Human-readable rule label")
    evidence: str = Field(..., description="Concrete forensic evidence string extracted from email")
    points: int = Field(default=0, ge=0, le=100, description="Assigned risk penalty points")


class NlpCategoryScore(BaseModel):
    score: int = Field(default=0, ge=0, le=100)
    level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"
    cues_detected: list[str] = []


class NlpAnalysisResult(BaseModel):
    urgency_language: NlpCategoryScore
    credential_harvesting: NlpCategoryScore
    financial_manipulation: NlpCategoryScore
    impersonation_language: NlpCategoryScore
    social_engineering_score: int = Field(default=0, ge=0, le=100)
    summary: str = ""


class LinkSecurityItem(BaseModel):
    displayed_text: str = ""
    target_url: str = ""
    domain: str = ""
    destination_mismatch: bool = False
    is_shortened: bool = False
    is_redirect: bool = False
    is_lookalike: bool = False
    risk_level: Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"] = "SAFE"
    evidence: list[str] = []


class LinkSecurityReport(BaseModel):
    total_links: int = 0
    suspicious_links: int = 0
    has_destination_mismatch: bool = False
    links: list[LinkSecurityItem] = []


class InfrastructureIntel(BaseModel):
    is_hosting: bool = False
    is_cloud_provider: bool = False
    is_residential: bool = False
    is_possible_proxy: bool = False
    is_known_tor_exit: bool = False
    is_open_relay: bool = False
    is_vpn_indicator: bool = False
    network_type: str = "Hosting / Cloud"
    classification_notes: str = ""


class OriginGeoTrace(BaseModel):
    earliest_reliable_ip: str | None = None
    hostname: str | None = None
    country: str = "Unknown"
    country_code: str = "XX"
    region: str = "Unknown"
    city: str = "Unknown"
    latitude: float | None = None
    longitude: float | None = None
    isp: str = "Unknown"
    asn: str = "Unknown"
    organization: str = "Unknown"
    infrastructure: InfrastructureIntel = Field(default_factory=InfrastructureIntel)
    confidence: int = Field(default=75, ge=0, le=100)
    disclaimer: str = "The earliest reliable IP is geolocated to approximate region. This is infrastructure-level intelligence and does not establish the physical location or identity of the sender."


class DomainIntelligence(BaseModel):
    domain: str
    has_a_record: bool = True
    has_mx: bool = True
    has_txt: bool = True
    mx_records: list[str] = []
    a_records: list[str] = []
    nameservers: list[str] = []
    registrar: str = "Unknown Registrar"
    domain_age: str = "Unknown"
    is_punycode_lookalike: bool = False
    infrastructure_links: list[str] = []


class AttackDnaProfile(BaseModel):
    dna_id: str
    email_id: str
    origin_ip: str | None = None
    sender_domain: str = ""
    sender_pattern: str = ""
    mail_server: str | None = None
    hosting_provider: str = ""
    reply_to_domain: str | None = None
    lure_category: str = "Unknown"
    url_infrastructure: list[str] = []
    related_analyses: list[str] = []


class AttributionConfidenceMatrix(BaseModel):
    infrastructure_correlation: Literal["LOW", "MEDIUM", "HIGH"] = "HIGH"
    campaign_correlation: Literal["LOW", "MEDIUM", "HIGH"] = "HIGH"
    sender_identity_confidence: Literal["LOW", "MEDIUM", "HIGH", "INCONCLUSIVE"] = "LOW"
    physical_location: Literal["KNOWN", "APPROXIMATE", "UNKNOWN"] = "UNKNOWN"


class AttributionReport(BaseModel):
    observed_indicators: list[str] = []
    possible_origin_types: list[str] = []
    confidence_matrix: AttributionConfidenceMatrix = Field(default_factory=AttributionConfidenceMatrix)
    investigative_summary: str = ""
    attribution_disclaimer: str = "Attribution reflects correlated infrastructure clusters and investigative leads. It does not constitute legal proof of personal authorship."


class SecurityPolicyRule(BaseModel):
    id: str
    name: str
    description: str
    enabled: bool = True
    condition_summary: str
    triggered_count: int = 0
    recommended_action: PolicyActionType = "ADMIN_ALERT"


class PolicyEvaluationResult(BaseModel):
    triggered_policies: list[SecurityPolicyRule] = []
    recommended_actions: list[PolicyActionType] = []
    quarantine_recommended: bool = False
    admin_alert_required: bool = False


class IncidentRecord(BaseModel):
    id: str = Field(..., description="Incident ID e.g. INC-2026-001")
    email_id: str
    tracking_id: str
    subject: str
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "HIGH"
    status: IncidentStatusType = "OPEN"
    campaign_id: str | None = None
    created_at: str
    updated_at: str
    assigned_analyst: str = "SOC Lead Analyst"
    trigger_policies: list[str] = []
    evidence_count: int = 0
    actions_taken: list[str] = []
    notes: str = ""


class LedgerEvent(BaseModel):
    event_id: str = Field(..., description="Unique event identifier e.g. EVT-001")
    timestamp: str
    event_type: str = Field(..., description="INGESTION, THREAT_ANALYZED, LINK_SECURITY, etc.")
    email_id: str
    tracking_id: str
    campaign_id: str | None = None
    incident_id: str | None = None
    actor: str = "SYSTEM"
    summary: str
    sha256_hash: str


class CustodyEntry(BaseModel):
    timestamp: str
    actor: str
    action: str
    details: str


class ChainOfCustodyRecord(BaseModel):
    evidence_id: str = Field(..., description="Evidence record ID e.g. EVD-001")
    source_email_id: str
    tracking_id: str
    collected_at: str
    collected_by: str = "SYSTEM_INGEST"
    sha256_hash: str
    sha1_hash: str
    size_bytes: int
    integrity_status: Literal["VERIFIED", "FLAGGED", "UNVERIFIED"] = "VERIFIED"
    history: list[CustodyEntry] = []


class BlockchainVerification(BaseModel):
    verified: bool = True
    evidence_id: str
    evidence_sha256: str
    contract_address: str = "0x7a892b1923cd2891f974a9b20e74f8812c8b7491"
    block_height: int = 19482710
    transaction_hash: str = "0x9ef281bc892a71cd8120e83b271a9e0481cf71284a0d9271c6492ef01a82f37c"
    network: str = "MailTrace Private Evidence Ledger (EVM Compatibility Layer)"
    timestamp: str


class AnalysisSummary(BaseModel):
    id: str = Field(..., description="Unique analysis UUID")
    tracking_id: str = Field(default="EML-2026-001", description="Sequential tracking identifier")
    timestamp: str = Field(..., description="ISO 8601 analysis timestamp")
    subject: str = Field(default="(No Subject)")
    sender: dict[str, Any] | None = None
    sender_domain: str = ""
    risk_score: int = Field(..., ge=0, le=100)
    classification: ClassificationType
    campaign_id: str | None = None
    source: str = "upload"
    origin_ip: str | None = None
    geotrace: dict[str, Any] | None = None
    incident_id: str | None = None


# ======================================================================
# Top-Level Analysis Detail Model
# ======================================================================

class AnalysisDetail(BaseModel):
    id: str
    tracking_id: str = "EML-2026-001"
    timestamp: str
    sha1: str
    sha256: str = ""
    source: str
    subject: str
    sender: dict[str, Any] | None = None
    sender_domain: str = ""
    recipient: str | None = None
    risk_score: int = Field(..., ge=0, le=100)
    classification: ClassificationType
    phishing_probability: float = Field(..., ge=0.0, le=1.0)
    
    # Core Forensics
    indicators: list[ThreatIndicator] = []
    explanation: dict[str, Any] = {}
    auth: dict[str, Any] = {}
    hops: list[dict[str, Any]] = []
    urls: list[dict[str, Any]] = []
    url_domains: list[str] = []
    public_ips: list[str] = []
    raw_headers: str | None = None
    times_seen: int = 1

    # PS 26106 Expanded Intelligence Modules
    nlp_analysis: NlpAnalysisResult | None = None
    link_security: LinkSecurityReport | None = None
    geotrace: OriginGeoTrace | None = None
    domain_intelligence: DomainIntelligence | None = None
    attack_dna: AttackDnaProfile | None = None
    attribution: AttributionReport | None = None
    policy_evaluation: PolicyEvaluationResult | None = None
    incident: IncidentRecord | None = None
    custody: ChainOfCustodyRecord | None = None
    blockchain_verification: BlockchainVerification | None = None

    # Campaign Relationships
    campaign_id: str | None = None
    related_ids: list[str] = []
    related: list[dict[str, Any]] = []
    campaign: dict[str, Any] | None = None

    # Live Queries
    live_dns: dict[str, Any] | None = None
    live_ip: dict[str, Any] | None = None
    vt_intel: dict[str, Any] | None = None


# ======================================================================
# Campaign & Graph Models
# ======================================================================

class CampaignMemberSummary(BaseModel):
    id: str
    tracking_id: str = ""
    subject: str
    sender: dict[str, Any] | None = None
    risk_score: int
    classification: ClassificationType
    origin_ip: str | None = None
    timestamp: str = ""


class CampaignTimelineEvent(BaseModel):
    time: str
    tracking_id: str
    subject: str
    sender: str
    risk_score: int


class CampaignSummary(BaseModel):
    id: str
    title: str
    confidence: int = Field(..., ge=0, le=100)
    member_count: int
    shared_indicators: list[dict[str, Any]] = []
    disclaimer: str
    created_at: str
    members: list[CampaignMemberSummary] = []
    timeline: list[CampaignTimelineEvent] = []


class CampaignDetail(BaseModel):
    id: str
    title: str
    confidence: int
    member_count: int
    shared_indicators: list[dict[str, Any]] = []
    disclaimer: str
    created_at: str
    members: list[dict[str, Any]] = []
    timeline: list[CampaignTimelineEvent] = []
    graph: dict[str, Any] = {}


# ======================================================================
# System Stats & Health Models
# ======================================================================

class StatDistribution(BaseModel):
    name: str
    value: int


class GeoMapPoint(BaseModel):
    ip: str
    latitude: float
    longitude: float
    country: str
    city: str
    isp: str
    hosting: str
    risk_score: int
    classification: ClassificationType
    email_count: int = 1
    vpn_indicator: bool = False
    confidence: int = 75


class StatsResponse(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    safe: int
    campaigns: int
    active_campaigns: int = 0
    suspicious_links: int = 0
    origin_traces: int = 0
    policy_violations: int = 0
    open_incidents: int = 0
    evidence_records: int = 0
    distribution: list[StatDistribution]
    imap_active: bool
    geo_points: list[GeoMapPoint] = []


class HealthResponse(BaseModel):
    status: str = "ok"
    engine: str = "MailTrace AI live analysis engine"
    version: str = "1.0.0"
    analyses_stored: int
    campaigns_count: int
    incidents_count: int = 0
    ledger_events_count: int = 0
    imap_active: bool
    uptime_seconds: float = 0.0
