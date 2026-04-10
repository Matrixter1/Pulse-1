import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../lib/auth'

const STEPS = [
  {
    icon: '◎',
    title: 'Government ID',
    description: 'Upload a photo of your passport, driver\'s licence, or national ID card.',
    status: 'pending',
  },
  {
    icon: '◉',
    title: 'Liveness Check',
    description: 'A brief facial scan confirms you are a real, live person — not a bot or proxy.',
    status: 'pending',
  },
  {
    icon: '◈',
    title: 'Address Verification',
    description: 'Provide a utility bill or bank statement from the last 90 days.',
    status: 'pending',
  },
]

export default function Verify() {
  const navigate = useNavigate()
  const { tier } = useAuth()

  if (tier === 'verified') {
    return (
      <div className="page">
        <NavBar />
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(76,201,168,0.12)',
            border: '2px solid var(--teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 28,
            color: 'var(--teal)',
          }}>◈</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--teal)', marginBottom: 12 }}>
            Identity Verified
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
            Your identity has been confirmed. Your votes enter the Truth Layer and are visible in verified-only results.
          </p>
          <button
            onClick={() => navigate('/feed')}
            style={{
              background: 'linear-gradient(135deg, #4CC9A8, #2a9a7e)',
              border: 'none',
              color: '#05060F',
              padding: '12px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continue to Feed
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: 13, marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(76,201,168,0.08)',
            border: '1px solid rgba(76,201,168,0.2)',
            borderRadius: 20,
            padding: '6px 14px',
            marginBottom: 20,
          }}>
            <span style={{ color: 'var(--teal)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ◈ Identity Verification
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: 14,
            lineHeight: 1.2,
          }}>
            Join the Truth Layer
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 480 }}>
            Identity verification is what separates signal from noise. When you verify, your votes enter a separate data layer — letting us measure the gap between public sentiment and what real, confirmed humans actually believe.
          </p>
        </div>

        {/* Truth Gap explanation */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(76,201,168,0.06))',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 14,
          padding: '24px 28px',
          marginBottom: 36,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Without verification</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold)', marginBottom: 6 }}>Public Poll</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Anyone can vote. Results may include bots, brigading, or coordinated manipulation.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--teal)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>With verification</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--teal)', marginBottom: 6 }}>Truth Layer</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Only confirmed humans. The purest signal of genuine opinion — the Truth Gap reveals what's real.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
            Verification Steps
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                background: 'rgba(10,12,26,0.8)',
                border: '1px solid rgba(201,168,76,0.12)',
                borderRadius: 12,
                padding: '20px 24px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(76,201,168,0.08)',
                  border: '1px solid rgba(76,201,168,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--teal)',
                  fontSize: 16,
                  flexShrink: 0,
                }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{
          background: 'rgba(10,12,26,0.5)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 32,
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>
          🔒 <strong style={{ color: 'var(--text)' }}>Privacy-first design.</strong> Your identity documents are processed by a third-party KYC provider and are never stored on Pulse servers. Only a verification status flag is retained. Your votes remain anonymous even after verification.
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/feed')}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'none',
              border: '1px solid rgba(201,168,76,0.25)',
              color: 'var(--text-muted)',
              borderRadius: 10,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
          <button
            disabled
            style={{
              flex: 2,
              padding: '14px 20px',
              background: 'linear-gradient(135deg, rgba(76,201,168,0.3), rgba(76,201,168,0.15))',
              border: '1px solid rgba(76,201,168,0.4)',
              color: 'var(--teal)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'not-allowed',
              letterSpacing: '0.03em',
            }}
          >
            ◈ Begin Verification — Coming Soon
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 16 }}>
          KYC integration coming in the next release. Join the waitlist to be notified.
        </p>
      </div>
    </div>
  )
}
