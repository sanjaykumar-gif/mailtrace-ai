import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CLASS_COLORS } from '../services/api.js'

export default function ThreatChart({ distribution, data: propData }) {
  const rawData = distribution || propData || []
  const data = rawData.filter((d) => d.value > 0)
  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0)

  if (total === 0) {
    return (
      <div style={{
        width: '100%',
        height: 230,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '10px',
        border: '1px dashed var(--border)',
        padding: '16px'
      }}>
        <div style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '2px solid rgba(56, 189, 248, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          marginBottom: '10px'
        }}>
          📊
        </div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
          0 Threats Logged
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px', textAlign: 'center' }}>
          Standby — Awaiting email telemetry ingress
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 230 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            innerRadius={58} outerRadius={88} paddingAngle={3}
            stroke="#0a1020" strokeWidth={2}>
            {data.map((d) => <Cell key={d.name} fill={CLASS_COLORS[d.name] || '#8ea2cc'} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#111d3a', border: '1px solid #1d2b4d', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: '#e7ecfb' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: -6 }}>
        {Object.entries(CLASS_COLORS).map(([k, c]) => (
          <span className="lg" key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <span className="lg-dot" style={{ background: c }} />{k}
          </span>
        ))}
      </div>
    </div>
  )
}

