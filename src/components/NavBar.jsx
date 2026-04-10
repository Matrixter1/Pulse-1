import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function NavBar() {
  const { tier, signOut, user } = useAuth()
  const navigate = useNavigate()

  const tierLabel = {
    guest: 'Guest',
    registered: 'Member',
    verified: 'Verified',
  }[tier] || 'Guest'

  const tierColor = {
    guest: 'var(--text-muted)',
    registered: 'var(--gold)',
    verified: 'var(--teal)',
  }[tier] || 'var(--text-muted)'

  async function handleSignOut() {
    await signOut()
    navigate('/splash')
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(5,6,15,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(201,168,76,0.12)',
      padding: '0 24px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link to="/feed" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PulseLogo size={28} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--gold)',
        }}>Pulse</span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: 2,
        }}>by Matrixter</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: tierColor,
          padding: '4px 10px',
          border: `1px solid ${tierColor}`,
          borderRadius: 20,
          opacity: 0.85,
        }}>
          {tier === 'verified' && '✓ '}{tierLabel}
        </span>

        {tier === 'registered' && (
          <Link to="/verify" style={{
            fontSize: 12,
            color: 'var(--teal)',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}>
            Get Verified →
          </Link>
        )}

        {user ? (
          <button onClick={handleSignOut} style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.25)',
            color: 'var(--text-muted)',
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
          }}>
            Sign out
          </button>
        ) : (
          <Link to="/splash" style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.25)',
            color: 'var(--text-muted)',
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: 12,
          }}>
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}

function PulseLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="15" stroke="#C9A84C" strokeWidth="1" opacity="0.3" />
      <circle cx="16" cy="16" r="10" stroke="#C9A84C" strokeWidth="1" opacity="0.5" />
      <circle cx="16" cy="16" r="5" fill="#C9A84C" opacity="0.9" />
    </svg>
  )
}
