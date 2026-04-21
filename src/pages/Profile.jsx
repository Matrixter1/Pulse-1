import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SacredMark from '../components/SacredMark'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { isAdminUser } from '../lib/adminAccess'

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024

export default function Profile() {
  const navigate = useNavigate()
  const { user, tier, profile, updateProfile, signOut } = useAuth()
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [firstNameInput, setFirstNameInput] = useState('')
  const [lastNameInput, setLastNameInput] = useState('')
  const [countryInput, setCountryInput] = useState('')
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [bioInput, setBioInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [sendingRecovery, setSendingRecovery] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)

  useEffect(() => {
    setDisplayNameInput(profile?.display_name || profile?.nickname || '')
    setFirstNameInput(profile?.first_name || '')
    setLastNameInput(profile?.last_name || '')
    setCountryInput(profile?.country || '')
    setAvatarUrlInput(profile?.avatar_url || '')
    setAvatarPreview('')
    setAvatarFile(null)
    setBioInput(profile?.bio || '')
  }, [profile?.display_name, profile?.nickname, profile?.first_name, profile?.last_name, profile?.country, profile?.avatar_url, profile?.bio])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const tierLabel = useMemo(() => {
    if (isAdminUser(user)) return 'Admin'
    return { guest: 'Guest', registered: 'Member', verified: 'Verified' }[tier] || 'Guest'
  }, [tier, user])
  const tierColor = useMemo(() => {
    if (isAdminUser(user)) return 'var(--teal)'
    return { guest: 'var(--text-muted)', registered: 'var(--gold)', verified: 'var(--teal)' }[tier] || 'var(--text-muted)'
  }, [tier, user])
  const truthLayer = tier === 'verified' || isAdminUser(user)
  const canSave = firstNameInput.trim() && lastNameInput.trim() && countryInput.trim() && !savingProfile
  const publicDisplayName = profile?.display_name || profile?.nickname || user?.email?.split('@')[0] || 'Guest'
  const avatarDisplay = avatarPreview || avatarUrlInput
  const joinedLabel = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Today'

  useEffect(() => {
    if (!user && tier !== 'guest') {
      navigate('/splash', { replace: true })
    }
  }, [user, tier, navigate])

  function clearAvatarDraft() {
    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview('')
    setAvatarFile(null)
    setAvatarUrlInput('')
  }

  function validateAvatarFile(file) {
    if (!file) return 'Choose or paste an image first.'
    if (!file.type?.startsWith('image/')) return 'Use an image file such as JPG, PNG, GIF, or WEBP.'
    if (file.size > MAX_AVATAR_FILE_SIZE) return 'Keep profile images under 2 MB.'
    return ''
  }

  function applyAvatarFile(file) {
    const validationError = validateAvatarFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setInfo('')
    setRecoverySent(false)

    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleAvatarPicker(event) {
    const file = event.target.files?.[0]
    if (file) applyAvatarFile(file)
    event.target.value = ''
  }

  function handleAvatarPaste(event) {
    const file = Array.from(event.clipboardData?.files || []).find((item) => item.type?.startsWith('image/'))
    if (!file) return
    event.preventDefault()
    applyAvatarFile(file)
  }

  async function handleSaveProfile() {
    if (!canSave) return
    setSavingProfile(true)
    setError('')
    setInfo('')
    setRecoverySent(false)

    try {
      let nextAvatarUrl = avatarUrlInput.trim()
      if (avatarFile) {
        const extension = avatarFile.name?.split('.').pop()?.toLowerCase() || avatarFile.type?.split('/')[1] || 'jpg'
        const safeExtension = extension.replace(/[^a-z0-9]/gi, '') || 'jpg'
        const uploadPath = `profile-images/${user.id}/${Date.now()}-avatar.${safeExtension}`
        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(uploadPath, avatarFile, { contentType: avatarFile.type, upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('question-images').getPublicUrl(uploadPath)
        nextAvatarUrl = data?.publicUrl || ''
      }

      await updateProfile({
        displayName: displayNameInput,
        firstName: firstNameInput,
        lastName: lastNameInput,
        country: countryInput,
        avatarUrl: nextAvatarUrl,
        bio: bioInput,
      })
      setAvatarUrlInput(nextAvatarUrl)
      setAvatarFile(null)
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
      setAvatarPreview('')
      setInfo('Profile updated across Pulse web and mobile.')
    } catch (err) {
      setError(err.message || 'Unable to save your profile right now.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSendRecovery() {
    if (!user?.email || sendingRecovery) return
    setSendingRecovery(true)
    setError('')
    setInfo('')
    setRecoverySent(false)

    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (recoveryError) throw recoveryError
      setRecoverySent(true)
      setInfo(`Recovery link sent to ${user.email}.`)
    } catch (err) {
      setError(err.message || 'Unable to send a recovery email right now.')
    } finally {
      setSendingRecovery(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    setError('')
    setInfo('')
    setRecoverySent(false)
    try {
      await signOut()
      navigate('/splash', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  if (!user || tier === 'guest') {
    return (
      <div className="page">
        <NavBar />
        <div style={shellStyle}>
          <Panel centered>
            <Eyebrow color="var(--gold)">Profile</Eyebrow>
            <HeroTitle>Sign in before you enter your account.</HeroTitle>
            <BodyCopy>
              Your Pulse profile, verification layer, and recovery controls belong to your signed-in member identity.
            </BodyCopy>
            <ActionRow>
              <PrimaryButton onClick={() => navigate('/splash')}>Sign in</PrimaryButton>
              <SecondaryButton onClick={() => navigate('/feed')}>Browse feed</SecondaryButton>
            </ActionRow>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <NavBar />

      <div style={shellStyle}>
        <div style={gridStyle}>
          <Panel>
            <div style={heroRowStyle}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 22,
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                background: avatarDisplay ? 'rgba(15,18,40,0.8)' : truthLayer ? 'rgba(76,201,168,0.14)' : 'rgba(201,168,76,0.14)',
                border: `1px solid ${truthLayer ? 'var(--teal-border)' : 'var(--gold-border)'}`,
              }}>
                {avatarDisplay ? (
                  <img src={avatarDisplay} alt={`${publicDisplayName} avatar`} style={avatarImageStyle} />
                ) : (
                  <SacredMark size={40} showRings={false} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <Eyebrow color={tierColor}>Identity profile</Eyebrow>
                <HeroTitle style={{ marginBottom: 8 }}>{publicDisplayName}</HeroTitle>
                <BodyCopy style={{ marginBottom: 6 }}>
                  {user.email}
                </BodyCopy>
                <BodyCopy style={{ color: 'var(--text-muted)' }}>
                  {[`${firstNameInput} ${lastNameInput}`.trim(), countryInput].filter(Boolean).join(' | ') || 'Complete your identity details'}
                </BodyCopy>
              </div>

              <StatusPill color={tierColor}>{tierLabel.toUpperCase()}</StatusPill>
            </div>

            <div style={metricGridStyle}>
              <MetricCard label="Status" value={tier === 'guest' ? 'Browse only' : 'Signed in'} />
              <MetricCard label="Truth Layer" value={truthLayer ? 'Active' : 'Pending'} tone="teal" />
              <MetricCard label="Joined" value={joinedLabel} />
            </div>
          </Panel>

          <Panel>
            <Eyebrow color="var(--teal)">Identity fields</Eyebrow>
            <HeroTitle style={{ marginBottom: 10 }}>Profile details</HeroTitle>
            <BodyCopy style={{ marginBottom: 24 }}>
              First name, last name, and country are required for Pulse. Display name stays optional and serves as your public-facing identity.
            </BodyCopy>

            <div style={formGridStyle}>
              <Field label="Display name">
                <input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} placeholder="Optional public name" style={inputStyle} />
              </Field>
              <Field label="First name">
                <input value={firstNameInput} onChange={(e) => setFirstNameInput(e.target.value)} placeholder="Your first name" style={inputStyle} />
              </Field>
              <Field label="Last name">
                <input value={lastNameInput} onChange={(e) => setLastNameInput(e.target.value)} placeholder="Your last name" style={inputStyle} />
              </Field>
              <Field label="Country">
                <input value={countryInput} onChange={(e) => setCountryInput(e.target.value)} placeholder="Where you are based" style={inputStyle} />
              </Field>
              <Field label="Profile image">
                <div style={avatarFieldStyle}>
                  <div
                    onPaste={handleAvatarPaste}
                    style={avatarDropZoneStyle}
                    title="Paste an image or choose a file"
                  >
                    <div style={avatarPreviewShellStyle}>
                      {avatarDisplay ? (
                        <img src={avatarDisplay} alt={`${publicDisplayName} avatar preview`} style={avatarImageStyle} />
                      ) : (
                        <SacredMark size={48} showRings={false} />
                      )}
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
                        Paste or upload a profile image
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                        JPG, PNG, GIF, or WEBP. Keep it under 2 MB so the profile stays fast across web and mobile.
                      </div>
                    </div>
                  </div>

                  <div style={buttonStackStyle}>
                    <label style={{ display: 'inline-flex' }}>
                      <input type="file" accept="image/*" onChange={handleAvatarPicker} style={{ display: 'none' }} />
                      <span style={uploadButtonStyle}>Choose image</span>
                    </label>
                    {!!avatarDisplay && (
                      <SecondaryButton onClick={clearAvatarDraft}>Remove image</SecondaryButton>
                    )}
                  </div>

                  <input
                    value={avatarUrlInput}
                    onChange={(e) => {
                      setAvatarUrlInput(e.target.value)
                      if (avatarPreview?.startsWith('blob:')) {
                        URL.revokeObjectURL(avatarPreview)
                      }
                      setAvatarPreview('')
                      setAvatarFile(null)
                    }}
                    placeholder="Or paste an existing image URL"
                    style={inputStyle}
                  />
                </div>
              </Field>
              <Field label="Bio">
                <textarea value={bioInput} onChange={(e) => setBioInput(e.target.value)} placeholder="Optional short bio" rows={4} style={{ ...inputStyle, minHeight: 108, resize: 'vertical' }} />
              </Field>
            </div>

            <div style={buttonStackStyle}>
              <PrimaryButton disabled={!canSave} onClick={handleSaveProfile}>
                {savingProfile ? 'Saving profile…' : 'Save profile'}
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/feed')}>Back to feed</SecondaryButton>
            </div>
          </Panel>

          <Panel>
            <Eyebrow color={truthLayer ? 'var(--teal)' : 'var(--gold)'}>Truth Layer</Eyebrow>
            <HeroTitle style={{ marginBottom: 10 }}>
              {truthLayer ? 'Verification is active.' : 'Identity verification awaits.'}
            </HeroTitle>
            <BodyCopy style={{ marginBottom: 24 }}>
              {truthLayer
                ? 'Your future votes now count inside the verified panel across Pulse web and Pulse mobile.'
                : 'When you are ready, complete verification to join the Truth Layer and sharpen the Truth Gap.'}
            </BodyCopy>

            <ActionRow>
              <PrimaryButton onClick={() => navigate('/verify')}>
                {truthLayer ? 'Review verification' : 'Verify identity'}
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/results/1')}>View results</SecondaryButton>
            </ActionRow>
          </Panel>

          <Panel>
            <Eyebrow color="var(--gold)">Settings & recovery</Eyebrow>
            <HeroTitle style={{ marginBottom: 10 }}>Account controls</HeroTitle>
            <BodyCopy style={{ marginBottom: 24 }}>
              Keep your Pulse account resilient with password recovery, quick navigation, and session controls.
            </BodyCopy>

            <div style={actionCardGridStyle}>
              <ActionCard
                title="Password recovery"
                body="Send a reset link to your signed-in email without leaving the site."
                accent="var(--gold)"
              >
                <PrimaryButton onClick={handleSendRecovery} disabled={sendingRecovery}>
                  {sendingRecovery ? 'Sending recovery link…' : 'Send recovery link'}
                </PrimaryButton>
                {recoverySent && (
                  <SuccessBanner>
                    Recovery email sent. Open it on this device to complete your reset.
                  </SuccessBanner>
                )}
              </ActionCard>

              <ActionCard
                title="Pulse routes"
                body="Jump straight into your most useful next destinations."
                accent="var(--teal)"
              >
                <QuickLinks />
              </ActionCard>

              <ActionCard
                title="Session"
                body="Close your local session on this browser when you are done."
                accent="var(--gold)"
              >
                <SecondaryButton onClick={handleSignOut}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </SecondaryButton>
              </ActionCard>
            </div>

            {error && <ErrorBanner>{error}</ErrorBanner>}
            {info && !recoverySent && <InfoBanner>{info}</InfoBanner>}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function QuickLinks() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <QuickLink to="/feed">Feed</QuickLink>
      <QuickLink to="/suggestions">Suggestions</QuickLink>
      <QuickLink to="/upcoming">Upcoming</QuickLink>
      <QuickLink to="/verify">Verify</QuickLink>
    </div>
  )
}

function QuickLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        padding: '10px 14px',
        borderRadius: 999,
        border: '1px solid var(--gold-border)',
        color: 'var(--gold)',
        fontSize: 12,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Link>
  )
}

function ActionCard({ title, body, accent, children }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: 18,
      border: `1px solid ${accent === 'var(--teal)' ? 'var(--teal-border)' : 'var(--gold-border)'}`,
      background: 'rgba(15,18,40,0.52)',
      display: 'grid',
      gap: 14,
    }}>
      <Eyebrow color={accent}>{title}</Eyebrow>
      <BodyCopy style={{ margin: 0 }}>{body}</BodyCopy>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </div>
  )
}

function StatusPill({ color, children }) {
  return (
    <div style={{
      padding: '8px 14px',
      borderRadius: 999,
      background: color === 'var(--teal)' ? 'rgba(76,201,168,0.14)' : 'rgba(201,168,76,0.14)',
      color,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </div>
  )
}

function MetricCard({ label, value, tone = 'gold' }) {
  const accent = tone === 'teal' ? 'var(--teal)' : 'var(--gold)'
  return (
    <div style={{
      padding: '18px',
      borderRadius: 18,
      border: `1px solid ${tone === 'teal' ? 'var(--teal-border)' : 'var(--gold-border)'}`,
      background: 'rgba(15,18,40,0.52)',
    }}>
      <div style={{
        fontSize: 11,
        color: accent,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28,
        color: 'var(--text)',
      }}>
        {value}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Eyebrow({ color, children }) {
  return (
    <div style={{
      color,
      fontSize: 12,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

function HeroTitle({ children, style }) {
  return (
    <h1 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(34px, 5vw, 54px)',
      fontWeight: 500,
      lineHeight: 1.02,
      color: 'var(--text)',
      ...style,
    }}>
      {children}
    </h1>
  )
}

function BodyCopy({ children, style }) {
  return (
    <p style={{
      color: 'var(--text-muted)',
      fontSize: 15,
      lineHeight: 1.75,
      ...style,
    }}>
      {children}
    </p>
  )
}

function Panel({ children, centered = false }) {
  return (
    <section className="glass" style={{
      padding: '32px',
      display: 'grid',
      gap: 24,
      alignItems: centered ? 'center' : 'stretch',
      textAlign: centered ? 'center' : 'left',
    }}>
      {children}
    </section>
  )
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
        border: 'none',
        color: '#05060F',
        padding: '12px 22px',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid var(--gold-border)',
        color: 'var(--gold)',
        padding: '11px 18px',
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {children}
    </button>
  )
}

function SuccessBanner({ children }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      background: 'rgba(76,201,168,0.12)',
      borderRadius: 14,
      padding: '14px 16px',
      color: 'var(--text)',
      fontSize: 13,
      lineHeight: 1.6,
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(76,201,168,0.18)',
        color: 'var(--teal)',
        fontWeight: 700,
        flex: '0 0 auto',
      }}>
        ✓
      </div>
      <div>{children}</div>
    </div>
  )
}

function ErrorBanner({ children }) {
  return (
    <div style={{
      color: 'var(--red)',
      background: 'rgba(201,76,76,0.1)',
      borderRadius: 14,
      padding: '14px 16px',
      fontSize: 13,
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  )
}

function InfoBanner({ children }) {
  return (
    <div style={{
      color: 'var(--teal)',
      background: 'rgba(76,201,168,0.1)',
      borderRadius: 14,
      padding: '14px 16px',
      fontSize: 13,
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  )
}

const shellStyle = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '40px 24px 64px',
}

const gridStyle = {
  display: 'grid',
  gap: 20,
}

const heroRowStyle = {
  display: 'flex',
  gap: 18,
  alignItems: 'center',
  flexWrap: 'wrap',
}

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 14,
}

const formGridStyle = {
  display: 'grid',
  gap: 16,
}

const buttonStackStyle = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const actionCardGridStyle = {
  display: 'grid',
  gap: 16,
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 10,
  padding: '12px 14px',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
}

const avatarFieldStyle = {
  display: 'grid',
  gap: 12,
}

const avatarDropZoneStyle = {
  display: 'grid',
  gap: 16,
  alignItems: 'center',
  gridTemplateColumns: '96px minmax(0, 1fr)',
  padding: '16px',
  borderRadius: 16,
  border: '1px dashed rgba(201,168,76,0.28)',
  background: 'rgba(255,255,255,0.02)',
}

const avatarPreviewShellStyle = {
  width: 96,
  height: 96,
  borderRadius: 28,
  overflow: 'hidden',
  border: '1px solid rgba(201,168,76,0.22)',
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(15,18,40,0.72)',
}

const avatarImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const uploadButtonStyle = {
  background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
  border: 'none',
  color: '#05060F',
  padding: '12px 22px',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const ActionRow = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</div>
)
