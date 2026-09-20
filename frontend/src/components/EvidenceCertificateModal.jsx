import { RiskBadge, CopyButton } from './Bits.jsx'
import { BLOCKCHAIN_CONFIG } from '../services/blockchain.js'
import Logo from './Logo.jsx'

export default function EvidenceCertificateModal({ record, analysis, onClose }) {
  if (!record) return null

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadJSON = () => {
    const proofPackage = {
      title: 'MailTrace AI Cryptographic Evidence Certificate',
      standard: 'RFC-5322 Forensics & Web3 Immutable Chain of Custody',
      blockchain: {
        network: record.network,
        contract: BLOCKCHAIN_CONFIG.contractAddress,
        transaction_hash: record.txHash,
        block_height: record.blockNumber,
        block_timestamp: record.blockTimestamp,
        analyst_wallet: record.analystAddress,
        gas_used: record.gasUsed
      },
      forensic_payload: {
        email_sha256: record.emailHash,
        subject: record.subject,
        sender_domain: record.senderDomain,
        risk_score: record.riskScore,
        classification: record.classification,
        campaign_id: record.campaignId,
        auth_results: analysis?.auth || null,
        indicators_count: analysis?.indicators?.length || 0
      },
      generated_at: new Date().toISOString()
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proofPackage, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `mailtrace_evidence_${record.emailHash.slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--panel)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '16px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.2)',
          padding: '28px',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Logo size={36} />
            <div>
              <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Certificate of Forensic Evidence
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Immutable Distributed Ledger Chain of Custody
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Certificate Seal & Status */}
        <div style={{
          background: 'var(--panel2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 800 }}>
              VERIFICATION STATUS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ color: '#34d399', fontSize: '16px' }}>🛡️</span>
              <span style={{ fontWeight: 800, color: '#34d399', fontSize: '14px' }}>
                CONFIRMED ON {record.network.toUpperCase()}
              </span>
            </div>
          </div>

          <RiskBadge value={record.classification} />
        </div>

        {/* Cryptographic Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
          <div>
            <div style={{ color: 'var(--text-faint)', fontWeight: 700, marginBottom: '3px' }}>
              EMAIL SHA-256 FINGERPRINT (DIGITAL ASSET HASH):
            </div>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{record.emailHash}</span>
              <CopyButton text={record.emailHash} label="" />
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-faint)', fontWeight: 700, marginBottom: '3px' }}>
              ON-CHAIN TRANSACTION HASH (LEDGER RECORD):
            </div>
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text)',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>{record.txHash}</span>
              <CopyButton text={record.txHash} label="" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '6px' }}>
            <div style={{ background: 'var(--panel2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: 700 }}>BLOCK HEIGHT</div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                #{record.blockNumber}
              </div>
            </div>

            <div style={{ background: 'var(--panel2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: 700 }}>BLOCK TIMESTAMP</div>
              <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)', marginTop: '2px' }}>
                {new Date(record.blockTimestamp).toUTCString()}
              </div>
            </div>

            <div style={{ background: 'var(--panel2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: 700 }}>ANALYST WALLET / NODE</div>
              <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {record.analystAddress.slice(0, 10)}...{record.analystAddress.slice(-6)}
              </div>
            </div>

            <div style={{ background: 'var(--panel2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: 700 }}>SMART CONTRACT</div>
              <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {BLOCKCHAIN_CONFIG.contractAddress.slice(0, 10)}...{BLOCKCHAIN_CONFIG.contractAddress.slice(-6)}
              </div>
            </div>
          </div>
        </div>

        {/* Legal / Audit Notice */}
        <div style={{
          marginTop: '18px',
          padding: '12px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.45
        }}>
          🔒 <strong>Tamper-Proof Audit Notice:</strong> This cryptographic certificate links the raw email RFC-5322 headers and threat verdict to an immutable block on the Polygon network. Any post-investigation alteration to the email headers will immediately result in a hash mismatch when verified against this record.
        </div>

        {/* Modal Foot Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button
            onClick={handleDownloadJSON}
            className="btn"
            style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '8px' }}
          >
            📥 Export Proof Package (JSON)
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '8px' }}
          >
            🖨️ Print Certificate
          </button>
        </div>
      </div>
    </div>
  )
}
