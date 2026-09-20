import React, { useState } from 'react'

export default function PageGuideModal({ isOpen, onClose, title, subtitle, tabs = [] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')

  if (!isOpen) return null

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0]

  return (
    <div
      className="guide-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
      onClick={onClose}
    >
      <div
        className="card fade-in guide-modal-content"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          background: 'var(--panel-solid)',
          border: '1px solid var(--accent)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0, lineHeight: 1.45 }}>
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm"
            style={{ padding: '6px 12px', fontSize: '1rem', flexShrink: 0, borderRadius: '8px' }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        {tabs.length > 1 && (
          <div className="tabs guide-tabs" style={{ width: '100%', flexWrap: 'wrap', gap: '4px' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab ${(currentTab?.id || activeTab) === t.id ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '7px 12px', minWidth: 'fit-content' }}
              >
                {t.icon && <span style={{ marginRight: 6 }}>{t.icon}</span>}
                {t.label || t.name}
              </button>
            ))}
          </div>
        )}

        {/* Step-by-Step Content */}
        {currentTab && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Overview / Title Header */}
            {currentTab.title && (
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--accent)', marginTop: '2px' }}>
                {currentTab.title}
              </div>
            )}

            {currentTab.overview && (
              <div style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-glow)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: 'var(--accent)',
                lineHeight: 1.45
              }}>
                💡 {currentTab.overview}
              </div>
            )}

            {currentTab.steps?.map((s, idx) => (
              <div key={idx} style={{
                background: 'var(--panel2)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '11px',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  {idx + 1}
                </span>
                {typeof s === 'string' ? (
                  <div style={{ flex: 1, fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    {s}
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text)', marginBottom: '2px' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {s.desc}
                    </div>
                    {s.tip && (
                      <div style={{ fontSize: '0.74rem', color: '#fbbf24', marginTop: '4px' }}>
                        ⚡ <em>Pro Tip: {s.tip}</em>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pro Tip Callout */}
            {currentTab.proTip && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#fbbf24',
                lineHeight: 1.45,
                marginTop: '4px'
              }}>
                ⚡ <strong>SOC Pro-Tip:</strong> {currentTab.proTip}
              </div>
            )}

            {/* Action Link Button */}
            {currentTab.actionLink && (
              <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                <a
                  href={currentTab.actionLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.6rem', fontSize: '0.88rem', display: 'inline-flex' }}
                >
                  {currentTab.actionLink.label} ↗
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
