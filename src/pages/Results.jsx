import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { fetchQuestion, fetchVotesForQuestion, calcResults, calcTruthGap } from '../lib/votes'
import { useAuth } from '../lib/auth'

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tier } = useAuth()

  const [question, setQuestion] = useState(null)
  const [allResults, setAllResults] = useState(null)
  const [verifiedResults, setVerifiedResults] = useState(null)
  const [truthGap, setTruthGap] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [q, votes] = await Promise.all([
          fetchQuestion(id),
          fetchVotesForQuestion(id),
        ])
        setQuestion(q)
        const all = calcResults(votes)
        const verified = calcResults(votes.filter(v => v.is_verified))
        setAllResults(all)
        setVerifiedResults(verified)
        setTruthGap(calcTruthGap(all, verified))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function insight(all, verified) {
    if (!all || all.total === 0) return null
    if (verified.total === 0) return 'No verified votes yet — be the first to verify and cast your ballot.'

    const topAll = Object.entries(all)
      .filter(([k]) => ['Disagree', 'Neutral', 'Agree'].includes(k))
      .sort((a, b) => b[1] - a[1])[0]
    const topVerified = Object.entries(verified)
      .filter(([k]) => ['Disagree', 'Neutral', 'Agree'].includes(k))
      .sort((a, b) => b[1] - a[1])[0]

    if (topAll[0] !== topVerified[0]) {
      return `Public opinion leans ${topAll[0].toLowerCase()}, but verified humans predominantly ${topVerified[0].toLowerCase()} — a meaningful Truth Gap of ${truthGap}%.`
    }
    if (truthGap >= 15) {
      return `Both groups lean ${topAll[0].toLowerCase()}, yet the ${truthGap}% gap reveals a significant divergence in intensity between the public and identity-verified respondents.`
    }
    return `Verified and public sentiment are broadly aligned on this question with only a ${truthGap}% gap — rare consensus.`
  }

  if (loading) return <LoadingScreen />

  const canSeeVerified = tier === 'registered' || tier === 'verified'
  const canSeeSplit = tier === 'verified'

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' }}>
        {/* Back */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <button onClick={() => navigate('/feed')} style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ← Feed
          </button>
          <button onClick={() => navigate(`/vote/${id}`)} style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ← Vote
          </button>
        </div>

        {/* Question */}
        {question && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 600 }}>
              {question.category} · Results
            </div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(20px, 3vw, 28px)',
              fontStyle: 'italic',
              lineHeight: 1.4,
              color: 'var(--text)',
            }}>
              "{question.text}"
            </p>
          </div>
        )}

        {/* TRUTH GAP — the killer feature */}
        <div style={{
          background: canSeeSplit
            ? 'linear-gradient(135deg, rgba(76,201,168,0.08), rgba(201,168,76,0.08))'
            : 'rgba(10,12,26,0.7)',
          border: `1px solid ${canSeeSplit ? 'rgba(76,201,168,0.3)' : 'rgba(201,168,76,0.2)'}`,
          borderRadius: 18,
          padding: '36px 40px',
          marginBottom: 28,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background ring */}
          <div style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: `1px solid ${canSeeSplit ? 'rgba(76,201,168,0.06)' : 'rgba(201,168,76,0.06)'}`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }} />

          <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Truth Gap™
          </div>

          {canSeeSplit ? (
            <>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(56px, 10vw, 88px)',
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 8,
                background: 'linear-gradient(135deg, #C9A84C, #4CC9A8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {truthGap}%
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
                Divergence between public sentiment and verified-human opinion
              </p>
              <TruthGapBar gap={truthGap} />
            </>
          ) : (
            <div style={{ padding: '16px 0' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 40,
                color: 'var(--gold)',
                marginBottom: 12,
                opacity: 0.4,
              }}>?? %</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 320, margin: '0 auto 16px' }}>
                {tier === 'guest'
                  ? 'Sign in to see public results, or verify your identity to unlock the Truth Gap.'
                  : 'Verify your identity to unlock the Truth Gap and see how verified humans diverge from public opinion.'}
              </p>
              <button
                onClick={() => navigate(tier === 'guest' ? '/splash' : '/verify')}
                style={{
                  background: 'none',
                  border: '1px solid rgba(76,201,168,0.4)',
                  color: 'var(--teal)',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tier === 'guest' ? 'Sign in' : 'Get Verified →'}
              </button>
            </div>
          )}
        </div>

        {/* Insight text */}
        {canSeeVerified && allResults && verifiedResults && insight(allResults, verifiedResults) && (
          <div style={{
            background: 'rgba(10,12,26,0.6)',
            border: '1px solid rgba(201,168,76,0.1)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 28,
            fontSize: 14,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            {insight(allResults, verifiedResults)}
          </div>
        )}

        {/* Split panel charts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: canSeeSplit ? '1fr 1fr' : '1fr',
          gap: 20,
          marginBottom: 28,
        }}>
          {/* All responses */}
          {(canSeeVerified || tier === 'guest') && allResults && (
            <SentimentPanel
              title="All Responses"
              subtitle={`${allResults.total} total votes`}
              results={allResults}
              accent="var(--gold)"
              locked={tier === 'guest'}
            />
          )}

          {/* Verified only */}
          {canSeeSplit && verifiedResults && (
            <SentimentPanel
              title="Verified Only"
              subtitle={`${verifiedResults.total} verified votes`}
              results={verifiedResults}
              accent="var(--teal)"
              verified
            />
          )}

          {/* Teaser for non-verified */}
          {!canSeeSplit && canSeeVerified && (
            <div style={{
              background: 'rgba(76,201,168,0.04)',
              border: '1px dashed rgba(76,201,168,0.2)',
              borderRadius: 14,
              padding: '28px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}>
              <div style={{ fontSize: 24, opacity: 0.4 }}>◈</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--teal)', opacity: 0.6 }}>
                Verified Only
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}>
                Verify your identity to see how KYC-confirmed humans actually voted
              </p>
              <button
                onClick={() => navigate('/verify')}
                style={{
                  background: 'none',
                  border: '1px solid rgba(76,201,168,0.35)',
                  color: 'var(--teal)',
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Unlock →
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/feed')}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'none',
              border: '1px solid rgba(201,168,76,0.25)',
              color: 'var(--gold)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← More Questions
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Pulse by Matrixter', url: window.location.href })
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
              border: 'none',
              color: '#05060F',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Share Results ↗
          </button>
        </div>
      </div>
    </div>
  )
}

function SentimentPanel({ title, subtitle, results, accent, verified, locked }) {
  const bars = [
    { label: 'Agree', value: results.Agree, color: '#4CC9A8' },
    { label: 'Neutral', value: results.Neutral, color: '#C9A84C' },
    { label: 'Disagree', value: results.Disagree, color: '#C94C4C' },
  ]

  return (
    <div style={{
      background: 'rgba(10,12,26,0.8)',
      border: `1px solid ${verified ? 'rgba(76,201,168,0.25)' : 'rgba(201,168,76,0.2)'}`,
      borderRadius: 14,
      padding: '28px 24px',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {verified && '◈ '}{title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>

      {locked ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Sign in to see results
        </div>
      ) : results.total === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No votes yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bars.map(bar => (
            <div key={bar.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{bar.label}</span>
                <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}%</span>
              </div>
              <div style={{
                height: 8,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${bar.value}%`,
                  background: bar.color,
                  borderRadius: 4,
                  transition: 'width 0.6s ease',
                  boxShadow: `0 0 8px ${bar.color}44`,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TruthGapBar({ gap }) {
  const intensity = gap >= 30 ? 'High' : gap >= 15 ? 'Medium' : 'Low'
  const color = gap >= 30 ? '#C94C4C' : gap >= 15 ? '#C9A84C' : '#4CC9A8'

  return (
    <div style={{ marginTop: 20, maxWidth: 320, margin: '20px auto 0' }}>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%',
          width: `${Math.min(gap, 100)}%`,
          background: `linear-gradient(to right, #4CC9A8, ${color})`,
          borderRadius: 2,
          transition: 'width 0.8s ease',
        }} />
      </div>
      <div style={{ fontSize: 11, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {intensity} divergence
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="page">
      <NavBar />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
        Loading results…
      </div>
    </div>
  )
}
