import React from 'react'

export default function Logo({ size = 32, showText = true, className = '' }) {
  return (
    <div
      className={`logo-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}
    >
      {/* Precision Vector Shield-Envelope Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>

          <linearGradient id="mailGrad" x1="12" y1="14" x2="36" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="glowGlow" x1="24" y1="16" x2="24" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>

          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Defensive Shield */}
        <path
          d="M24 4L8 10V22C8 31.8 14.8 40.8 24 44C33.2 40.8 40 31.8 40 22V10L24 4Z"
          fill="url(#shieldGrad)"
          filter="url(#subtleGlow)"
        />

        {/* Inner Shield Bevel / Inset */}
        <path
          d="M24 6.8L10.5 11.8V21.5C10.5 29.8 16.3 37.4 24 40.2C31.7 37.4 37.5 29.8 37.5 21.5V11.8L24 6.8Z"
          fill="#1e293b"
          stroke="rgba(56, 189, 248, 0.4)"
          strokeWidth="1"
        />

        {/* Inner ambient glow */}
        <path
          d="M24 6.8L10.5 11.8V21.5C10.5 29.8 16.3 37.4 24 40.2C31.7 37.4 37.5 29.8 37.5 21.5V11.8L24 6.8Z"
          fill="url(#glowGlow)"
        />

        {/* Folded Mail Origami Facets */}
        {/* Top Flap */}
        <path
          d="M15 17L24 24L33 17"
          stroke="#38bdf8"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Mail Body Frame */}
        <path
          d="M15 17H33V29C33 30.1 32.1 31 31 31H17C15.9 31 15 30.1 15 29V17Z"
          stroke="#bae6fd"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Trace Route Connection Lines (Forensic DNA Network) */}
        <path
          d="M18 31L24 24L30 31"
          stroke="#2dd4bf"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 2"
        />

        {/* Central Verified Beacon Node */}
        <circle cx="24" cy="24" r="3" fill="#38bdf8" />
        <circle cx="24" cy="24" r="1.2" fill="#ffffff" />
      </svg>

      {/* Modern High-Craft Wordmark */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '0.5px',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>MAIL<span style={{ color: 'var(--accent)' }}>TRACE</span></span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              padding: '2px 5px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
            }}>
              AI
            </span>
          </div>
          <span style={{
            fontSize: '9.5px',
            fontWeight: 600,
            color: 'var(--text-faint)',
            letterSpacing: '0.4px',
            marginTop: '3px',
            textTransform: 'uppercase'
          }}>
            Threat Intelligence
          </span>
        </div>
      )}
    </div>
  )
}
