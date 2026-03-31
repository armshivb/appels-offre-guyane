'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { triggerScrape } from '@/lib/api'

export default function Navbar() {
  const pathname = usePathname()
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ text: string; ok: boolean } | null>(null)

  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    try {
      const result = await triggerScrape()
      setScrapeResult({ text: `✓ ${result.new} nouvelles annonces`, ok: true })
    } catch {
      setScrapeResult({ text: '✗ Erreur de collecte', ok: false })
    } finally {
      setScraping(false)
      setTimeout(() => setScrapeResult(null), 5000)
    }
  }

  const links = [
    { href: '/',      label: 'Tableau de bord', icon: '◈' },
    { href: '/recap', label: 'Récapitulatif',   icon: '≡' },
  ]

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(15, 70, 35, 0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(250, 204, 21, 0.25)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.18)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '11px' }}>
            {/* Tour de contrôle */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(250, 204, 21, 0.45)',
              flexShrink: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Base & mast */}
                <rect x="11" y="14" width="2" height="8" rx="0.5" fill="#14532d"/>
                <rect x="8" y="21" width="8" height="1.5" rx="0.75" fill="#14532d"/>
                {/* Platform */}
                <rect x="7" y="12" width="10" height="2.5" rx="1" fill="#14532d"/>
                {/* Cabin / windowed box */}
                <rect x="8.5" y="7" width="7" height="5.5" rx="1" fill="#14532d"/>
                <rect x="9.5" y="8" width="2" height="3" rx="0.4" fill="#facc15" opacity="0.9"/>
                <rect x="12.5" y="8" width="2" height="3" rx="0.4" fill="#facc15" opacity="0.9"/>
                {/* Antenna */}
                <line x1="12" y1="7" x2="12" y2="3.5" stroke="#14532d" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="3" r="1" fill="#14532d"/>
                {/* Radar sweep */}
                <path d="M12 3 Q16 5 15 9" stroke="#14532d" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>
              </svg>
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{
                fontWeight: '900', fontSize: '18px',
                background: 'linear-gradient(90deg, #ffffff, #d1fae5)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.2px',
              }}>Over</span><span style={{
                fontWeight: '900', fontSize: '18px',
                background: 'linear-gradient(90deg, #facc15, #fbbf24)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.2px',
              }}>watch</span>
              <p style={{ margin: 0, fontSize: '9.5px', color: '#86efac', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Marchés publics · Guyane
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {links.map(({ href, label, icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 16px', borderRadius: '10px', fontSize: '13.5px',
                  textDecoration: 'none',
                  backgroundColor: active ? '#facc15' : 'rgba(255,255,255,0.07)',
                  color: active ? '#14532d' : '#d1fae5',
                  fontWeight: active ? '700' : '500',
                  border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: active ? '0 2px 10px rgba(250,204,21,0.35)' : 'none',
                }}>
                  <span style={{ fontSize: '14px', opacity: 0.8 }}>{icon}</span>
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {scrapeResult && (
              <span style={{
                fontSize: '12px',
                color: scrapeResult.ok ? '#fef08a' : '#fca5a5',
                backgroundColor: 'rgba(22, 101, 52, 0.85)',
                padding: '5px 13px', borderRadius: '999px',
                border: `1px solid ${scrapeResult.ok ? 'rgba(250,204,21,0.3)' : 'rgba(252,165,165,0.3)'}`,
                whiteSpace: 'nowrap',
              }}>{scrapeResult.text}</span>
            )}
            <button
              onClick={handleScrape}
              disabled={scraping}
              style={{
                background: scraping
                  ? 'rgba(250, 204, 21, 0.35)'
                  : 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
                color: '#14532d',
                border: 'none', borderRadius: '9px',
                padding: '8px 17px', fontSize: '13px', fontWeight: '700',
                cursor: scraping ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: scraping ? 'none' : '0 2px 10px rgba(250,204,21,0.35)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{
                display: 'inline-block',
                animation: scraping ? 'spin 1s linear infinite' : 'none',
              }}>↻</span>
              {scraping ? 'Collecte...' : 'Actualiser'}
            </button>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </nav>
  )
}
