'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { triggerScrape } from '@/lib/api'

export default function Sidebar() {
  const pathname = usePathname()
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ text: string; ok: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Ferme le menu au changement de page
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Empêche le scroll body quand menu ouvert sur mobile
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    try {
      const result = await triggerScrape()
      setScrapeResult({ text: `✓ ${result.new} nouvelles`, ok: true })
    } catch {
      setScrapeResult({ text: '✗ Erreur', ok: false })
    } finally {
      setScraping(false)
      setTimeout(() => setScrapeResult(null), 5000)
    }
  }

  const links = [
    { href: '/', label: 'Tableau de bord', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    )},
    { href: '/recap', label: 'Récapitulatif', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
      </svg>
    )},
    { href: '/analyser', label: 'Analyse des AO', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    )},
    { href: '/marches', label: 'Analyse des marchés', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    )},
  ]

  const Logo = () => (
    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(250,204,21,0.4)', flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="11" y="14" width="2" height="8" rx="0.5" fill="#14532d"/>
          <rect x="8" y="21" width="8" height="1.5" rx="0.75" fill="#14532d"/>
          <rect x="7" y="12" width="10" height="2.5" rx="1" fill="#14532d"/>
          <rect x="8.5" y="7" width="7" height="5.5" rx="1" fill="#14532d"/>
          <rect x="9.5" y="8" width="2" height="3" rx="0.4" fill="#facc15" opacity="0.9"/>
          <rect x="12.5" y="8" width="2" height="3" rx="0.4" fill="#facc15" opacity="0.9"/>
          <line x1="12" y1="7" x2="12" y2="3.5" stroke="#14532d" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="3" r="1" fill="#14532d"/>
        </svg>
      </div>
      <div style={{ lineHeight: 1.2 }}>
        <div>
          <span style={{ fontWeight: '900', fontSize: '16px', color: 'white' }}>Over</span>
          <span style={{ fontWeight: '900', fontSize: '16px', background: 'linear-gradient(90deg, #facc15, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>watch</span>
        </div>
        <p style={{ margin: 0, fontSize: '9px', color: '#6ee7b7', fontWeight: '500', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Marchés · Guyane
        </p>
      </div>
    </Link>
  )

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {links.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href} onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderRadius: '10px',
            textDecoration: 'none',
            backgroundColor: active ? '#facc15' : 'transparent',
            color: active ? '#14532d' : '#d1fae5',
            fontWeight: active ? '700' : '500',
            fontSize: '15px',
            border: active ? 'none' : '1px solid transparent',
          }}>
            <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </>
  )

  const ScrapeButton = () => (
    <div>
      {scrapeResult && (
        <div style={{
          fontSize: '12px', color: scrapeResult.ok ? '#fef08a' : '#fca5a5',
          background: 'rgba(22,101,52,0.8)', padding: '6px 10px', borderRadius: '8px',
          marginBottom: '8px', textAlign: 'center',
          border: `1px solid ${scrapeResult.ok ? 'rgba(250,204,21,0.3)' : 'rgba(252,165,165,0.3)'}`,
        }}>
          {scrapeResult.text}
        </div>
      )}
      <button onClick={handleScrape} disabled={scraping} style={{
        width: '100%',
        background: scraping ? 'rgba(250,204,21,0.3)' : 'linear-gradient(135deg, #facc15, #f59e0b)',
        color: '#14532d', border: 'none', borderRadius: '10px',
        padding: '11px', fontSize: '13px', fontWeight: '700',
        cursor: scraping ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        boxShadow: scraping ? 'none' : '0 2px 10px rgba(250,204,21,0.3)',
      }}>
        <span style={{ animation: scraping ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>↻</span>
        {scraping ? 'Collecte...' : 'Actualiser les données'}
      </button>
    </div>
  )

  return (
    <>
      {/* ── DESKTOP sidebar ─────────────────────────────── */}
      <aside className="desktop-sidebar" style={{
        position: 'fixed', top: 0, left: 0,
        width: '220px', height: '100vh',
        background: 'rgba(15, 70, 35, 0.98)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(250, 204, 21, 0.2)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Logo />
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ade80', margin: '0 0 10px 8px' }}>
            Navigation
          </p>
          <NavLinks />
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <ScrapeButton />
        </div>
      </aside>

      {/* ── MOBILE topbar ───────────────────────────────── */}
      <header className="mobile-header" style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(15, 70, 35, 0.98)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(250, 204, 21, 0.2)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        padding: '0 16px', height: '58px',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => setMenuOpen(o => !o)} style={{
          background: 'none', border: '1.5px solid rgba(250,204,21,0.4)', cursor: 'pointer',
          color: 'white', padding: '6px 10px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? '#facc15' : 'white', borderRadius: '2px', transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none', transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? 'transparent' : 'white', borderRadius: '2px', transition: 'all 0.2s' }} />
            <span style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? '#facc15' : 'white', borderRadius: '2px', transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none', transition: 'all 0.2s' }} />
          </span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: menuOpen ? '#facc15' : 'white' }}>Menu</span>
        </button>
        <Logo />
      </header>

      {/* ── MOBILE drawer ───────────────────────────────── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div onClick={() => setMenuOpen(false)} style={{
            display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60,
          }} className="mobile-backdrop" />
          {/* Drawer */}
          <div className="mobile-drawer" style={{
            display: 'none', position: 'fixed', top: '58px', left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 70, 35, 0.99)', zIndex: 70,
            flexDirection: 'column', padding: '16px',
            overflowY: 'auto',
          }}>
            <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ade80', margin: '0 0 12px 6px' }}>
              Navigation
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
              <NavLinks onClick={() => setMenuOpen(false)} />
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <ScrapeButton />
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-backdrop { display: block !important; }
          .mobile-drawer { display: flex !important; }
        }
      `}</style>
    </>
  )
}
