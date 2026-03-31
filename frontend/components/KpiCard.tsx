interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  accent?: 'green' | 'yellow' | 'red' | 'gray'
}

const STYLES: Record<string, {
  bg: string; border: string; iconBg: string; value: string; badge: string
}> = {
  green: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
    border: '1px solid #bbf7d0',
    iconBg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    value: '#15803d',
    badge: '#15803d',
  },
  yellow: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #fefce8 100%)',
    border: '1px solid #fde68a',
    iconBg: 'linear-gradient(135deg, #fef9c3, #fde68a)',
    value: '#a16207',
    badge: '#a16207',
  },
  red: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #fff1f2 100%)',
    border: '1px solid #fecaca',
    iconBg: 'linear-gradient(135deg, #ffe4e6, #fecaca)',
    value: '#dc2626',
    badge: '#dc2626',
  },
  gray: {
    bg: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid #e2e8f0',
    iconBg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    value: '#334155',
    badge: '#64748b',
  },
}

export default function KpiCard({ title, value, subtitle, icon, accent = 'green' }: KpiCardProps) {
  const s = STYLES[accent]
  return (
    <div
      className="card-lift"
      style={{
        background: s.bg,
        border: s.border,
        borderRadius: '16px',
        padding: '22px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle decorative circle */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: s.iconBg, opacity: 0.5,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '10.5px', fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            color: '#94a3b8', margin: 0,
          }}>
            {title}
          </p>
          <p style={{
            fontSize: '30px', fontWeight: '800',
            marginTop: '10px', color: s.value,
            lineHeight: 1, letterSpacing: '-0.5px',
          }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{
          width: '46px', height: '46px',
          background: s.iconBg,
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '23px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          flexShrink: 0, marginLeft: '12px',
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}
