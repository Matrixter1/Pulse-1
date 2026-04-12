import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import SacredMark from './SacredMark'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase()

export default function NavBar() {
  const { tier, signOut, user, profile, updateNickname } = useAuth()
  const navigate = useNavigate()
  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const dropdownRef = useRef(null)

  const tierLabel = { guest: 'Guest', registered: 'Member', verified: 'Verified' }[tier] || 'Guest'
  const tierColor = { guest: 'var(--text-muted)', registered: 'var(--gold)', verified: 'var(--teal)' }[tier] || 'var(--text-muted)'

  // Sync nickname input when profile changes
  useEffect(() => {
    setNicknameInput(profile?.nickname || '')
  }, [profile?.nickname])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
    navigate('/splash')
  }

  async function handleNicknameSave() {
    if (!nicknameInput.trim()) return
    setNicknameSaving(true)
    try {
      await updateNickname(nicknameInput.trim())
    } finally {
      setNicknameSaving(false)
    }
  }

  const hasNickname = !!(profile?.nickname)

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(5,6,15,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(201,168,76,0.12)',
      padding: '0 24px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SacredMark size={32} showRings={false} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600,
          letterSpacing: '0.05em', color: 'var(--gold)',
        }}>Pulse</span>
        <span style={{
          fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2,
        }}>by Matrixter</span>
        {isAdmin && (
          <Link to="/admin" style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--gold)', background: 'rgba(201,168,76,0.1)',
            border: '1px solid var(--gold-border)', borderRadius: 20, padding: '2px 8px',
            marginLeft: 2, textDecoration: 'none',
          }}>
            Admin
          </Link>
        )}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {tier === 'registered' && (
          <Link to="/verify" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.05em' }}>
            Get Verified →
          </Link>
        )}

        {/* Tier badge — clickable dropdown when logged in */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => user ? setDropdownOpen(o => !o) : navigate('/splash')}
            style={{
              position: 'relative', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: tierColor, padding: '4px 10px',
              border: `1px solid ${tierColor}`,
              borderRadius: 20, opacity: 0.85,
              background: dropdownOpen ? `${tierColor}18` : 'none',
              cursor: 'pointer',
              transition: 'background var(--transition)',
            }}
          >
            {tier === 'verified' && '✓ '}{tierLabel}
            {/* Gold dot if no nickname and logged in */}
            {user && !hasNickname && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--gold)',
                border: '2px solid var(--bg)',
                display: 'block',
              }} />
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && user && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: 'var(--surface2)',
              border: '1px solid var(--gold-border)',
              borderRadius: 'var(--radius-lg)', padding: '18px 18px 14px',
              minWidth: 232, zIndex: 'var(--z-modal)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}>
              {/* Email + tier */}
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  wordBreak: 'break-all', marginBottom: 5,
                }}>
                  {user.email}
                </div>
                <div style={{
                  fontSize: 11, color: tierColor, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {tier === 'verified' && '✓ '}{tierLabel}
                </div>
              </div>

              {/* Nickname */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  fontSize: 11, color: hasNickname ? 'var(--text-muted)' : 'var(--gold)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  display: 'block', marginBottom: 7, fontWeight: 600,
                }}>
                  {hasNickname ? 'Display name' : '⚡ Set display name'}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNicknameSave() } }}
                    placeholder="your name…"
                    maxLength={30}
                    style={{
                      flex: 1, background: 'rgba(5,6,15,0.8)',
                      border: '1px solid var(--gold-border)',
                      borderRadius: 8, padding: '5px 9px',
                      color: 'var(--text)', fontSize: 12,
                      fontFamily: 'var(--font-ui)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleNicknameSave}
                    disabled={nicknameSaving || !nicknameInput.trim()}
                    style={{
                      background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
                      borderRadius: 8, padding: '5px 11px',
                      color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontWeight: 700,
                      opacity: (nicknameSaving || !nicknameInput.trim()) ? 0.45 : 1,
                      transition: 'opacity var(--transition)',
                    }}
                  >
                    {nicknameSaving ? '…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Links */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <Link
                  to="/suggestions"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    fontSize: 12, color: 'var(--teal)',
                    padding: '3px 0', letterSpacing: '0.03em',
                  }}
                >
                  Suggestions
                </Link>
                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>·</span>
                <Link
                  to="/upcoming"
                  onClick={() => setDropdownOpen(false)}
                  style={{ fontSize: 12, color: 'var(--text-muted)', padding: '3px 0' }}
                >
                  Upcoming
                </Link>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%', background: 'none',
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: 10, padding: '7px',
                  color: 'var(--text-muted)', fontSize: 12,
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'border-color var(--transition)',
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        {!user && (
          <Link to="/splash" style={{
            background: 'none', border: '1px solid rgba(201,168,76,0.25)',
            color: 'var(--text-muted)', padding: '5px 12px',
            borderRadius: 8, fontSize: 12,
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
