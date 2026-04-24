import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isAdminUser } from '../lib/adminAccess'
import SacredMark from './SacredMark'

export default function NavBar() {
  const { tier, user } = useAuth()
  const isAdmin = isAdminUser(user)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const activeType = params.get('type')

  const statusLabel = isAdmin ? 'Admin' : { guest: 'Guest', registered: 'Member', verified: 'Verified' }[tier] || 'Guest'
  const statusColor = isAdmin
    ? 'var(--teal)'
    : { guest: 'var(--text-muted)', registered: 'var(--gold)', verified: 'var(--teal)' }[tier] || 'var(--text-muted)'

  const topSections = [
    { label: 'Feed', href: '/feed', active: location.pathname === '/feed' && !activeType },
    { label: 'Signals', href: '/feed?type=statement', active: location.pathname === '/feed' && activeType === 'statement' },
    { label: 'Decisions', href: '/feed?type=choice', active: location.pathname === '/feed' && activeType === 'choice' },
    { label: 'Rankings', href: '/feed?type=ranked', active: location.pathname === '/feed' && activeType === 'ranked' },
    { label: 'Upcoming', href: '/upcoming', active: location.pathname === '/upcoming' },
  ]

  return (
    <>
      <style>{`
        .pulse-nav-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          width: 100%;
          gap: 18px;
        }
        .pulse-nav-sections {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .pulse-nav-section-link {
          position: relative;
          padding: 18px 0 14px;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-decoration: none;
          transition: color var(--transition);
        }
        .pulse-nav-section-link::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 6px;
          height: 2px;
          border-radius: 999px;
          background: transparent;
          transition: background var(--transition), box-shadow var(--transition);
        }
        .pulse-nav-section-link:hover,
        .pulse-nav-section-link.active {
          color: var(--text);
        }
        .pulse-nav-section-link.active::after {
          background: var(--teal);
          box-shadow: 0 0 18px rgba(76,201,168,0.28);
        }
        @media (max-width: 1120px) {
          .pulse-nav-shell {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .pulse-nav-sections {
            order: 3;
            grid-column: 1 / -1;
            justify-content: flex-start;
            gap: 18px;
            padding-top: 2px;
          }
        }
        @media (max-width: 820px) {
          .pulse-nav {
            padding: 10px 14px !important;
            align-items: flex-start !important;
          }
          .pulse-nav-shell {
            grid-template-columns: 1fr !important;
          }
          .pulse-nav-brand {
            width: 100%;
            gap: 8px !important;
          }
          .pulse-nav-link {
            flex-wrap: wrap;
            row-gap: 4px;
          }
          .pulse-nav-subbrand {
            font-size: 10px !important;
            letter-spacing: 0.1em !important;
          }
          .pulse-nav-tagline,
          .pulse-nav-anon,
          .pulse-nav-sections {
            display: none !important;
          }
          .pulse-nav-actions {
            width: 100%;
            justify-content: flex-start !important;
            gap: 10px !important;
          }
        }
      `}</style>

      <nav
        className="pulse-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(5,6,15,0.88)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(201,168,76,0.12)',
          padding: '0 24px',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div className="pulse-nav-shell">
          <div className="pulse-nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link
              className="pulse-nav-link"
              to="/feed"
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <SacredMark size={32} showRings={false} />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: 'var(--gold)',
                }}
              >
                Pulse
              </span>
            </Link>

            <a
              className="pulse-nav-subbrand"
              href="https://www.matrixter.com"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11,
                color: 'var(--text-muted)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginTop: 2,
              }}
            >
              by Matrixter
            </a>

            <Link
              className="pulse-nav-link"
              to="/feed"
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span
                className="pulse-nav-tagline"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  fontStyle: 'italic',
                  color: 'var(--gold)',
                  letterSpacing: '0.12em',
                  marginTop: 2,
                  fontWeight: 400,
                }}
              >
                • early access · truth in progress •
              </span>
              <span
                className="pulse-nav-anon"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 10,
                  color: 'var(--teal)',
                  letterSpacing: '0.1em',
                  marginTop: 2,
                  opacity: 0.7,
                }}
              >
                • votes anonymous
              </span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: 20,
                  padding: '2px 8px',
                  marginLeft: 2,
                  textDecoration: 'none',
                }}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="pulse-nav-sections">
            {topSections.map((section) => (
              <a
                key={section.label}
                href={section.href}
                className={`pulse-nav-section-link${section.active ? ' active' : ''}`}
              >
                {section.label}
              </a>
            ))}
          </div>

          <div className="pulse-nav-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            {tier === 'registered' && (
              <Link
                to="/verify"
                style={{
                  fontSize: 12,
                  color: 'var(--teal)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                Get Verified →
              </Link>
            )}

            {user && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: statusColor,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: `1px solid ${statusColor}`,
                  background: statusColor === 'var(--teal)' ? 'rgba(76,201,168,0.08)' : 'rgba(201,168,76,0.08)',
                  whiteSpace: 'nowrap',
                }}
              >
                {(tier === 'verified' || isAdmin) ? '✓ ' : ''}{statusLabel}
              </span>
            )}

            {user ? (
              <Link
                to="/profile"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))',
                  border: '1px solid var(--gold-border)',
                  color: 'var(--gold)',
                  padding: '7px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Profile
              </Link>
            ) : (
              <Link
                to="/splash"
                style={{
                  background: 'none',
                  border: '1px solid rgba(201,168,76,0.25)',
                  color: 'var(--text-muted)',
                  padding: '5px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
