import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isAdminUser } from '../lib/adminAccess'
import SacredMark from './SacredMark'

export default function NavBar() {
  const { tier, signOut, user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = isAdminUser(user)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [firstNameInput, setFirstNameInput] = useState('')
  const [lastNameInput, setLastNameInput] = useState('')
  const [countryInput, setCountryInput] = useState('')
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [bioInput, setBioInput] = useState('')
  const dropdownRef = useRef(null)

  const tierLabel = { guest: 'Guest', registered: 'Member', verified: 'Verified' }[tier] || 'Guest'
  const tierColor = { guest: 'var(--text-muted)', registered: 'var(--gold)', verified: 'var(--teal)' }[tier] || 'var(--text-muted)'
  const publicDisplayName = profile?.display_name || profile?.nickname
  const hasDisplayName = !!publicDisplayName

  useEffect(() => {
    setDisplayNameInput(profile?.display_name || profile?.nickname || '')
    setFirstNameInput(profile?.first_name || '')
    setLastNameInput(profile?.last_name || '')
    setCountryInput(profile?.country || '')
    setAvatarUrlInput(profile?.avatar_url || '')
    setBioInput(profile?.bio || '')
  }, [profile?.display_name, profile?.nickname, profile?.first_name, profile?.last_name, profile?.country, profile?.avatar_url, profile?.bio])

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

  async function handleProfileSave() {
    if (!firstNameInput.trim() || !lastNameInput.trim() || !countryInput.trim()) return
    setSavingProfile(true)
    try {
      await updateProfile({
        displayName: displayNameInput,
        firstName: firstNameInput,
        lastName: lastNameInput,
        country: countryInput,
        avatarUrl: avatarUrlInput,
        bio: bioInput,
      })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(5,6,15,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(201,168,76,0.12)',
      padding: '0 24px', minHeight: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a href="https://www.matrixter.com" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SacredMark size={32} showRings={false} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600,
            letterSpacing: '0.05em', color: 'var(--gold)',
          }}>Pulse</span>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-muted)',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2,
          }}>by Matrixter</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 11, fontStyle: 'italic',
            color: 'var(--gold)', letterSpacing: '0.12em', marginTop: 2,
            opacity: 1, fontWeight: 400,
          }}>· ✦ early access · truth in progress ✦</span>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 10,
            color: 'var(--teal)', letterSpacing: '0.1em',
            marginTop: 2, opacity: 0.7,
          }}>· votes anonymous</span>
        </a>
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {tier === 'registered' && (
          <Link to="/verify" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, letterSpacing: '0.05em' }}>
            Get Verified →
          </Link>
        )}

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => user ? setDropdownOpen((open) => !open) : navigate('/splash')}
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
            {user && !hasDisplayName && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--gold)',
                border: '2px solid var(--bg)',
                display: 'block',
              }} />
            )}
          </button>

          {dropdownOpen && user && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: 'var(--surface2)',
              border: '1px solid var(--gold-border)',
              borderRadius: 'var(--radius-lg)', padding: '18px 18px 14px',
              minWidth: 300, zIndex: 'var(--z-modal)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 5 }}>
                  {user.email}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 5 }}>
                  {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Complete your profile'}
                </div>
                <div style={{
                  fontSize: 11, color: tierColor, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {tier === 'verified' && '✓ '}{tierLabel}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={dropdownLabelStyle}>Display name</label>
                <input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} placeholder="Optional public name" maxLength={30} style={dropdownInputStyle} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={dropdownLabelStyle}>Required identity fields</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input value={firstNameInput} onChange={(e) => setFirstNameInput(e.target.value)} placeholder="First name" style={dropdownInputStyle} />
                  <input value={lastNameInput} onChange={(e) => setLastNameInput(e.target.value)} placeholder="Last name" style={dropdownInputStyle} />
                  <input value={countryInput} onChange={(e) => setCountryInput(e.target.value)} placeholder="Country" style={dropdownInputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={dropdownLabelStyle}>Optional details</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  <input value={avatarUrlInput} onChange={(e) => setAvatarUrlInput(e.target.value)} placeholder="Avatar URL" style={dropdownInputStyle} />
                  <textarea value={bioInput} onChange={(e) => setBioInput(e.target.value)} placeholder="Bio" rows={3} style={{ ...dropdownInputStyle, resize: 'vertical', minHeight: 68 }} />
                </div>
              </div>

              <button
                onClick={handleProfileSave}
                disabled={savingProfile || !firstNameInput.trim() || !lastNameInput.trim() || !countryInput.trim()}
                style={{
                  width: '100%',
                  background: 'var(--gold-dim)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: 'var(--gold)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 700,
                  opacity: (savingProfile || !firstNameInput.trim() || !lastNameInput.trim() || !countryInput.trim()) ? 0.45 : 1,
                  marginBottom: 12,
                }}
              >
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  style={{ fontSize: 12, color: 'var(--gold)', padding: '3px 0', letterSpacing: '0.03em' }}
                >
                  Profile
                </Link>
                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Â·</span>
                <Link
                  to="/suggestions"
                  onClick={() => setDropdownOpen(false)}
                  style={{ fontSize: 12, color: 'var(--teal)', padding: '3px 0', letterSpacing: '0.03em' }}
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

const dropdownLabelStyle = {
  fontSize: 11,
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 7,
  fontWeight: 600,
}

const dropdownInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(5,6,15,0.8)',
  border: '1px solid var(--gold-border)',
  borderRadius: 8,
  padding: '7px 10px',
  color: 'var(--text)',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  outline: 'none',
}
