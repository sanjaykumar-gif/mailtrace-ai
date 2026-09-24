-- ====================================================================
-- MailTrace AI — Supabase PostgreSQL Production Schema
-- ====================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- to create all required tables, foreign keys, indexes, and RLS policies.
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ANALYSES TABLE (Core Email Forensic Scans)
CREATE TABLE IF NOT EXISTS public.analyses (
    id TEXT PRIMARY KEY,
    tracking_id TEXT UNIQUE NOT NULL,
    sha1 TEXT,
    sha256 TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'upload:manual',
    sender_name TEXT,
    sender_address TEXT,
    sender_domain TEXT,
    local_part TEXT,
    reply_to TEXT,
    reply_to_domain TEXT,
    return_path TEXT,
    return_path_domain TEXT,
    recipient TEXT,
    subject TEXT,
    date TEXT,
    message_id TEXT,
    origin_ip TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0,
    classification TEXT NOT NULL DEFAULT 'SAFE',
    penalties JSONB DEFAULT '[]'::jsonb,
    auth JSONB DEFAULT '{}'::jsonb,
    urls JSONB DEFAULT '[]'::jsonb,
    route JSONB DEFAULT '[]'::jsonb,
    body JSONB DEFAULT '{}'::jsonb,
    geotrace JSONB DEFAULT '{}'::jsonb,
    campaign_id TEXT,
    live_dns JSONB DEFAULT '{}'::jsonb,
    live_ip JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATTACK CAMPAIGNS TABLE (Correlated Threat Clusters)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_brand TEXT,
    confidence INTEGER DEFAULT 80,
    risk_score INTEGER DEFAULT 85,
    lure_type TEXT,
    shared_infrastructure JSONB DEFAULT '[]'::jsonb,
    members JSONB DEFAULT '[]'::jsonb,
    indicators JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INCIDENTS TABLE (Security Operations Center Tickets)
CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY,
    tracking_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    recipient TEXT,
    origin_ip TEXT,
    risk_score INTEGER DEFAULT 0,
    policy_violations JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    assigned_to TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FORENSIC EVIDENCE RECORDS (Chain of Custody & Hash Sealing)
CREATE TABLE IF NOT EXISTS public.evidence (
    evidence_id TEXT PRIMARY KEY,
    tracking_id TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    sealed_at TIMESTAMPTZ DEFAULT NOW(),
    analyst TEXT DEFAULT 'Automated Sentinel Engine',
    custody_chain JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BLOCKCHAIN NOTARIZATION LEDGER (Immutable Verification Records)
CREATE TABLE IF NOT EXISTS public.ledger (
    tx_hash TEXT PRIMARY KEY,
    email_hash TEXT NOT NULL,
    subject TEXT,
    sender_domain TEXT,
    risk_score INTEGER DEFAULT 0,
    classification TEXT DEFAULT 'SAFE',
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ DEFAULT NOW(),
    analyst_address TEXT,
    campaign_id TEXT,
    network TEXT DEFAULT 'Polygon Amoy',
    status TEXT DEFAULT 'CONFIRMED',
    confirmations INTEGER DEFAULT 12,
    gas_used TEXT DEFAULT '48,000 Gwei',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SECURITY POLICIES TABLE (Governance & Compliance Rules)
CREATE TABLE IF NOT EXISTS public.policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'HIGH',
    rule_type TEXT NOT NULL,
    conditions JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- Performance Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_analyses_tracking_id ON public.analyses(tracking_id);
CREATE INDEX IF NOT EXISTS idx_analyses_sha256 ON public.analyses(sha256);
CREATE INDEX IF NOT EXISTS idx_analyses_sender_domain ON public.analyses(sender_domain);
CREATE INDEX IF NOT EXISTS idx_analyses_origin_ip ON public.analyses(origin_ip);
CREATE INDEX IF NOT EXISTS idx_analyses_risk_score ON public.analyses(risk_score);
CREATE INDEX IF NOT EXISTS idx_analyses_timestamp ON public.analyses(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_ledger_email_hash ON public.ledger(email_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_tracking_id ON public.evidence(tracking_id);

-- ====================================================================
-- Enable Row Level Security (RLS) & Public Read/Write Policies for API
-- ====================================================================
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- 1. Analyses policies
DROP POLICY IF EXISTS "Allow public read access on analyses" ON public.analyses;
DROP POLICY IF EXISTS "Allow public insert access on analyses" ON public.analyses;
DROP POLICY IF EXISTS "Allow public update access on analyses" ON public.analyses;
DROP POLICY IF EXISTS "Allow public delete access on analyses" ON public.analyses;
DROP POLICY IF EXISTS "Allow public all on analyses" ON public.analyses;

CREATE POLICY "Allow public all on analyses" ON public.analyses FOR ALL USING (true) WITH CHECK (true);

-- 2. Campaigns policies
DROP POLICY IF EXISTS "Allow public all on campaigns" ON public.campaigns;
CREATE POLICY "Allow public all on campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- 3. Incidents policies
DROP POLICY IF EXISTS "Allow public all on incidents" ON public.incidents;
CREATE POLICY "Allow public all on incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);

-- 4. Evidence policies
DROP POLICY IF EXISTS "Allow public all on evidence" ON public.evidence;
CREATE POLICY "Allow public all on evidence" ON public.evidence FOR ALL USING (true) WITH CHECK (true);

-- 5. Ledger policies
DROP POLICY IF EXISTS "Allow public all on ledger" ON public.ledger;
CREATE POLICY "Allow public all on ledger" ON public.ledger FOR ALL USING (true) WITH CHECK (true);

-- 6. Policies table policies
DROP POLICY IF EXISTS "Allow public all on policies" ON public.policies;
CREATE POLICY "Allow public all on policies" ON public.policies FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- Safe Realtime Publication Registration
-- ====================================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

