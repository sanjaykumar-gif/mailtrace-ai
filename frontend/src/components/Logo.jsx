import React from 'react'

export default function Logo({ size = 34, showText = true, className = '', subtitle = 'Threat Intelligence' }) {
  const uid = React.useId?.() || 'mt-logo'
  const id = (name) => `${uid}-${name}`

  return (
    <div
      className={`logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        userSelect: 'none',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* MailTrace AI — Cybernetic Shield & Origami Neural Mail Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter: 'drop-shadow(0 4px 16px rgba(56, 189, 248, 0.4))'
        }}
      >
        <defs>
          {/* Main Shield Outer Gradient (Deep Cobalt to Electric Cyan & Mint) */}
          <linearGradient id={id('outerShield')} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#0ea5e9" />
            <stop offset="70%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Inner Dark Glass Bevel */}
          <linearGradient id={id('innerBevel')} x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0b1329" />
            <stop offset="100%" stopColor="#060913" />
          </linearGradient>

          {/* Mail Wings Gradient */}
          <linearGradient id={id('mailWings')} x1="16" y1="20" x2="48" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Glowing Radar Pulse Gradient */}
          <radialGradient id={id('pulseGlow')} cx="32" cy="31" r="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>

          {/* Laser Glow Filter */}
          <filter id={id('laserFilter')} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Outer Hexagonal Cyber Shield */}
        <path
          d="M32 3L8 12.5V28.5C8 43.5 19 55.5 32 60.5C45 55.5 56 43.5 56 28.5V12.5L32 3Z"
          fill={`url(#${id('outerShield')})`}
        />

        {/* 2. Inner Dark Beveled Aegis */}
        <path
          d="M32 6.5L11.5 14.8V27.8C11.5 40.8 20.8 51.5 32 56C43.2 51.5 52.5 40.8 52.5 27.8V14.8L32 6.5Z"
          fill={`url(#${id('innerBevel')})`}
          stroke="rgba(56, 189, 248, 0.45)"
          strokeWidth="0.9"
        />

        {/* 3. Ambient Neural Core Glow */}
        <circle cx="32" cy="31" r="15" fill={`url(#${id('pulseGlow')})`} />

        {/* 4. Circuit Traces & Forensic Grid */}
        <g stroke="#10b981" strokeWidth="1" strokeLinecap="round" opacity="0.6">
          <path d="M15 22H20V26" />
          <path d="M15 36H18L21 39" />
          <circle cx="15" cy="22" r="1.3" fill="#10b981" />
          <circle cx="21" cy="39" r="1.3" fill="#10b981" />
          <path d="M49 22H44V26" />
          <path d="M49 36H46L43 39" />
          <circle cx="49" cy="22" r="1.3" fill="#10b981" />
          <circle cx="43" cy="39" r="1.3" fill="#10b981" />
        </g>

        {/* 5. Aerodynamic Geometric Origami Mail Wings */}
        <path
          d="M18 20L32 32L46 20"
          stroke="#38bdf8"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${id('laserFilter')})`}
        />
        <path
          d="M18 20V40C18 41 19 42 20 42H44C45 42 46 41 46 40V20"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Forensic Crosshair & Central AI Beacon */}
        <g stroke="#38bdf8" strokeWidth="1.2" opacity="0.85">
          <line x1="32" y1="21" x2="32" y2="41" />
          <line x1="22" y1="31" x2="42" y2="31" />
          <circle cx="32" cy="31" r="5" fill="none" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="3 2" />
        </g>

        {/* 7. High-Luminance Center Spark */}
        <circle cx="32" cy="31" r="2.8" fill="#38bdf8" filter={`url(#${id('laserFilter')})`} />
        <circle cx="32" cy="31" r="1.5" fill="#ffffff" />
      </svg>

      {/* Modern High-Craft Wordmark */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '0.4px',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>MAIL<span style={{ color: 'var(--accent)', textShadow: '0 0 12px var(--accent-glow)' }}>TRACE</span></span>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.9px',
              padding: '2px 6px',
              borderRadius: '5px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(14, 165, 233, 0.45)'
            }}>
              AI
            </span>
          </div>
          <span style={{
            fontSize: '9.5px',
            fontWeight: 700,
            color: 'var(--text-faint)',
            letterSpacing: '0.7px',
            marginTop: '3px',
            textTransform: 'uppercase'
          }}>
            {subtitle}
          </span>
        </div>
      )}
    </div>
  )
}
