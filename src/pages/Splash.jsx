import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarField from '../components/StarField'
import SacredMark from '../components/SacredMark'
import AuthModal from '../components/AuthModal'
import { useAuth } from '../lib/auth'

export default function Splash() {
  const navigate = useNavigate()
  const { user, tier, loading, signInAnonymously } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [authTarget, setAuthTarget] = useState(null)

  useEffect(() => {
    if (!loading && user && tier !== 'guest') {
      navigate('/feed', { replace: true })
    }
  }, [user, tier, loading])

  if (loading) return null

  function handleGuest() {
    signInAnonymously()
    navigate('/feed')
  }

  function handleRegister() {
    setAuthTarget('register')
    setShowAuth(true)
  }

  function handleVerify() {
    setAuthTarget('verify')
    setShowAuth(true)
  }

  return (
    <div className="page" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <StarField />

      {/* Hero section */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
        {/* Logo mark */}
        <div style={{ animation: 'fadeIn 1.2s ease forwards', opacity: 0, margin: '0 auto 24px' }}>
          <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SacredMark size={200} />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '0.05em',
            }}>Pulse</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>by Matrixter</div>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 13,
            letterSpacing: '0.2em',
            color: 'rgba(201, 168, 76, 0.55)',
            marginTop: 14,
            textAlign: 'center',
            display: 'block',
          }}>✦ early access · truth in progress ✦</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 42px)',
          fontWeight: 300,
          fontStyle: 'italic',
          color: 'var(--text)',
          marginBottom: 14,
          lineHeight: 1.2,
          maxWidth: 560,
          margin: '0 auto 14px',
        }}>
          Where verified truth diverges from popular opinion.
        </h1>

        <p style={{
          color: 'var(--text-muted)',
          fontSize: 15,
          maxWidth: 420,
          margin: '0 auto 52px',
          lineHeight: 1.7,
        }}>
          The first public opinion platform that shows you the gap between what people say — and what identity-verified humans actually believe.
        </p>

        {/* Tier entry cards */}
        <div style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: 860,
          margin: '0 auto',
        }}>
          <TierCard
            label="Guest"
            icon="👁"
            description="Browse questions and see unverified public sentiment — no account needed."
            cta="Browse as Guest"
            accent="var(--text-muted)"
            borderColor="rgba(120,116,150,0.3)"
            onClick={handleGuest}
          />
          <TierCard
            label="Member"
            icon="✦"
            description="Register to cast your vote and see combined sentiment data across all users."
            note="Your vote is always anonymous."
            cta="Register / Sign In"
            accent="var(--gold)"
            borderColor="var(--gold-border)"
            highlighted
            onClick={handleRegister}
          />
          <TierCard
            label="Verified"
            icon="◈"
            description="Complete KYC identity verification. Your vote enters the Truth Layer — the signal that matters."
            note="Your vote is always anonymous."
            cta="Get Verified"
            accent="var(--teal)"
            borderColor="var(--teal-border)"
            onClick={handleVerify}
          />
        </div>

        {/* Truth gap teaser */}
        <div style={{
          marginTop: 56,
          padding: '20px 32px',
          background: 'rgba(10,12,26,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Our core signal</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)', fontWeight: 600 }}>The Truth Gap™</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(201,168,76,0.2)' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'left', maxWidth: 280, lineHeight: 1.6 }}>
            The % divergence between what <span style={{ color: 'var(--text)' }}>everyone says</span> and what <span style={{ color: 'var(--teal)' }}>verified humans</span> actually believe.
          </div>
        </div>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => navigate(authTarget === 'verify' ? '/verify' : '/feed')}
        />
      )}
    </div>
  )
}

function TierCard({ label, icon, description, note, cta, accent, borderColor, highlighted, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 220px',
        maxWidth: 260,
        padding: '32px 24px',
        background: highlighted
          ? `rgba(201,168,76,0.06)`
          : 'rgba(10,12,26,0.7)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${hovered ? accent : borderColor}`,
        borderRadius: 18,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? `0 12px 40px rgba(${highlighted ? '201,168,76' : '76,201,168'},0.12)` : 'none',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 14, color: accent }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: accent,
        fontWeight: 600,
        marginBottom: 10,
      }}>{label}</div>
      <p style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        marginBottom: note ? 6 : 24,
        minHeight: 60,
      }}>
        {description}
      </p>
      {note && (
        <p style={{ fontSize: 11, color: 'var(--teal)', marginTop: 6, marginBottom: 24 }}>
          {note}
        </p>
      )}
      <button onClick={onClick} style={{
        width: '100%',
        padding: '10px 16px',
        background: highlighted ? 'linear-gradient(135deg, #C9A84C, #a8882e)' : 'none',
        border: highlighted ? 'none' : `1px solid ${accent}`,
        color: highlighted ? '#05060F' : accent,
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.05em',
        cursor: 'pointer',
        transition: 'opacity 0.2s',
      }}>
        {cta}
      </button>
    </div>
  )
}
