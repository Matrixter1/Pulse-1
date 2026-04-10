import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AuthModal from '../components/AuthModal'
import { fetchQuestion, submitVote, hasUserVoted } from '../lib/votes'
import { useAuth } from '../lib/auth'

const REASON_CHIPS = [
  'Personal experience',
  'Scientific evidence',
  'Moral principle',
  'Economic reasoning',
  'Cultural values',
  'Historical precedent',
  'Future concern',
  'Religious belief',
]

export default function Vote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, tier } = useAuth()

  const [question, setQuestion] = useState(null)
  const [sliderValue, setSliderValue] = useState(50)
  const [selectedReason, setSelectedReason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState('')
  const isDragging = useRef(false)

  useEffect(() => {
    async function load() {
      try {
        const q = await fetchQuestion(id)
        setQuestion(q)
        if (user) {
          const voted = await hasUserVoted(id, user.id)
          setAlreadyVoted(voted)
        }
      } catch (err) {
        setError('Question not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user])

  // Slider color: red (0) → gold (50) → teal (100)
  function sliderColor(v) {
    if (v <= 50) {
      const t = v / 50
      const r = Math.round(201 + (201 - 201) * t)
      const g = Math.round(76 + (168 - 76) * t)
      const b = Math.round(76 + (76 - 76) * t)
      // red #C94C4C → gold #C9A84C
      const gr = 201
      const gg = Math.round(76 + (168 - 76) * t)
      const gb = Math.round(76 + (76 - 76) * t)
      return `rgb(${gr},${gg},${gb})`
    } else {
      const t = (v - 50) / 50
      // gold #C9A84C → teal #4CC9A8
      const r = Math.round(201 + (76 - 201) * t)
      const g = Math.round(168 + (201 - 168) * t)
      const b = Math.round(76 + (168 - 76) * t)
      return `rgb(${r},${g},${b})`
    }
  }

  function bucketLabel(v) {
    if (v <= 33) return 'Disagree'
    if (v <= 66) return 'Neutral'
    return 'Agree'
  }

  function bucketDescription(v) {
    if (v <= 15) return 'Strongly Disagree'
    if (v <= 33) return 'Disagree'
    if (v <= 45) return 'Lean Disagree'
    if (v <= 55) return 'Neutral'
    if (v <= 66) return 'Lean Agree'
    if (v <= 84) return 'Agree'
    return 'Strongly Agree'
  }

  async function handleSubmit() {
    if (tier === 'guest') { setShowAuth(true); return }
    if (!user) { setShowAuth(true); return }
    if (alreadyVoted) return

    setSubmitting(true)
    setError('')
    try {
      await submitVote({
        questionId: id,
        userId: user.id,
        spectrumValue: sliderValue,
        reason: selectedReason,
        isVerified: tier === 'verified',
      })
      navigate(`/results/${id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen />

  if (!question) return (
    <div className="page">
      <NavBar />
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        {error || 'Question not found.'}
      </div>
    </div>
  )

  const color = sliderColor(sliderValue)
  const canVote = tier !== 'guest' && !!user

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Back */}
        <button onClick={() => navigate('/feed')} style={{
          background: 'none', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer',
          fontSize: 13, marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back to questions
        </button>

        {/* Question */}
        <div className="glass" style={{ padding: '36px 40px', marginBottom: 28 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: 16, fontWeight: 600,
          }}>
            {question.category}
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 3vw, 26px)',
            fontStyle: 'italic',
            lineHeight: 1.4,
            color: 'var(--text)',
          }}>
            "{question.text}"
          </p>
        </div>

        {/* Tier lock message */}
        {tier !== 'verified' && (
          <div style={{
            background: 'rgba(76,201,168,0.06)',
            border: '1px solid rgba(76,201,168,0.2)',
            borderRadius: 10,
            padding: '12px 18px',
            marginBottom: 24,
            fontSize: 13,
            color: 'var(--teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <span>
              {tier === 'verified'
                ? '◈ Your vote will enter the Truth Layer'
                : tier === 'registered'
                  ? '✦ Get verified to join the Truth Layer and see verified sentiment'
                  : '👁 Sign in to cast your vote and see full results'}
            </span>
            {tier !== 'verified' && (
              <button
                onClick={() => navigate('/verify')}
                style={{
                  background: 'none',
                  border: '1px solid rgba(76,201,168,0.4)',
                  color: 'var(--teal)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tier === 'guest' ? 'Sign in' : 'Verify →'}
              </button>
            )}
          </div>
        )}

        {alreadyVoted && (
          <div style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 24,
            fontSize: 13,
            color: 'var(--gold)',
          }}>
            You've already voted on this question.{' '}
            <button
              onClick={() => navigate(`/results/${id}`)}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, fontSize: 13, textDecoration: 'underline' }}
            >
              See results →
            </button>
          </div>
        )}

        {/* Spectrum Slider */}
        {!alreadyVoted && (
          <>
            <div className="glass" style={{ padding: '36px 40px', marginBottom: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 42,
                  fontWeight: 700,
                  color,
                  transition: 'color 0.15s ease',
                  lineHeight: 1,
                  marginBottom: 6,
                }}>
                  {bucketDescription(sliderValue)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Position: <span style={{ color, fontWeight: 600 }}>{sliderValue}</span> / 100
                </div>
              </div>

              {/* Custom slider */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={e => setSliderValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 6,
                    appearance: 'none',
                    background: `linear-gradient(to right, #C94C4C 0%, #C9A84C 50%, #4CC9A8 100%)`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    outline: 'none',
                    '--thumb-color': color,
                  }}
                />
                <style>{`
                  input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: ${color};
                    border: 3px solid var(--bg);
                    box-shadow: 0 0 12px ${color}88;
                    cursor: pointer;
                    transition: background 0.15s ease, box-shadow 0.15s ease;
                  }
                  input[type=range]::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: ${color};
                    border: 3px solid var(--bg);
                    cursor: pointer;
                  }
                `}</style>
              </div>

              {/* Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <span style={{ color: '#C94C4C' }}>Disagree</span>
                <span style={{ color: 'var(--gold)' }}>Neutral</span>
                <span style={{ color: 'var(--teal)' }}>Agree</span>
              </div>
            </div>

            {/* Reason chips */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Optional: Primary reason
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {REASON_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => setSelectedReason(selectedReason === chip ? null : chip)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1px solid ${selectedReason === chip ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
                      background: selectedReason === chip ? 'var(--gold-dim)' : 'transparent',
                      color: selectedReason === chip ? 'var(--gold)' : 'var(--text-muted)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ color: '#C94C4C', fontSize: 13, marginBottom: 16, background: 'rgba(201,76,76,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: canVote
                  ? `linear-gradient(135deg, ${color}, ${color}99)`
                  : 'rgba(201,168,76,0.15)',
                border: canVote ? 'none' : '1px solid rgba(201,168,76,0.3)',
                color: canVote ? '#05060F' : 'var(--gold)',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {submitting
                ? 'Submitting…'
                : !canVote
                  ? 'Sign in to Vote'
                  : tier === 'verified'
                    ? '◈ Submit to Truth Layer'
                    : '✦ Cast Your Vote'}
            </button>

            {tier === 'verified' && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--teal)', marginTop: 10, opacity: 0.7 }}>
                Your identity-verified vote will appear in the Truth Layer
              </p>
            )}
          </>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="page">
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
      </div>
    </div>
  )
}
