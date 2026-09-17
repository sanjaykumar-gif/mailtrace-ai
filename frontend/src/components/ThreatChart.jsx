import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CLASS_COLORS } from '../services/api.js'

export default function ThreatChart({ distribution }) {
  const data = (distribution || []).filter((d) => d.value > 0)
  if (!data.length) return null
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
