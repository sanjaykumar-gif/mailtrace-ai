import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  computeEmailHash,
  anchorEvidenceOnChain,
  getLedgerRecords,
  BLOCKCHAIN_CONFIG
} from '../services/blockchain.js'
import { useToast } from '../context/ToastContext.jsx'
import EvidenceCertificateModal from './EvidenceCertificateModal.jsx'

export default function BlockchainProofBadge({ analysis }) {
  const { showToast } = useToast()
  const [anchoring, setAnchoring] = useState(false)
  const [record, setRecord] = useState(null)
  const [showCertificate, setShowCertificate] = useState(false)

  useEffect(() => {
    if (!analysis) return
    let isMounted = true

    const findRecord = async () => {
      const emailHash = await computeEmailHash(analysis)
      const records = getLedgerRecords()
      const match = records.find(r => r.emailHash.toLowerCase() === emailHash.toLowerCase())
      if (isMounted) {
        setRecord(match || null)
      }
    }

    findRecord()
    window.addEventListener('mailtrace_blockchain_updated', findRecord)
    return () => {
      isMounted = false
      window.removeEventListener('mailtrace_blockchain_updated', findRecord)
    }
  }, [analysis])

  const handleAnchor = async () => {
    if (!analysis) return
    setAnchoring(true)
    try {
      const newRecord = await anchorEvidenceOnChain(analysis)
      setRecord(newRecord)
      showToast('Forensic SHA-256 evidence anchored on Polygon Amoy Ledger!', 'success')
    } catch (e) {
      showToast(e.message || 'Anchoring failed', 'error')
    } finally {
      setAnchoring(false)
    }
  }

  if (!analysis) return null

  return (
    <>
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(56, 189, 248, 0.04))',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginTop: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Left: Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0
          }}>
            ⛓️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)' }}>
                Immutable Forensic Chain of Custody
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px',
                background: record ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: record ? '#34d399' : '#fbbf24',
                border: record ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                {record ? '● ANCHORED ON-CHAIN' : '○ PENDING ANCHOR'}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
              {record ? (
                <>
                  Tx: <span style={{ color: 'var(--accent)' }}>{record.txHash.slice(0, 14)}...{record.txHash.slice(-8)}</span>
                  {' '}• Block #{record.blockNumber} ({record.network})
                </>
              ) : (
                'Cryptographic SHA-256 fingerprint generated & ready for blockchain registration'
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {record ? (
            <>
              <button
                onClick={() => setShowCertificate(true)}
                className="btn btn-sm"
                style={{
                  fontSize: '11.5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'var(--panel2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  fontWeight: 700
                }}
              >
                📜 View Certificate
              </button>
              <Link
                to={`/ledger?search=${record.txHash}`}
                className="btn btn-sm btn-primary"
                style={{
                  fontSize: '11.5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                🔍 Ledger Explorer →
              </Link>
            </>
          ) : (
            <button
              onClick={handleAnchor}
              disabled={anchoring}
              className="btn btn-sm btn-primary"
              style={{
                fontSize: '12px',
                padding: '7px 16px',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: anchoring ? 'wait' : 'pointer'
              }}
            >
              {anchoring ? '⏳ Anchoring to Polygon...' : '⛓️ Anchor Evidence On-Chain'}
            </button>
          )}
        </div>
      </div>

      {showCertificate && record && (
        <EvidenceCertificateModal
          record={record}
          analysis={analysis}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </>
  )
}
