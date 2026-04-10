import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StarField from '../components/StarField'

// Supabase v2 auto-processes the hash token on load and fires
// onAuthStateChange with event PASSWORD_RECOVERY (reset link) or
// SIGNED_IN (magic link). We just listen and react.

export default function ResetPassword() {
  const navigate = useNavigate()

  // 'detecting' → 'reset' → 'magic' → 'success' → 'error'
  const [scene, setScene] = useState('detecting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Give the Supabase client a moment to parse the URL hash
    // and fire the auth state change before we fall through to 'error'.
    const timeout = setTimeout(() => {
      if (scene === 'detecting') setScene('error')
    }, 4000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      clearTimeout(timeout)
      if (event === 'PASSWORD_RECOVERY') {
        setScene('reset')
      } else if (event === 'SIGNED_IN') {
        // Magic link — session already established, send to feed
        setScene('magic')
        setTimeout(() => navigate('/feed', { replace: true }), 1200)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleReset(e) {
    e.preventDefault()
    setFormError('')
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setFormError(error.message)
      setLoading(false)
      return
    }
    setScene('success')
    setTimeout(() => navigate('/feed', { replace: true }), 1800)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    }}>
      <StarField />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420 }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--gold)',
            letterSpacing: '0.05em',
          }}>Pulse</div>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 10,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>by Matrixter</div>
        </div>

        <div className="glass" style={{ padding: '40px 36px' }}>
          {scene === 'detecting' && <DetectingScene />}
          {scene === 'magic'     && <MagicScene />}
          {scene === 'success'   && <SuccessScene />}
          {scene === 'error'     && <ErrorScene navigate={navigate} />}
          {scene === 'reset'     && (
            <ResetForm
              password={password}
              setPassword={setPassword}
              confirm={confirm}
              setConfirm={setConfirm}
              formError={formError}
              loading={loading}
              onSubmit={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function DetectingScene() {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <Spinner />
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 16 }}>
        Verifying your link…
      </p>
    </div>
  )
}

function MagicScene() {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--teal)' }}>✦</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--teal)', marginBottom: 8 }}>
        Signing you in…
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Session confirmed. Redirecting to your feed.
      </p>
    </div>
  )
}

function SuccessScene() {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--teal)' }}>◈</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--teal)', marginBottom: 8 }}>
        Password updated
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Redirecting you to the feed…
      </p>
    </div>
  )
}

function ErrorScene({ navigate }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 12, color: '#C94C4C' }}>⚠</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>
        Link expired or invalid
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        This link has expired or has already been used. Request a new one from the sign-in screen.
      </p>
      <button
        onClick={() => navigate('/splash')}
        style={{
          background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
          border: 'none',
          color: '#05060F',
          padding: '10px 24px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Back to sign in
      </button>
    </div>
  )
}

function ResetForm({ password, setPassword, confirm, setConfirm, formError, loading, onSubmit }) {
  return (
    <>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28,
        fontWeight: 600,
        color: 'var(--gold)',
        marginBottom: 8,
      }}>
        Set new password
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
        Choose a strong password for your account.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoFocus
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        {formError && <ErrorBanner message={formError} />}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
            color: '#05060F',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.05em',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </>
  )
}

function ErrorBanner({ message }) {
  return (
    <p style={{
      color: '#C94C4C',
      fontSize: 13,
      background: 'rgba(201,76,76,0.1)',
      padding: '8px 12px',
      borderRadius: 8,
    }}>
      {message}
    </p>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--gold)',
          animation: `pd 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes pd{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1.2)}}`}</style>
    </div>
  )
}

const labelStyle = {
  fontSize: 12,
  color: 'var(--text-muted)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 15,
  outline: 'none',
}
