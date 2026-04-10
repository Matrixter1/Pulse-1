import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

// mode: 'signin' | 'signup' | 'magic' | 'forgot'
export default function AuthModal({ onClose, onSuccess }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
    setPassword('')
  }

  // ── Email / password submit ──────────────────────────────────
  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Magic link ───────────────────────────────────────────────
  async function handleMagicLink(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/reset-password` },
      })
      if (error) throw error
      setInfo('Check your email — a sign-in link is on its way.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ──────────────────────────────────────────
  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setInfo('Check your email for a reset link.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const heading = {
    signin: 'Welcome back',
    signup: 'Join Pulse',
    magic:  'Magic link',
    forgot: 'Forgot password',
  }[mode]

  const subheading = {
    signin: 'Sign in to cast your vote',
    signup: 'Create an account to participate',
    magic:  'Enter your email and we\'ll send a one-click sign-in link',
    forgot: 'Enter your email and we\'ll send a password reset link',
  }[mode]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(5,6,15,0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{ padding: '36px 40px', width: '100%', maxWidth: 420, position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 16,
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: 22, cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        {/* Heading */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28, fontWeight: 600,
          color: 'var(--gold)', marginBottom: 6,
        }}>
          {heading}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          {subheading}
        </p>

        {/* Mode tabs — signin / signup */}
        {(mode === 'signin' || mode === 'signup') && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }}>
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  background: mode === m ? 'rgba(201,168,76,0.12)' : 'transparent',
                  border: 'none',
                  color: mode === m ? 'var(--gold)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  fontWeight: mode === m ? 700 : 400,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'signin' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {/* ── Password form (signin / signup) ── */}
        {(mode === 'signin' || mode === 'signup') && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontSize: 12,
                    cursor: 'pointer', marginTop: 5,
                    textAlign: 'right', display: 'block', width: '100%',
                  }}
                >
                  Forgot password?
                </button>
              )}
            </Field>

            {error && <ErrorBanner message={error} />}

            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Magic link shortcut */}
            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => switchMode('magic')}
                style={{
                  background: 'none',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: 'var(--text-muted)',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                ✦ Sign in with magic link instead
              </button>
            )}
          </form>
        )}

        {/* ── Magic link form ── */}
        {mode === 'magic' && (
          <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus style={inputStyle} />
            </Field>

            {error && <ErrorBanner message={error} />}
            {info  && <InfoBanner  message={info}  />}

            {!info && (
              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading ? 'Sending…' : '✦ Send magic link'}
              </button>
            )}

            <button type="button" onClick={() => switchMode('signin')} style={ghostBtn}>
              ← Back to sign in
            </button>
          </form>
        )}

        {/* ── Forgot password form ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus style={inputStyle} />
            </Field>

            {error && <ErrorBanner message={error} />}
            {info  && <InfoBanner  message={info}  />}

            {!info && (
              <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            )}

            <button type="button" onClick={() => switchMode('signin')} style={ghostBtn}>
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Small helpers ──────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        fontSize: 12, color: 'var(--text-muted)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        display: 'block', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorBanner({ message }) {
  return (
    <p style={{ color: '#C94C4C', fontSize: 13, background: 'rgba(201,76,76,0.1)', padding: '8px 12px', borderRadius: 8, margin: 0 }}>
      {message}
    </p>
  )
}

function InfoBanner({ message }) {
  return (
    <p style={{ color: 'var(--teal)', fontSize: 13, background: 'rgba(76,201,168,0.08)', padding: '10px 14px', borderRadius: 8, margin: 0, lineHeight: 1.5 }}>
      ✓ {message}
    </p>
  )
}

function primaryBtn(loading) {
  return {
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
    fontFamily: 'var(--font-ui)',
  }
}

const ghostBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: 13,
  cursor: 'pointer',
  padding: '4px 0',
  textAlign: 'left',
  fontFamily: 'var(--font-ui)',
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
