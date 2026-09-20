import React from 'react'

export default function MailScannerIllustration({ scanning = false, dragOver = false, size = 110 }) {
  const uid = React.useId?.() || 'msi'
  const id = (name) => `${uid}-${name}`

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className={dragOver ? 'drag-active-illustration' : ''}
    >
      {/* Background Animated Radar Wave */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          animation: scanning ? 'pulseRadar 1.2s infinite ease-out' : dragOver ? 'pulseRadar 0.8s infinite ease-out' : 'none',
          opacity: scanning || dragOver ? 0.9 : 0.4,
          filter: 'blur(8px)'
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible', filter: 'drop-shadow(0 8px 24px rgba(56, 189, 248, 0.25))' }}
      >
        <defs>
          {/* Cyber Mail Gradients */}
          <linearGradient id={id('mailBody')} x1="20" y1="35" x2="100" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id={id('mailFlap')} x1="20" y1="35" x2="60" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <linearGradient id={id('laserGlow')} x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>

          <linearGradient id={id('shieldGrad')} x1="45" y1="15" x2="75" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          <filter id={id('glow')} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Ring */}
        <circle
          cx="60"
          cy="60"
          r="52"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          strokeOpacity={scanning ? '0.8' : '0.3'}
          style={{
            animation: scanning ? 'spinClockwise 8s infinite linear' : 'none',
            transformOrigin: '60px 60px'
          }}
        />

        {/* Inner Tech Ring */}
        <circle
          cx="60"
          cy="60"
          r="44"
          stroke="rgba(56, 189, 248, 0.2)"
          strokeWidth="1"
        />

        {/* --- MAIN ENVELOPE BASE --- */}
        <rect
          x="24"
          y="38"
          width="72"
          height="48"
          rx="8"
          fill={`url(#${id('mailBody')})`}
          stroke="var(--accent)"
          strokeWidth="1.8"
        />

        {/* Envelope Interior Lining / Tech Grid */}
        <path
          d="M26 42L60 66L94 42"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        <path
          d="M26 84L48 62"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M94 84L72 62"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Data lines inside envelope */}
        <line x1="38" y1="70" x2="62" y2="70" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="75" x2="52" y2="75" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Floating Security Badge / Shield on top of Envelope */}
        <g filter={`url(#${id('glow')})`} transform="translate(0, -2)">
          <path
            d="M60 18L76 25V40C76 50 69 57 60 60C51 57 44 50 44 40V25L60 18Z"
            fill={`url(#${id('shieldGrad')})`}
            opacity="0.95"
          />
          <path
            d="M60 22L72 27.5V39C72 47 67 52.5 60 55C53 52.5 48 47 48 39V27.5L60 22Z"
            fill="#090d16"
          />
          {/* Central Check/Spark Motif */}
          <path
            d="M54 38L58 42L67 33"
            stroke="#38bdf8"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Scanning Laser Beam (Visible when scanning or dragging) */}
        {(scanning || dragOver) && (
          <g>
            <line
              x1="16"
              y1="60"
              x2="104"
              y2="60"
              stroke={`url(#${id('laserGlow')})`}
              strokeWidth="3.5"
              filter={`url(#${id('glow')})`}
              style={{
                animation: 'laserScan 1.6s infinite ease-in-out'
              }}
            />
          </g>
        )}

        {/* Tech Corner Markers */}
        <path d="M20 28V20H28" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M100 28V20H92" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M20 92V100H28" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <path d="M100 92V100H92" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>

      <style>{`
        @keyframes pulseRadar {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes spinClockwise {
          100% { transform: rotate(360deg); }
        }
        @keyframes laserScan {
          0%, 100% { transform: translateY(-22px); }
          50% { transform: translateY(22px); }
        }
        .drag-active-illustration {
          transform: scale(1.08);
        }
      `}</style>
    </div>
  )
}
