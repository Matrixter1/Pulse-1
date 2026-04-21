import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { fetchQuestion, fetchVotesForQuestion, calcResults, calcTruthGap, calcChoiceResults, calcRankedResults, calcChoiceTruthGap, calcRankedTruthGap } from '../lib/data'
import { useAuth } from '../lib/auth'
import ChoiceResults from '../components/question-types/ChoiceResults'
import RankedResults from '../components/question-types/RankedResults'
import QuestionMedia from '../components/QuestionMedia'

function parseBrief(raw) {
  if (!raw) return null
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const background = typeof value.background === 'string' ? value.background.trim() : ''
  const keyTerms = Array.isArray(value.key_terms)
    ? value.key_terms
        .map((item) => {
          if (typeof item === 'string') {
            const term = item.trim()
            return term ? { term, definition: '' } : null
          }
          if (!item || typeof item !== 'object') return null
          const term = typeof item.term === 'string' ? item.term.trim() : ''
          const definition = typeof item.definition === 'string' ? item.definition.trim() : ''
          if (!term) return null
          return { term, definition }
        })
        .filter(Boolean)
    : []
  const sources = Array.isArray(value.sources)
    ? value.sources
        .map((item) => {
          if (typeof item === 'string') {
            const label = item.trim()
            return label ? { label, url: '' } : null
          }
          if (!item || typeof item !== 'object') return null
          const label = typeof item.label === 'string' ? item.label.trim() : ''
          const url = typeof item.url === 'string' ? item.url.trim() : ''
          if (!label) return null
          return { label, url }
        })
        .filter(Boolean)
    : []

  if (!title && !background && keyTerms.length === 0 && sources.length === 0) return null
  return { title: title || 'More Insights', background, keyTerms, sources }
}

function deriveWhyThisMatters(question) {
  const categoryLabel = (question?.category || 'this topic').toLowerCase()
  const type = question?.type || 'statement'
  if (type === 'ranked') {
    return `Ranking questions reveal what people prioritize, not just what they like. A little context helps you read the order with more nuance.`
  }
  if (type === 'choice') {
    return `Choice questions compress a complex subject into a single verdict. This context helps you understand what each option is really standing in for.`
  }
  return `Statement questions look simple, but they often sit on top of bigger debates in ${categoryLabel}. This context helps you interpret the result with more confidence.`
}

