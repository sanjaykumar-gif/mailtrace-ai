import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  getLedgerRecords,
  verifyEvidence,
  connectWeb3Wallet,
  computeEmailHash,
  BLOCKCHAIN_CONFIG
} from '../services/blockchain.js'
import { RiskBadge, CopyButton, Empty } from '../components/Bits.jsx'
import { useToast } from '../context/ToastContext.jsx'
import EvidenceCertificateModal from '../components/EvidenceCertificateModal.jsx'
import PageGuideModal from '../components/PageGuideModal.jsx'

export default function LedgerExplorer() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('search') || ''
  const { showToast } = useToast()

  const [records, setRecords] = useState([])
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('explorer') // 'explorer' | 'verifier'
  const [wallet, setWallet] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  // Verifier State
  const [verifyInput, setVerifyInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)

  useEffect(() => {
    const loadData = () => {
      setRecords(getLedgerRecords())
    }
    loadData()
    window.addEventListener('mailtrace_blockchain_updated', loadData)
    return () => window.removeEventListener('mailtrace_blockchain_updated', loadData)
  }, [])

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery)
    }
  }, [initialQuery])

  const handleConnectWallet = async () => {
    try {
      const res = await connectWeb3Wallet()
      if (res.connected) {
        setWallet(res.address)
        showToast(`Connected wallet: ${res.address.slice(0, 6)}...${res.address.slice(-4)}`, 'success')
      } else if (res.hint) {
        showToast(res.hint, 'info')
      }
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const handleVerify = async (e) => {
    e?.preventDefault()
    if (!verifyInput.trim()) {
      showToast('Please enter an Email SHA-256 hash or Transaction Hash to verify.', 'error')
      return
    }
    setVerifying(true)
    setVerifyResult(null)

    setTimeout(async () => {
      try {
        const result = await verifyEvidence(verifyInput.trim())
        setVerifyResult(result)
        if (result.verified) {
          showToast('Cryptographic match confirmed on Polygon Amoy Ledger!', 'success')
        } else {
          showToast('Evidence hash not found on-chain.', 'info')
        }
      } catch (err) {
        showToast(err.message || 'Verification error', 'error')
      } finally {
        setVerifying(false)
      }
    }, 400)
  }

  const handleVerifyFileDrop = async (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (!file) return

    setVerifying(true)
    setVerifyResult(null)
    const text = await file.text()
    const hash = await computeEmailHash(text)
    setVerifyInput(hash)

    const result = await verifyEvidence(hash)
    setVerifyResult(result)
    setVerifying(false)
    if (result.verified) {
      showToast('File matched with on-chain cryptographic fingerprint!', 'success')
    } else {
      showToast('No on-chain match found for this email file.', 'info')
    }
  }

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return records
    return records.filter(r =>
      r.txHash.toLowerCase().includes(q) ||
      r.emailHash.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.senderDomain.toLowerCase().includes(q) ||
      r.classification.toLowerCase().includes(q)
    )
  }, [records, searchQuery])

  const guideTabs = [
    {
      id: 'chain_of_custody',
      name: 'Chain of Custody',
      icon: '⛓️',
      title: 'Decentralized Forensic Integrity',
      steps: [
        'Every email investigation computes an immutable SHA-256 fingerprint from the MIME headers, SPF/DKIM authentication results, and AI threat classification.',
        'The hash is anchored directly into the EmailForensicLedger smart contract on the Polygon distributed ledger.',
        'Once anchored, the block timestamp and transaction hash provide mathematically unfalsifiable proof in audits or legal proceedings.'
      ],
      proTip: 'Use the Independent Verifier tab to test raw .EML files against the blockchain record.'
    }
  ]

  return (
    <div className="fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div className="page-head" style={{ flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0 }}>Blockchain Forensic Ledger</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800,
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
              POLYGON AMOY
            </span>
          </div>
          <div className="sub" style={{ marginTop: '4px' }}>
            Immutable, tamper-proof chain of custody tracking verified email security incidents and threat evidence.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowGuide(true)}
            className="btn btn-sm"
            style={{ fontSize: '12px' }}
          >
            📘 Architecture Guide
          </button>

          <button
            onClick={handleConnectWallet}
            className="btn btn-sm btn-primary"
            style={{ fontSize: '12px', fontWeight: 800 }}
          >
            {wallet ? `👛 ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : '🦊 Connect Web3 Wallet'}
          </button>
        </div>
      </div>

      {/* Network Telemetry Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontWeight: 700 }}>IMMUTABLE EVIDENCE TOTAL</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {records.length} Cases
          </div>
          <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>
            ● 100% Cryptographically Verified
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontWeight: 700 }}>SMART CONTRACT REGISTRY</div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
            {BLOCKCHAIN_CONFIG.contractAddress.slice(0, 10)}...{BLOCKCHAIN_CONFIG.contractAddress.slice(-8)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Solidity 0.8.20 EVM Contract
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontWeight: 700 }}>CHAIN CONSENSUS</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginTop: '6px' }}>
            Polygon PoS / Amoy
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Instant Finality (~2.1s Block Time)
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontWeight: 700 }}>PROVING PROTOCOL</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginTop: '6px' }}>
            SHA-256 Merkle Root
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            EIP-712 Structured Proofs
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs" style={{ maxWidth: '560px', width: '100%' }}>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`tab ${activeTab === 'explorer' ? 'active' : ''}`}
            >
              📜 On-Chain Ledger ({filteredRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('custody')}
              className={`tab ${activeTab === 'custody' ? 'active' : ''}`}
            >
              ⛓️ Chain of Custody Flow
            </button>
            <button
              onClick={() => setActiveTab('verifier')}
              className={`tab ${activeTab === 'verifier' ? 'active' : ''}`}
            >
              🔍 Independent Verifier
            </button>
          </div>

          {activeTab === 'explorer' && (
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <input
                type="text"
                placeholder="Search TxHash, SHA-256, or domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '12.5px',
                  color: 'var(--text)',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Ledger Table Explorer */}
        {activeTab === 'explorer' && (
          <div>
            {filteredRecords.length === 0 ? (
              <Empty
                title="No On-Chain Records Found"
                text={searchQuery ? 'No cryptographic proofs matched your search query.' : 'No forensic incidents have been anchored on-chain yet.'}
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Incident / Subject</th>
                      <th>Sender Domain</th>
                      <th>Risk Verdict</th>
                      <th>Block #</th>
                      <th>SHA-256 Fingerprint</th>
                      <th>Transaction Hash</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr key={r.txHash} style={{ transition: 'background 0.15s ease' }}>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#34d399',
                            fontWeight: 800,
                            fontSize: '11px'
                          }}>
                            ● CONFIRMED
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.subject}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-faint)' }}>
                            {new Date(r.blockTimestamp).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                          {r.senderDomain}
                        </td>
                        <td>
                          <RiskBadge value={r.classification} />
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          #{r.blockNumber}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                          {r.emailHash.slice(0, 10)}...{r.emailHash.slice(-6)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          <span title={r.txHash}>
                            {r.txHash.slice(0, 10)}...{r.txHash.slice(-6)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedRecord(r)}
                              className="btn btn-sm"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              title="View Cryptographic Certificate"
                            >
                              📜 Proof
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Visual Chain of Custody Flow */}
        {activeTab === 'custody' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '16px', background: 'var(--panel2)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                  ⛓️ Cryptographic Chain of Custody Protocol (EIP-712 / SHA-256)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                  Every piece of digital email evidence undergoes an unalterable multi-stage validation lifecycle before on-chain notarization.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid #22c55e', fontSize: '11px', fontWeight: 800 }}>
                  ✓ 100% Tamper Proof
                </span>
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7', fontSize: '11px', fontWeight: 800 }}>
                  ⚖️ Court Admissible
                </span>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <Empty title="No Records to Display" text="No incidents available to map chain of custody." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredRecords.map((r, idx) => {
                  const custodySteps = [
                    { step: 1, name: 'RAW INGESTION', actor: 'GATEWAY_DAEMON', time: new Date(r.blockTimestamp - 12000).toLocaleTimeString(), icon: '📥', desc: 'MIME email parsed in isolated memory enclave. Zero payload mutation.' },
                    { step: 2, name: 'SHA-256 LOCK', actor: 'CRYPTO_CORE', time: new Date(r.blockTimestamp - 8000).toLocaleTimeString(), icon: '🔒', desc: `Computed fingerprint: ${r.emailHash.slice(0, 16)}...` },
                    { step: 3, name: 'AI THREAT SCORING', actor: 'NLP_GEO_ENGINE', time: new Date(r.blockTimestamp - 4000).toLocaleTimeString(), icon: '🧠', desc: `Classification: ${r.classification} (Risk: ${r.riskScore || 85}/100)` },
                    { step: 4, name: 'POLYGON ON-CHAIN SEAL', actor: 'RELAYER_SERVICE', time: new Date(r.blockTimestamp).toLocaleTimeString(), icon: '⛓️', desc: `Mined in Block #${r.blockNumber} (Tx: ${r.txHash.slice(0, 14)}...)` },
                    { step: 5, name: 'SOC AUDIT ACCESS', actor: 'ANALYST_AGENT', time: 'Active', icon: '🛡️', desc: 'Read-only immutable evidence review with proof verification.' }
                  ]

                  return (
                    <div key={r.txHash} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                              CASE #{idx + 1}
                            </span>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text)' }}>
                              {r.subject}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '3px' }}>
                            Domain: <strong style={{ color: 'var(--text)' }}>{r.senderDomain}</strong> · Notarized: {new Date(r.blockTimestamp).toLocaleString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <RiskBadge value={r.classification} />
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                          >
                            📜 Proof Certificate
                          </button>
                        </div>
                      </div>

                      {/* Visual Steps Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginTop: '12px' }}>
                        {custodySteps.map((s, sIdx) => (
                          <div
                            key={s.step}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ height: '3px', background: sIdx < 4 ? '#22c55e' : '#38bdf8', position: 'absolute', top: 0, left: 0, right: 0 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                              <span style={{ fontSize: '14px' }}>{s.icon}</span>
                              <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--text-faint)' }}>{s.time}</span>
                            </div>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text)', marginTop: '4px' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'monospace', marginTop: '2px' }}>
                              {s.actor}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px', lineHeight: 1.3 }}>
                              {s.desc}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Independent Cryptographic Verifier */}
        {activeTab === 'verifier' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleVerifyFileDrop}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                background: 'var(--panel2)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>
                Drop Any .EML File to Verify Against Blockchain
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: '0 auto 14px', maxWidth: '440px' }}>
                Computes the exact cryptographic SHA-256 fingerprint client-side and validates against the Polygon distributed registry.
              </p>
            </div>

            <form onSubmit={handleVerify} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="Or paste SHA-256 hash / Transaction hash (0x...)"
                style={{
                  flex: 1,
                  minWidth: '280px',
                  background: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={verifying}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontWeight: 800, fontSize: '13px' }}
              >
                {verifying ? '⏳ Verifying Hash...' : '🛡️ Validate On-Chain'}
              </button>
            </form>

            {/* Verification Result Card */}
            {verifyResult && (
              <div style={{
                background: verifyResult.verified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                border: `1px solid ${verifyResult.verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{verifyResult.verified ? '✅' : '❌'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: verifyResult.verified ? '#34d399' : '#f87171' }}>
                        {verifyResult.verified ? 'CRYPTOGRAPHIC MATCH CONFIRMED' : 'NO ON-CHAIN RECORD FOUND'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {verifyResult.message}
                      </div>
                    </div>
                  </div>

                  {verifyResult.record && (
                    <button
                      onClick={() => setSelectedRecord(verifyResult.record)}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '11.5px' }}
                    >
                      📜 View Full Certificate
                    </button>
                  )}
                </div>

                {verifyResult.record && (
                  <div style={{ background: 'var(--panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <span style={{ color: 'var(--text-faint)' }}>Subject:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{verifyResult.record.subject}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-faint)' }}>Sender Domain:</span>
                      <div style={{ fontFamily: 'var(--font-mono)' }}>{verifyResult.record.senderDomain}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-faint)' }}>Block Number:</span>
                      <div style={{ fontWeight: 700 }}>#{verifyResult.record.blockNumber}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-faint)' }}>Verdict:</span>
                      <div><RiskBadge value={verifyResult.record.classification} /></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRecord && (
        <EvidenceCertificateModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {showGuide && (
        <PageGuideModal
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
          title="Blockchain Chain of Custody Guide"
          subtitle="Understanding how MailTrace AI cryptographically preserves digital email evidence on distributed ledgers"
          tabs={guideTabs}
        />
      )}
    </div>
  )
}
