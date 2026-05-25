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
        .pulse-nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex-wrap: wrap;
        }
        .pulse-nav-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .pulse-nav-wordmark {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--gold);
        }
        .pulse-nav-subbrand {
          font-size: 11px;
          color: rgba(232, 230, 240, 0.5);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .pulse-nav-tagline {
          font-size: 10px;
          color: rgba(201, 168, 76, 0.82);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .pulse-nav-anon {
          font-size: 10px;
          color: rgba(76, 201, 168, 0.82);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .pulse-nav-admin-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(201, 168, 76, 0.08);
          border: 1px solid var(--gold-border);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .pulse-nav-sections {
          display: flex;
          justify-content: center;
          gap: 26px;
          flex-wrap: wrap;
        }
        .pulse-nav-section-link {
          position: relative;
          padding: 18px 0 14px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(232, 230, 240, 0.56);
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
          box-shadow: 0 0 16px rgba(76, 201, 168, 0.24);
        }
        .pulse-nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pulse-nav-verify {
          font-size: 12px;
          color: var(--teal);
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .pulse-nav-status {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 6px 12px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .pulse-nav-signin {
          background: none;
          border: 1px solid rgba(201, 168, 76, 0.25);
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
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
        @media (max-width: 860px) {
          .pulse-nav {
            padding: 10px 14px !important;
            align-items: flex-start !important;
          }
          .pulse-nav-shell {
            grid-template-columns: 1fr !important;
          }
          .pulse-nav-brand {
            gap: 8px;
          }
          .pulse-nav-subbrand,
          .pulse-nav-tagline,
          .pulse-nav-anon,
          .pulse-nav-sections {
            display: none !important;
          }
          .pulse-nav-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>

      <nav
        className="pulse-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(4, 6, 10, 0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '0 24px',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div className="pulse-nav-shell">
          <div className="pulse-nav-brand">
            <Link className="pulse-nav-logo" to="/feed">
              <SacredMark size={28} showRings={false} />
              <span className="pulse-nav-wordmark">Pulse</span>
            </Link>

            <a className="pulse-nav-subbrand" href="https://www.matrixter.com">
              By Matrixter
            </a>

            <span className="pulse-nav-tagline">early access</span>
            <span className="pulse-nav-tagline">truth in progress</span>
            <span className="pulse-nav-anon">votes anonymous</span>

            {isAdmin ? (
              <Link to="/admin" className="pulse-nav-admin-badge">
                Admin
              </Link>
            ) : null}
          </div>

          <div className="pulse-nav-sections">
            {topSections.map((section) => (
              <Link
                key={section.label}
                to={section.href}
                className={`pulse-nav-section-link${section.active ? ' active' : ''}`}
              >
                {section.label}
              </Link>
            ))}
          </div>

          <div className="pulse-nav-actions">
            {tier === 'registered' ? (
              <Link to="/verify" className="pulse-nav-verify">
                Get Verified
              </Link>
            ) : null}

            {user ? (
              <span
                className="pulse-nav-status"
                style={{
                  color: statusColor,
                  border: `1px solid ${statusColor}`,
                  background: statusColor === 'var(--teal)' ? 'rgba(76, 201, 168, 0.08)' : 'rgba(201, 168, 76, 0.08)',
                }}
              >
                {statusLabel}
              </span>
            ) : (
              <Link to="/splash" className="pulse-nav-signin">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