function MoreInsightsSummary({ brief, question, navigate }) {
  const [expanded, setExpanded] = useState(false)

  if (!brief) return null

  return (
    <div style={{
      background: 'rgba(12,18,34,0.72)',
      border: '1px solid rgba(76,201,168,0.18)',
      borderRadius: 'var(--radius-lg)',
      marginTop: 18,
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 700, marginBottom: 6 }}>
            More Insights
          </div>
          <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>
            {brief.title}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Context that explains the question behind the result.
          </div>
        </div>
        <span style={{ color: 'var(--gold)', fontSize: 18, lineHeight: 1 }}>
          {expanded ? '-' : '+'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', display: 'grid', gap: 18 }}>
          <div>
            <div style={briefLabelStyle}>Why this matters</div>
            <p style={briefBodyStyle}>{deriveWhyThisMatters(question)}</p>
          </div>
          {brief.background ? (
            <div>
              <div style={briefLabelStyle}>Background</div>
              <p style={briefBodyStyle}>{brief.background}</p>
            </div>
          ) : null}
          {brief.keyTerms.length > 0 ? (
            <div>
              <div style={briefLabelStyle}>Key Terms</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {brief.keyTerms.map((item) => (
                  <div key={`${item.term}-${item.definition || 'plain'}`} style={briefPanelStyle}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: item.definition ? 4 : 0 }}>{item.term}</div>
                    {item.definition ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.definition}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {brief.sources.length > 0 ? (
            <div>
              <div style={briefLabelStyle}>Sources</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {brief.sources.map((item) => (
                  item.url ? (
                    <a
                      key={`${item.label}-${item.url}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--teal)', textDecoration: 'none', fontSize: 13 }}
                    >
                      {item.label} {'->'}
                    </a>
                  ) : (
                    <div key={`${item.label}-plain`} style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                      {item.label}
                    </div>
                  )
                ))}
              </div>
            </div>
          ) : null}
          <button
            onClick={() => navigate(`/vote/${question.id}`)}
            style={{
              justifySelf: 'start',
              background: 'none',
              border: '1px solid rgba(76,201,168,0.35)',
              color: 'var(--teal)',
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Re-open vote context {'->'}
          </button>
        </div>
      )}
    </div>
  )
}

const briefLabelStyle = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 700,
  marginBottom: 8,
}

const briefBodyStyle = {
  color: 'var(--text-muted)',
  fontSize: 14,
  lineHeight: 1.65,
  margin: 0,
}

const briefPanelStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
}

function isResultsVisible(question, totalVotes) {
  const mode = question?.reveal_mode || 'instant'
  if (mode === 'instant') return { visible: true }
  if (mode === 'threshold') {
    const threshold = question.reveal_threshold || 10
    if (totalVotes >= threshold) return { visible: true }
    return {
      visible: false,
      mode: 'threshold',
      current: totalVotes,
      threshold,
      message: `Results reveal when ${threshold} people have voted`,
    }
  }
  if (mode === 'date') {
    const revealDate = new Date(question.reveal_date)
    const now = new Date()
    if (now >= revealDate) return { visible: true }
    return {
      visible: false,
      mode: 'date',
      revealDate,
      message: 'Results are locked until the reveal date',
    }
  }
  return { visible: true }
}

export default function Results() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tier } = useAuth()

  const [question, setQuestion] = useState(null)
  const [allResults, setAllResults] = useState(null)
  const [verifiedResults, setVerifiedResults] = useState(null)
  const [truthGap, setTruthGap] = useState(0)
  const [displayGap, setDisplayGap] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!truthGap) return
    let start = 0
    const end = truthGap
    const duration = 1200
    const step = 16
    const increment = end / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setDisplayGap(end)
        clearInterval(timer)
      } else {
        setDisplayGap(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [truthGap])

  useEffect(() => {
    async function load() {
      try {
        const [q, votes] = await Promise.all([
          fetchQuestion(id),
          fetchVotesForQuestion(id),
        ])
        setQuestion(q)
        const type = q.type || 'statement'
        const options = q.options
          ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options)
          : []
        let all, verified
        if (type === 'statement') {
          all = calcResults(votes)
          verified = calcResults(votes.filter(v => v.is_verified))
          setTruthGap(calcTruthGap(all, verified))
        } else if (type === 'choice') {
          all = calcChoiceResults(votes, options)
          verified = calcChoiceResults(votes.filter(v => v.is_verified), options)
          setTruthGap(calcChoiceTruthGap(all, verified))
        } else {
          all = calcRankedResults(votes, options)
          verified = calcRankedResults(votes.filter(v => v.is_verified), options)
          setTruthGap(calcRankedTruthGap(all, verified))
        }
        setAllResults(all)
        setVerifiedResults(verified)
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
  const totalVotes = allResults?.total || 0
  const visibility = isResultsVisible(question, totalVotes)
  const brief = parseBrief(question?.brief)

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
            <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              Live Results
            </div>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 600 }}>
              {question.category} · Results
            </div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(20px, 3vw, 28px)',
              fontStyle: (!question.type || question.type === 'statement') ? 'italic' : 'normal',
              lineHeight: 1.4,
              color: 'var(--text)',
            }}>
              {(!question.type || question.type === 'statement') ? `"${question.text}"` : question.text}
            </p>
            {question.image_url && (
              <div style={{
                marginTop: 18,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--gold-border)',
                maxHeight: 320,
              }}>
                <QuestionMedia src={question.image_url} alt="" variant="detail" />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <ResultsMetaChip label="Total" value={`${totalVotes} votes`} />
              <ResultsMetaChip
                label="Verified"
                value={`${verifiedResults?.total || 0} · ${totalVotes > 0 ? Math.round(((verifiedResults?.total || 0) / totalVotes) * 100) : 0}%`}
                accent="var(--teal)"
              />
              <ResultsMetaChip label="Reveal" value={formatRevealLabel(question)} />
            </div>
            <MoreInsightsSummary brief={brief} question={question} navigate={navigate} />
          </div>
        )}

        {/* Locked Results — shown when reveal_mode hasn't triggered yet */}
        {!visibility.visible && (
          <LockedResults visibility={visibility} totalVotes={totalVotes} />
        )}

        {/* TRUTH GAP + all result panels — only shown when results are visible */}
        {visibility.visible && (<>
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
                {displayGap}%
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

        {/* Insight text — statement type only (insight() uses Disagree/Neutral/Agree keys) */}
        {question?.type === 'statement' && canSeeVerified && allResults && verifiedResults && insight(allResults, verifiedResults) && (
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

        {/* Choice and Ranked results panels */}
        {question?.type === 'choice' && allResults && (
          <div style={{ marginBottom: 28 }}>
            <ChoiceResults allResults={allResults} verifiedResults={verifiedResults} canSeeSplit={canSeeSplit} />
          </div>
        )}
        {question?.type === 'ranked' && allResults && (
          <div style={{ marginBottom: 28 }}>
            <RankedResults allResults={allResults} verifiedResults={verifiedResults} canSeeSplit={canSeeSplit} />
          </div>
        )}

        {/* Statement split panel charts (statement type only) */}
        {(!question?.type || question?.type === 'statement') && (
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
        )}

        </>)}

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
            ← Back to Feed
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Pulse by Matrixter',
                  text: `Truth Gap: ${truthGap}% — see where verified truth diverges from popular opinion.`,
                  url: window.location.href,
                })
              } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                })
              }
            }}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: copied
                ? 'rgba(76,201,168,0.12)'
                : 'linear-gradient(135deg, #C9A84C, #a8882e)',
              border: copied ? '1px solid rgba(76,201,168,0.5)' : 'none',
              color: copied ? 'var(--teal)' : '#05060F',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s, border 0.2s',
            }}
          >
            {copied ? '✓ Link Copied' : 'Share Results ↗'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LockedResults({ visibility }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (visibility.mode !== 'date') return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [visibility.mode])

  function getCountdown() {
    const diff = new Date(visibility.revealDate) - now
    if (diff <= 0) return null
    const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, minutes, seconds }
  }

  const countdown = visibility.mode === 'date' ? getCountdown() : null

  return (
    <div style={{
      background: 'rgba(10,12,26,0.8)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: 'var(--radius-lg)',
      padding: '48px 40px',
      textAlign: 'center',
      marginBottom: 28,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.6 }}>◈</div>

      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        color: 'var(--gold)',
        marginBottom: 12,
        fontStyle: 'italic',
      }}>
        {visibility.mode === 'threshold' ? 'The signal is gathering...' : 'The signal is locked.'}
      </div>

      <p style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        maxWidth: 360,
        margin: '0 auto 28px',
      }}>
        {visibility.message}
      </p>

      {/* Threshold progress bar */}
      {visibility.mode === 'threshold' && (
        <div style={{ maxWidth: 320, margin: '0 auto' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12, color: 'var(--text-muted)', marginBottom: 8,
          }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{visibility.current} voted</span>
            <span>{visibility.threshold} needed</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((visibility.current / visibility.threshold) * 100, 100)}%`,
              background: 'linear-gradient(to right, var(--gold), var(--teal))',
              borderRadius: 3,
              transition: 'width 0.6s ease',
              boxShadow: '0 0 8px rgba(201,168,76,0.4)',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>
            {visibility.threshold - visibility.current} more {visibility.threshold - visibility.current === 1 ? 'vote' : 'votes'} to reveal
          </div>
        </div>
      )}

      {/* Date countdown */}
      {visibility.mode === 'date' && countdown && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
          {[
            { value: countdown.days,    label: 'days'  },
            { value: countdown.hours,   label: 'hours' },
            { value: countdown.minutes, label: 'min'   },
            { value: countdown.seconds, label: 'sec'   },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 42, fontWeight: 700,
                color: 'var(--gold)', lineHeight: 1, minWidth: 56,
              }}>
                {String(value).padStart(2, '0')}
              </div>
              <div style={{
                fontSize: 10, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 4,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
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

function ResultsMetaChip({ label, value, accent = 'var(--gold)' }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 999,
      background: 'rgba(10,12,26,0.72)',
      border: `1px solid ${accent === 'var(--teal)' ? 'rgba(76,201,168,0.22)' : 'rgba(201,168,76,0.22)'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function formatRevealLabel(question) {
  const mode = question?.reveal_mode || 'instant'
  if (mode === 'threshold') return 'Threshold lock'
  if (mode === 'date') return 'Timed release'
  return 'Instant'
}
