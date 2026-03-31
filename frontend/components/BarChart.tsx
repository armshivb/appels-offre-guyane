'use client'
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface Props {
  data: Array<{ label: string; count: number }>
  title: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(20, 83, 45, 0.95)', color: 'white',
      padding: '8px 14px', borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      fontSize: '13px', fontWeight: '600',
    }}>
      <p style={{ margin: 0, color: '#d1fae5', fontSize: '11px' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: '800' }}>{payload[0].value}</p>
    </div>
  )
}

export default function BarChart({ data, title }: Props) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1.5px solid #e2e8f0', padding: '20px 20px 12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#14532d', margin: '0 0 16px' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ReBarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
          <defs>
            <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#15803d" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(21, 128, 61, 0.05)' }} />
          <Bar dataKey="count" fill="url(#barGreen)" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.count === max ? '#15803d' : 'url(#barGreen)'}
                opacity={entry.count === max ? 1 : 0.75}
              />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
