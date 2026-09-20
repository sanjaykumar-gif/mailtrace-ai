/**
 * MailTrace AI — High-Fidelity Standalone Mock Intelligence & Forensic Corpus
 * Used during Evaluation / Demo Mode to guarantee 100% instant, zero-latency
 * forensic dissection even if cloud backend is cold-starting or offline.
 */

export const MOCK_ANALYSES = [
  // 1. Safe Placement Notice
  {
    id: 'demo-sample-1',
    timestamp: new Date().toISOString(),
    sha1: 'a11b22c33d44e55f66a77b88c99d00e11f22a33b',
    source: 'sample:1_safe_notice.eml',
    filename: '1_safe_notice.eml',
    subject: 'Campus Placement Notice: Fall 2026 Drive Schedule & Venue Details',
    sender: { name: 'Career Development Center', address: 'placement@university.ac.in', display_name: 'University Placements' },
    sender_domain: 'university.ac.in',
    recipient: 'student.2026@university.ac.in',
    risk_score: 0,
    classification: 'SAFE',
    phishing_probability: 0.01,
    indicators: [],
    explanation: {
      headline: 'Legitimate & Authenticated Educational Institution Notice',
      reasons: [
        { group: 'auth', reason: 'Passing SPF, DKIM, and DMARC alignment', points: 0, evidence: 'Origin IP 104.28.14.99 is explicitly authorized by university.ac.in SPF record.' },
        { group: 'content', reason: 'Zero malicious indicators or credential traps', points: 0, evidence: 'All links point strictly to internal university portal.' }
      ],
      recommendations: ['Safe for standard delivery to recipient mailboxes.']
    },
    auth: {
      spf: 'PASS (ip=104.28.14.99, domain=university.ac.in)',
      dkim: 'PASS (header.i=@university.ac.in header.s=google)',
      dmarc: 'PASS (p=reject, disposition=none)',
      arc: 'PASS',
      raw: 'Authentication-Results: mx.google.com; dkim=pass header.i=@university.ac.in; spf=pass (google.com: domain of placement@university.ac.in designates 104.28.14.99 as permitted sender); dmarc=pass'
    },
    hops: [
      { hop: 1, from: 'mail-sor-f69.google.com [104.28.14.99]', by: 'mx.google.com', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 02:15:00 +0000', delay: 0 }
    ],
    urls: [
      { url: 'https://placements.university.ac.in/schedule/2026', domain: 'placements.university.ac.in', ip: '104.28.14.99', is_ip: false, is_shortener: false, threat_level: 'SAFE' }
    ],
    url_domains: ['placements.university.ac.in'],
    public_ips: ['104.28.14.99'],
    live_dns: { domain: 'university.ac.in', has_mx: true, mx_records: ['aspmx.l.google.com'], spf_record: 'v=spf1 include:_spf.google.com ~all', dmarc_record: 'v=DMARC1; p=reject', dmarc_policy: 'REJECT', status: 'resolved' },
    live_ip: { ip: '104.28.14.99', is_private: false, country: 'India', city: 'Chennai', isp: 'National Informatics Centre', org: 'Higher Education Network', as: 'AS55836' },
    campaign_id: null,
    related_ids: [],
    raw_headers: 'From: "University Placements" <placement@university.ac.in>\nTo: student.2026@university.ac.in\nSubject: Campus Placement Notice: Fall 2026 Drive Schedule & Venue Details\nDate: Sun, 20 Sep 2026 02:15:00 +0000\nAuthentication-Results: spf=pass; dkim=pass; dmarc=pass'
  },

  // 2. PayPal Credential Phishing
  {
    id: 'demo-sample-2',
    timestamp: new Date().toISOString(),
    sha1: 'e48a73bc92810f65b12874109823451098765432',
    source: 'sample:2_phishing_credential.eml',
    filename: '2_phishing_credential.eml',
    subject: 'URGENT: Your PayPal Account has been Restricted - Action Required Within 24 Hours',
    sender: { name: 'PayPal Security Team', address: 'security-update@paypa1-support-auth.com', display_name: 'PayPal Security' },
    sender_domain: 'paypa1-support-auth.com',
    recipient: 'victim.user@enterprise.org',
    risk_score: 100,
    classification: 'CRITICAL',
    phishing_probability: 0.99,
    indicators: [
      { id: 'auth_dmarc_fail', group: 'auth', label: 'DMARC Verification Failed', evidence: 'DMARC policy=reject violated; alignment check failed for domain paypa1-support-auth.com', points: 25 },
      { id: 'homoglyph_typo', group: 'domain', label: 'Targeted Homoglyph / Look-Alike Domain', evidence: 'Sender domain "paypa1-support-auth.com" spoofing "paypal.com" using numeric digit 1 replacement.', points: 25 },
      { id: 'cred_harvest_form', group: 'url', label: 'Embedded Credential Harvesting Form', evidence: 'Contains disguised login hyperlink pointing to unverified external IP http://185.220.101.42/auth/login.php', points: 25 },
      { id: 'high_urgency_coercion', group: 'urgency', label: 'Severe Urgency & Threat of Account Suspension', evidence: 'Contains coercion phrases: "Action Required Within 24 Hours", "permanently suspended", "verify identity immediately".', points: 15 },
      { id: 'spf_hardfail', group: 'auth', label: 'SPF Authentication Hardfail', evidence: 'Sending server 185.220.101.42 is not authorized in SPF record for paypal.com', points: 10 }
    ],
    explanation: {
      headline: 'Confirmed Malicious Credential Harvesting Phishing Campaign',
      reasons: [
        { group: 'domain', reason: 'Homoglyph domain deception detected (paypa1-support-auth.com)', points: 25, evidence: 'Digit 1 substituted for letter l to deceive human recipients.' },
        { group: 'auth', reason: 'DMARC & SPF cryptographic failure', points: 25, evidence: 'Unauthorized sending IP 185.220.101.42 failed DMARC alignment.' },
        { group: 'url', reason: 'Direct IP credential harvesting portal', points: 25, evidence: 'Link destination directs to raw overseas host 185.220.101.42.' },
        { group: 'urgency', reason: 'Psychological urgency coercion', points: 15, evidence: 'Demands action within 24 hours under penalty of account forfeiture.' }
      ],
      recommendations: [
        'Block sender domain paypa1-support-auth.com on your email gateway.',
        'Add origin IP 185.220.101.42 to perimeter firewall and web proxy blocklists.',
        'Quarantine message from all recipient inboxes immediately.'
      ]
    },
    auth: {
      spf: 'FAIL (ip=185.220.101.42, domain=paypa1-support-auth.com)',
      dkim: 'FAIL (signature corrupted or unsigned)',
      dmarc: 'FAIL (p=reject, action=quarantine)',
      arc: 'NONE',
      raw: 'Authentication-Results: mx.google.com; dkim=fail; spf=fail (google.com: domain of security-update@paypa1-support-auth.com does not designate 185.220.101.42 as permitted sender) smtp.mailfrom=security-update@paypa1-support-auth.com; dmarc=fail (p=REJECT sp=REJECT dis=QUARANTINE) header.from=paypa1-support-auth.com'
    },
    hops: [
      { hop: 1, from: 'mail.paypa1-support-auth.com [185.220.101.42]', by: 'relay.bulletproof-host.ru', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 04:12:00 +0000', delay: 0 },
      { hop: 2, from: 'relay.bulletproof-host.ru [185.220.101.42]', by: 'mx.enterprise-gateway.org', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 04:12:03 +0000', delay: 3 }
    ],
    urls: [
      { url: 'http://185.220.101.42/auth/login.php?session=9f82a', domain: '185.220.101.42', ip: '185.220.101.42', is_ip: true, is_shortener: false, threat_level: 'MALICIOUS' }
    ],
    url_domains: ['185.220.101.42'],
    public_ips: ['185.220.101.42'],
    live_dns: { domain: 'paypa1-support-auth.com', has_mx: false, mx_records: [], spf_record: 'v=spf1 -all', dmarc_record: 'v=DMARC1; p=reject', dmarc_policy: 'REJECT', status: 'resolved' },
    live_ip: { ip: '185.220.101.42', is_private: false, country: 'Russian Federation', city: 'Moscow', isp: 'Bulletproof Networks Ltd', org: 'BadActor Autonomous System', as: 'AS44192' },
    campaign_id: null,
    related_ids: [],
    raw_headers: 'From: "PayPal Security" <security-update@paypa1-support-auth.com>\nTo: victim.user@enterprise.org\nSubject: URGENT: Your PayPal Account has been Restricted - Action Required Within 24 Hours\nDate: Sun, 20 Sep 2026 04:12:00 +0000\nMessage-ID: <894172834190.231@paypa1-support-auth.com>\nAuthentication-Results: spf=fail; dkim=fail; dmarc=fail\nReceived: from mail.paypa1-support-auth.com (185.220.101.42) by mx.google.com\nContent-Type: text/html; charset=UTF-8'
  },

  // 3. Executive BEC Impersonation
  {
    id: 'demo-sample-3',
    timestamp: new Date().toISOString(),
    sha1: '3344556677889900aabbccddeeff001122334455',
    source: 'sample:3_impersonation_bec.eml',
    filename: '3_impersonation_bec.eml',
    subject: 'URGENT: Confidential Acquisition Wire Transfer - Immediate Execution Required',
    sender: { name: 'Satya Nadella (CEO)', address: 'satya.ceo.board@exec-private-desk.com', display_name: 'CEO Office' },
    sender_domain: 'exec-private-desk.com',
    recipient: 'cfo.finance@enterprise.org',
    risk_score: 75,
    classification: 'HIGH',
    phishing_probability: 0.92,
    indicators: [
      { id: 'bec_impersonation', group: 'impersonation', label: 'Executive BEC Impersonation', evidence: 'Display name claims C-Suite identity ("Satya Nadella") from mismatched external domain exec-private-desk.com', points: 30 },
      { id: 'wire_fraud_keywords', group: 'content', label: 'Financial Wire Fraud Phrasing', evidence: 'Solicits immediate wire transfer / banking transaction under confidential NDA pretext.', points: 25 },
      { id: 'replyto_mismatch', group: 'headers', label: 'Reply-To Header Misdirection', evidence: 'Reply-To set to stealth drop inbox "wire.settlement77@gmail.com"', points: 20 }
    ],
    explanation: {
      headline: 'Business Email Compromise (BEC) Executive Impersonation Attack',
      reasons: [
        { group: 'impersonation', reason: 'Mismatched executive sender domain', points: 30, evidence: 'Claims CEO identity from unverified domain exec-private-desk.com.' },
        { group: 'headers', reason: 'Stealth Reply-To redirection', points: 20, evidence: 'Replies will secretly route to wire.settlement77@gmail.com.' },
        { group: 'content', reason: 'High-value wire diversion attempt', points: 25, evidence: 'Requests immediate wire transfer bypassing protocol.' }
      ],
      recommendations: [
        'Notify CFO / Finance department immediately.',
        'Block domain exec-private-desk.com and drop address wire.settlement77@gmail.com.',
        'Do not initiate wire transfers without secondary voice verification.'
      ]
    },
    auth: { spf: 'PASS (softfail)', dkim: 'FAIL', dmarc: 'FAIL', arc: 'NONE', raw: 'Authentication-Results: spf=softfail; dkim=none; dmarc=fail' },
    hops: [{ hop: 1, from: 'mail.exec-private-desk.com [193.106.191.12]', by: 'mx.enterprise-gateway.org', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 03:00:00 +0000', delay: 0 }],
    urls: [],
    url_domains: [],
    public_ips: ['193.106.191.12'],
    live_dns: { domain: 'exec-private-desk.com', has_mx: true, mx_records: ['mail.exec-private-desk.com'], spf_record: 'v=spf1 ~all', dmarc_record: null, dmarc_policy: 'NONE', status: 'resolved' },
    live_ip: { ip: '193.106.191.12', is_private: false, country: 'Netherlands', city: 'Amsterdam', isp: 'Offshore Hosting BV', org: 'Anonymous Transit', as: 'AS202425' },
    campaign_id: null,
    related_ids: [],
    raw_headers: 'From: "Satya Nadella" <satya.ceo.board@exec-private-desk.com>\nReply-To: wire.settlement77@gmail.com\nTo: cfo.finance@enterprise.org\nSubject: URGENT: Confidential Acquisition Wire Transfer'
  },

  // 4. Fake Invoice Attachment
  {
    id: 'demo-sample-4',
    timestamp: new Date().toISOString(),
    sha1: '4455667788990011223344556677889900112233',
    source: 'sample:4_invoice_fraud.eml',
    filename: '4_invoice_fraud.eml',
    subject: 'Overdue Invoice #INV-2026-99238 - Remittance Due Immediately',
    sender: { name: 'Accounts Payable Dept', address: 'invoicing@quick-billing-cloud.cc', display_name: 'Global Billing' },
    sender_domain: 'quick-billing-cloud.cc',
    recipient: 'accounting@enterprise.org',
    risk_score: 80,
    classification: 'HIGH',
    phishing_probability: 0.89,
    indicators: [
      { id: 'shortener_url', group: 'url', label: 'Concealed URL Shortener Redirection', evidence: 'Links redirect through bit.ly/inv-99238 masking the real malicious destination.', points: 30 },
      { id: 'risky_attachment', group: 'attachment', label: 'Deceptive Macro-Enabled Document', evidence: 'Email references attachment INVOICE_FINAL.pdf.exe disguised as legitimate PDF.', points: 30 },
      { id: 'domain_age', group: 'domain', label: 'Newly Registered Sending Domain', evidence: 'quick-billing-cloud.cc registered less than 48 hours ago.', points: 20 }
    ],
    explanation: {
      headline: 'Financial Invoice Fraud & Malicious Payload Redirection',
      reasons: [
        { group: 'url', reason: 'Shortened link disguising malware drop', points: 30, evidence: 'Shortlink resolves to suspicious executable payload host.' },
        { group: 'attachment', reason: 'Double-extension executable payload', points: 30, evidence: 'Double extension pattern detected in attachment headers.' },
        { group: 'domain', reason: 'Ephemeral domain registration', points: 20, evidence: 'Domain created 2 days ago with anonymous WHOIS guard.' }
      ],
      recommendations: [
        'Do not download or execute the attached remittance file.',
        'Block quick-billing-cloud.cc and bit.ly destination endpoint.'
      ]
    },
    auth: { spf: 'FAIL', dkim: 'FAIL', dmarc: 'FAIL', arc: 'NONE', raw: 'Authentication-Results: spf=fail; dkim=fail; dmarc=fail' },
    hops: [{ hop: 1, from: 'mailer.quick-billing-cloud.cc [45.154.255.89]', by: 'mx.enterprise.org', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 04:30:00 +0000', delay: 1 }],
    urls: [{ url: 'https://bit.ly/inv-99238', domain: 'bit.ly', ip: '67.199.248.10', is_ip: false, is_shortener: true, threat_level: 'SUSPICIOUS' }],
    url_domains: ['bit.ly'],
    public_ips: ['45.154.255.89'],
    live_dns: { domain: 'quick-billing-cloud.cc', has_mx: true, mx_records: ['mx.quick-billing-cloud.cc'], spf_record: 'v=spf1 ~all', dmarc_record: null, dmarc_policy: 'NONE', status: 'resolved' },
    live_ip: { ip: '45.154.255.89', is_private: false, country: 'Bulgaria', city: 'Sofia', isp: 'Cloud VPS Hostings Ltd', org: 'Anonymous Transit', as: 'AS49981' },
    campaign_id: null,
    related_ids: [],
    raw_headers: 'From: "Accounts Payable Dept" <invoicing@quick-billing-cloud.cc>\nTo: accounting@enterprise.org\nSubject: Overdue Invoice #INV-2026-99238'
  },

  // 5. Campaign: Support Phish
  {
    id: 'demo-sample-5',
    timestamp: new Date().toISOString(),
    sha1: '55667788990011223344556677889900aabbccdd',
    source: 'sample:5_campaign_support.eml',
    filename: '5_campaign_support.eml',
    subject: 'Action Required: Microsoft 365 Password Expiration Alert',
    sender: { name: 'Microsoft Online Support', address: 'admin-support@auth-portal-verify365.net', display_name: 'M365 Security Team' },
    sender_domain: 'auth-portal-verify365.net',
    recipient: 'employee1@enterprise.org',
    risk_score: 90,
    classification: 'CRITICAL',
    phishing_probability: 0.95,
    indicators: [
      { id: 'shared_campaign_infra', group: 'campaign', label: 'Coordinated Attack Infrastructure (CMP-7F2A)', evidence: 'Matches shared adversary server 91.240.118.50 and domain cluster auth-portal-verify365.net', points: 30 },
      { id: 'cred_phishing_link', group: 'url', label: 'Credential Harvesting Target', evidence: 'Directs to phishing kit http://91.240.118.50/m365/login.php', points: 30 },
      { id: 'brand_impersonation', group: 'impersonation', label: 'Microsoft 365 Brand Impersonation', evidence: 'Uses trademarked logo and urgency to prompt password renewal.', points: 20 },
      { id: 'auth_fail', group: 'auth', label: 'DMARC/SPF Alignment Failure', evidence: 'Unauthenticated relay host.', points: 10 }
    ],
    explanation: {
      headline: 'Coordinated Microsoft 365 Phishing Wave (Campaign CMP-7F2A)',
      reasons: [
        { group: 'campaign', reason: 'Part of multi-mailbox attack cluster', points: 30, evidence: 'Shared origin server 91.240.118.50 identified across multiple employee mailboxes.' },
        { group: 'url', reason: 'Known credential phishing kit', points: 30, evidence: 'Hosted at http://91.240.118.50/m365/login.php.' }
      ],
      recommendations: ['Block entire CIDR block 91.240.118.0/24.', 'Revoke credentials for target users.']
    },
    auth: { spf: 'FAIL', dkim: 'FAIL', dmarc: 'FAIL', arc: 'NONE', raw: 'Authentication-Results: spf=fail; dkim=fail; dmarc=fail' },
    hops: [{ hop: 1, from: 'relay.auth-portal-verify365.net [91.240.118.50]', by: 'mx.enterprise.org', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 05:00:00 +0000', delay: 1 }],
    urls: [{ url: 'http://91.240.118.50/m365/login.php?user=employee1', domain: '91.240.118.50', ip: '91.240.118.50', is_ip: true, is_shortener: false, threat_level: 'MALICIOUS' }],
    url_domains: ['91.240.118.50'],
    public_ips: ['91.240.118.50'],
    live_dns: { domain: 'auth-portal-verify365.net', has_mx: false, mx_records: [], spf_record: 'v=spf1 -all', dmarc_record: null, dmarc_policy: 'NONE', status: 'resolved' },
    live_ip: { ip: '91.240.118.50', is_private: false, country: 'Germany', city: 'Frankfurt', isp: 'Host Europe GmbH', org: 'Malicious Cluster', as: 'AS20773' },
    campaign_id: 'CMP-7F2A',
    related_ids: ['demo-sample-6', 'demo-sample-7'],
    raw_headers: 'From: "M365 Security" <admin-support@auth-portal-verify365.net>\nTo: employee1@enterprise.org\nSubject: Action Required: Microsoft 365 Password Expiration Alert'
  },

  // 6. Campaign: Billing Phish
  {
    id: 'demo-sample-6',
    timestamp: new Date().toISOString(),
    sha1: '66778899001122334455667788990011aabbccdd',
    source: 'sample:6_campaign_billing.eml',
    filename: '6_campaign_billing.eml',
    subject: 'Billing Invoice #8410 Overdue - Immediate Payment Required',
    sender: { name: 'Microsoft Cloud Billing', address: 'admin-billing@auth-portal-verify365.net', display_name: 'M365 Billing Desk' },
    sender_domain: 'auth-portal-verify365.net',
    recipient: 'employee2@enterprise.org',
    risk_score: 90,
    classification: 'CRITICAL',
    phishing_probability: 0.95,
    indicators: [
      { id: 'shared_campaign_infra', group: 'campaign', label: 'Coordinated Attack Infrastructure (CMP-7F2A)', evidence: 'Matches shared adversary server 91.240.118.50 and domain cluster auth-portal-verify365.net', points: 30 },
      { id: 'cred_phishing_link', group: 'url', label: 'Credential Harvesting Target', evidence: 'Directs to phishing kit http://91.240.118.50/billing/pay.php', points: 30 },
      { id: 'fake_invoice_scam', group: 'content', label: 'Fabricated Subscription Suspension Notice', evidence: 'Threatens service termination if payment is not remitted immediately.', points: 20 },
      { id: 'auth_fail', group: 'auth', label: 'DMARC/SPF Alignment Failure', evidence: 'Unauthenticated relay host.', points: 10 }
    ],
    explanation: {
      headline: 'Coordinated M365 Cloud Billing Attack Wave (Campaign CMP-7F2A)',
      reasons: [
        { group: 'campaign', reason: 'Shared campaign infrastructure node', points: 30, evidence: 'Origin server 91.240.118.50 shared with other enterprise phishing targets.' },
        { group: 'url', reason: 'Malicious payment gateway impersonation', points: 30, evidence: 'Hosted at http://91.240.118.50/billing/pay.php.' }
      ],
      recommendations: ['Block CIDR 91.240.118.0/24.', 'Correlate with Campaign CMP-7F2A.']
    },
    auth: { spf: 'FAIL', dkim: 'FAIL', dmarc: 'FAIL', arc: 'NONE', raw: 'Authentication-Results: spf=fail; dkim=fail; dmarc=fail' },
    hops: [{ hop: 1, from: 'relay.auth-portal-verify365.net [91.240.118.50]', by: 'mx.enterprise.org', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 05:10:00 +0000', delay: 1 }],
    urls: [{ url: 'http://91.240.118.50/billing/pay.php?id=8410', domain: '91.240.118.50', ip: '91.240.118.50', is_ip: true, is_shortener: false, threat_level: 'MALICIOUS' }],
    url_domains: ['91.240.118.50'],
    public_ips: ['91.240.118.50'],
    live_dns: { domain: 'auth-portal-verify365.net', has_mx: false, mx_records: [], spf_record: 'v=spf1 -all', dmarc_record: null, dmarc_policy: 'NONE', status: 'resolved' },
    live_ip: { ip: '91.240.118.50', is_private: false, country: 'Germany', city: 'Frankfurt', isp: 'Host Europe GmbH', org: 'Malicious Cluster', as: 'AS20773' },
    campaign_id: 'CMP-7F2A',
    related_ids: ['demo-sample-5', 'demo-sample-7'],
    raw_headers: 'From: "Microsoft Cloud Billing" <admin-billing@auth-portal-verify365.net>\nTo: employee2@enterprise.org\nSubject: Billing Invoice #8410 Overdue - Immediate Payment Required'
  },

  // 7. Campaign: Account Alert
  {
    id: 'demo-sample-7',
    timestamp: new Date().toISOString(),
    sha1: '77889900112233445566778899001122aabbccdd',
    source: 'sample:7_campaign_account.eml',
    filename: '7_campaign_account.eml',
    subject: 'Security Alert: Unusual Sign-In Activity Detected - Verify Identity',
    sender: { name: 'Microsoft Identity Protect', address: 'admin-account@auth-portal-verify365.net', display_name: 'M365 Identity Guard' },
    sender_domain: 'auth-portal-verify365.net',
    recipient: 'employee3@enterprise.org',
    risk_score: 90,
    classification: 'CRITICAL',
    phishing_probability: 0.95,
    indicators: [
      { id: 'shared_campaign_infra', group: 'campaign', label: 'Coordinated Attack Infrastructure (CMP-7F2A)', evidence: 'Matches shared adversary server 91.240.118.50 and domain cluster auth-portal-verify365.net', points: 30 },
      { id: 'cred_phishing_link', group: 'url', label: 'Credential Harvesting Target', evidence: 'Directs to phishing kit http://91.240.118.50/account/verify.php', points: 30 },
      { id: 'security_fear_trigger', group: 'urgency', label: 'Security Alarmism & Coercive Phrasing', evidence: 'Fabricated suspicious login warning prompting immediate credential submission.', points: 20 },
      { id: 'auth_fail', group: 'auth', label: 'DMARC/SPF Alignment Failure', evidence: 'Unauthenticated relay host.', points: 10 }
    ],
    explanation: {
      headline: 'Coordinated M365 Identity Compromise Wave (Campaign CMP-7F2A)',
      reasons: [
        { group: 'campaign', reason: 'Part of multi-mailbox attack cluster', points: 30, evidence: 'Adversary server 91.240.118.50 targeting 3 enterprise accounts concurrently.' },
        { group: 'url', reason: 'Credential theft landing page', points: 30, evidence: 'Hosted at http://91.240.118.50/account/verify.php.' }
      ],
      recommendations: ['Block 91.240.118.50.', 'Activate 2FA and reset credentials for targeted victims.']
    },
    auth: { spf: 'FAIL', dkim: 'FAIL', dmarc: 'FAIL', arc: 'NONE', raw: 'Authentication-Results: spf=fail; dkim=fail; dmarc=fail' },
    hops: [{ hop: 1, from: 'relay.auth-portal-verify365.net [91.240.118.50]', by: 'mx.enterprise.org', proto: 'ESMTPS', date: 'Sun, 20 Sep 2026 05:20:00 +0000', delay: 1 }],
    urls: [{ url: 'http://91.240.118.50/account/verify.php?user=employee3', domain: '91.240.118.50', ip: '91.240.118.50', is_ip: true, is_shortener: false, threat_level: 'MALICIOUS' }],
    url_domains: ['91.240.118.50'],
    public_ips: ['91.240.118.50'],
    live_dns: { domain: 'auth-portal-verify365.net', has_mx: false, mx_records: [], spf_record: 'v=spf1 -all', dmarc_record: null, dmarc_policy: 'NONE', status: 'resolved' },
    live_ip: { ip: '91.240.118.50', is_private: false, country: 'Germany', city: 'Frankfurt', isp: 'Host Europe GmbH', org: 'Malicious Cluster', as: 'AS20773' },
    campaign_id: 'CMP-7F2A',
    related_ids: ['demo-sample-5', 'demo-sample-6'],
    raw_headers: 'From: "Microsoft Identity Protect" <admin-account@auth-portal-verify365.net>\nTo: employee3@enterprise.org\nSubject: Security Alert: Unusual Sign-In Activity Detected - Verify Identity'
  }
]

export const MOCK_CAMPAIGNS = [
  {
    id: 'CMP-7F2A',
    title: 'Coordinated M365 Credential Harvest Wave',
    confidence: 96,
    member_count: 3,
    shared_indicators: [
      { type: 'ip', label: 'Shared Origin Server IP (91.240.118.50)', points: 30, values: ['91.240.118.50'] },
      { type: 'domain', label: 'Shared Domain Infrastructure (*.auth-portal-verify365.net)', points: 25, values: ['auth-portal-verify365.net'] },
      { type: 'url', label: 'Shared Phishing Kit URI (/m365/login.php)', points: 20, values: ['http://91.240.118.50/m365/login.php'] },
      { type: 'pattern', label: 'Identical Sender Naming Pattern (admin-*@)', points: 10, values: ['admin-support@ / admin-billing@ / admin-account@'] }
    ],
    disclaimer: 'Correlation indicates shared infrastructure between emails; treat campaign results as investigation leads.',
    created_at: new Date().toISOString(),
    members: [
      { id: 'demo-sample-5', subject: 'Action Required: Microsoft 365 Password Expiration Alert', sender: { address: 'admin-support@auth-portal-verify365.net' }, risk_score: 90, classification: 'CRITICAL' },
      { id: 'demo-sample-6', subject: 'Billing Invoice #8410 Overdue - Immediate Payment Required', sender: { address: 'admin-billing@auth-portal-verify365.net' }, risk_score: 90, classification: 'CRITICAL' },
      { id: 'demo-sample-7', subject: 'Security Alert: Unusual Sign-In Activity Detected - Verify Identity', sender: { address: 'admin-account@auth-portal-verify365.net' }, risk_score: 90, classification: 'CRITICAL' }
    ],
    graph: {
      nodes: [
        { id: 'CMP-7F2A', label: 'Campaign CMP-7F2A', group: 'campaign', radius: 26 },
        { id: 'demo-sample-5', label: 'M365 Password Alert', group: 'email', radius: 18, risk_score: 90, classification: 'CRITICAL' },
        { id: 'demo-sample-6', label: 'Billing Overdue Notice', group: 'email', radius: 18, risk_score: 90, classification: 'CRITICAL' },
        { id: 'demo-sample-7', label: 'Account Re-Auth Notice', group: 'email', radius: 18, risk_score: 90, classification: 'CRITICAL' },
        { id: 'ip-91.240.118.50', label: '91.240.118.50', group: 'ip', radius: 14 },
        { id: 'dom-auth-portal', label: 'auth-portal-verify365.net', group: 'domain', radius: 14 }
      ],
      links: [
        { source: 'CMP-7F2A', target: 'demo-sample-5', value: 3 },
        { source: 'CMP-7F2A', target: 'demo-sample-6', value: 3 },
        { source: 'CMP-7F2A', target: 'demo-sample-7', value: 3 },
        { source: 'demo-sample-5', target: 'ip-91.240.118.50', value: 2 },
        { source: 'demo-sample-6', target: 'ip-91.240.118.50', value: 2 },
        { source: 'demo-sample-7', target: 'ip-91.240.118.50', value: 2 },
        { source: 'demo-sample-5', target: 'dom-auth-portal', value: 2 },
        { source: 'demo-sample-6', target: 'dom-auth-portal', value: 2 },
        { source: 'demo-sample-7', target: 'dom-auth-portal', value: 2 }
      ]
    }
  }
]

export const MOCK_STATS = {
  total: 7,
  critical: 4,
  high: 2,
  medium: 0,
  low: 0,
  safe: 1,
  campaigns: 1,
  distribution: [
    { name: 'CRITICAL', value: 4 },
    { name: 'HIGH', value: 2 },
    { name: 'MEDIUM', value: 0 },
    { name: 'LOW', value: 0 },
    { name: 'SAFE', value: 1 }
  ],
  imap_active: false
}
