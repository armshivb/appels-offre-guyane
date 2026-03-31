'use client'
import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const COLORS = ['#15803d', '#eab308', '#0ea5e9', '#f97316', '#8b5cf6', '#ec4899']
const LIGHT  = ['#dcfce7', '#fef9c3', '#e0f2fe', '#ffedd5', '#ede9fe', '#fce7f3']

interface Props {
  data: Array<{ name: string; value: number }>
  title: string
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string } }> }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.9)', color: 'white',
      padding: '8px 14px', borderRadius: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      fontSize: '13px',
    }}>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: '11px' }}>{payload[0].name}</p>
      <p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: '800' }}>{payload[0].value}</p>
    </div>
  )
}

export default function PieChart({ data, title }: Props) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      border: '1.5px solid #e2e8f0', padding: '20px 20px 12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#14532d', margin: '0 0 16px' }}>{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RePieChart>
          <defs>
            {COLORS.map((color, i) => (
              <radialGradient key={i} id={`pieGrad${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={LIGHT[i % LIGHT.length]} />
                <stop offset="100%" stopColor={color} />
              </radialGradient>
            ))}
          </defs>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={65} outerRadius={105}
            paddingAngle={4} dataKey="value"
            strokeWidth={2} stroke="white"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle" iconSize={10}
            formatter={(value) => <span style={{ fontSize: '12px', color: '#374151' }}>{value}</span>}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  )
}
