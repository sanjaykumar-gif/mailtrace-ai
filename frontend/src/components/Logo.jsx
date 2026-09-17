import React from 'react'

export default function Logo({ size = 32, showText = true, className = '' }) {
  // Unique ID prefix to avoid SVG filter/gradient collisions when multiple logos render
  const uid = React.useId?.() || 'mt'
  const id = (n) => `${uid}-${n}`

  return (
    <div
      className={`logo-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}
    >
      {/* MailTrace AI — Shield + Neural-Core + Envelope Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Shield body gradient — cyan-to-teal */}
          <linearGradient id={id('shieldBody')} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>

          {/* Inner dark panel */}
          <linearGradient id={id('innerPanel')} x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f2035" />
            <stop offset="100%" stopColor="#0c1a2e" />
          </linearGradient>

          {/* Neural core glow */}
          <radialGradient id={id('coreGlow')} cx="32" cy="32" r="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>

          {/* Outer glow filter */}
          <filter id={id('outerGlow')} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feFlood floodColor="#38bdf8" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop-shadow for shield */}
          <filter id={id('shieldShadow')} x="-20%" y="-10%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* === OUTER SHIELD === */}
        <path
          d="M32 4L8 13V28C8 42 18.5 53.5 32 58C45.5 53.5 56 42 56 28V13L32 4Z"
          fill={`url(#${id('shieldBody')})`}
          filter={`url(#${id('shieldShadow')})`}
        />

        {/* === INNER DARK PANEL (beveled inset) === */}
        <path
          d="M32 8L12.5 15.5V27C12.5 39.2 21.2 49.5 32 53.2C42.8 49.5 51.5 39.2 51.5 27V15.5L32 8Z"
          fill={`url(#${id('innerPanel')})`}
          stroke="rgba(56,189,248,0.35)"
          strokeWidth="0.8"
        />

        {/* === CIRCUIT TRACES (left side) === */}
        <g stroke="#14b8a6" strokeWidth="0.9" strokeLinecap="round" opacity="0.55">
          <path d="M17 22H22V28" />
          <path d="M17 36H20L22 38" />
          <path d="M19 28H16" />
          <circle cx="16" cy="22" r="1.2" fill="#14b8a6" />
          <circle cx="16" cy="28" r="1" fill="#14b8a6" />
          <circle cx="22" cy="38" r="1" fill="#14b8a6" />
        </g>

        {/* === CIRCUIT TRACES (right side) === */}
        <g stroke="#14b8a6" strokeWidth="0.9" strokeLinecap="round" opacity="0.55">
          <path d="M47 22H42V28" />
          <path d="M47 36H44L42 38" />
          <path d="M45 28H48" />
          <circle cx="48" cy="22" r="1.2" fill="#14b8a6" />
          <circle cx="48" cy="28" r="1" fill="#14b8a6" />
          <circle cx="42" cy="38" r="1" fill="#14b8a6" />
        </g>

        {/* === ENVELOPE FLAP (V shape — the mail motif) === */}
        <path
          d="M20 20L32 30L44 20"
          stroke="#38bdf8"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* Envelope side edges */}
        <path
          d="M20 20V40H44V20"
          stroke="#38bdf8"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
          fill="none"
        />

        {/* === NEURAL NETWORK CORE (central AI sphere) === */}
        {/* Ambient glow behind */}
        <circle cx="32" cy="32" r="12" fill={`url(#${id('coreGlow')})`} />

        {/* Network connections */}
        <g stroke="#22d3ee" strokeWidth="0.8" opacity="0.7">
          {/* Hexagonal web of lines */}
          <line x1="32" y1="25" x2="37" y2="28" />
          <line x1="37" y1="28" x2="37" y2="34" />
          <line x1="37" y1="34" x2="32" y2="37" />
          <line x1="32" y1="37" x2="27" y2="34" />
          <line x1="27" y1="34" x2="27" y2="28" />
          <line x1="27" y1="28" x2="32" y2="25" />
          {/* Cross links */}
          <line x1="32" y1="25" x2="32" y2="37" />
          <line x1="27" y1="28" x2="37" y2="34" />
          <line x1="37" y1="28" x2="27" y2="34" />
          {/* Outer spokes */}
          <line x1="32" y1="25" x2="32" y2="21" />
          <line x1="37" y1="28" x2="40" y2="26" />
          <line x1="37" y1="34" x2="40" y2="36" />
          <line x1="32" y1="37" x2="32" y2="41" />
          <line x1="27" y1="34" x2="24" y2="36" />
          <line x1="27" y1="28" x2="24" y2="26" />
        </g>

        {/* Network nodes */}
        <g filter={`url(#${id('outerGlow')})`}>
          <circle cx="32" cy="25" r="1.8" fill="#38bdf8" />
          <circle cx="37" cy="28" r="1.5" fill="#38bdf8" />
          <circle cx="37" cy="34" r="1.5" fill="#38bdf8" />
          <circle cx="32" cy="37" r="1.8" fill="#38bdf8" />
          <circle cx="27" cy="34" r="1.5" fill="#38bdf8" />
          <circle cx="27" cy="28" r="1.5" fill="#38bdf8" />
          {/* Outer nodes */}
          <circle cx="32" cy="21" r="1.2" fill="#22d3ee" />
          <circle cx="40" cy="26" r="1.2" fill="#22d3ee" />
          <circle cx="40" cy="36" r="1.2" fill="#22d3ee" />
          <circle cx="32" cy="41" r="1.2" fill="#22d3ee" />
          <circle cx="24" cy="36" r="1.2" fill="#22d3ee" />
          <circle cx="24" cy="26" r="1.2" fill="#22d3ee" />
        </g>

        {/* Central bright core */}
        <circle cx="32" cy="31" r="3" fill="#0ea5e9" opacity="0.5" />
        <circle cx="32" cy="31" r="1.8" fill="#ffffff" opacity="0.9" />
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
              background: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(14, 165, 233, 0.4)'
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
