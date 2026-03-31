'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

interface Props {
  data: Array<{ acheteur: string; count: number }>
  title: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullName: string; count: number } }> }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(161, 98, 7, 0.95)', color: 'white',
      padding: '8px 14px', borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '13px',
      maxWidth: '240px',
    }}>
      <p style={{ margin: 0, color: '#fef9c3', fontSize: '11px', lineHeight: 1.4 }}>
        {payload[0].payload.fullName}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: '800' }}>
        {payload[0].payload.count} AO
      </p>
    </div>
  )
}

export default function HorizontalBarChart({ data, title }: Props) {
  const max = Math.max(...data.map(d => d.count), 1)
  const chartData = data.map(d => ({
    name: d.acheteur.length > 32 ? d.acheteur.substring(0, 32) + '…' : d.acheteur,
    count: d.count,
    fullName: d.acheteur,
  }))

  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1.5px solid #e2e8f0', padding: '20px 20px 12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#14532d', margin: '0 0 16px' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="barYellow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis
            type="category" dataKey="name"
            tick={{ fontSize: 10.5, fill: '#475569' }}
            axisLine={false} tickLine={false} width={150}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(234, 179, 8, 0.06)' }} />
          <Bar dataKey="count" fill="url(#barYellow)" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.count === max ? '#eab308' : 'url(#barYellow)'}
                opacity={entry.count === max ? 1 : 0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
