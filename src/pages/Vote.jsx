import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AuthModal from '../components/AuthModal'
import { TierBanner, PageLoading, CategoryBadge, TypeBadge } from '../components/ui'
import QuestionMedia from '../components/QuestionMedia'
import StatementVote from '../components/question-types/StatementVote'
import ChoiceVote from '../components/question-types/ChoiceVote'
import RankedVote from '../components/question-types/RankedVote'
import { fetchQuestion, submitVote, hasUserVoted } from '../lib/data'
import { useAuth } from '../lib/auth'

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

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
  const plainEnglish = typeof value.plain_english === 'string' ? value.plain_english.trim() : ''
  const background = typeof value.background === 'string' ? value.background.trim() : ''
  const answerInsights = Array.isArray(value.answer_insights)
    ? value.answer_insights
        .map((item) => {
          if (typeof item === 'string') {
            const answer = item.trim()
            return answer ? { answer, insight: '' } : null
          }
          if (!item || typeof item !== 'object') return null
          const answer = typeof item.answer === 'string' ? item.answer.trim() : ''
          const insight = typeof item.insight === 'string' ? item.insight.trim() : ''
          if (!answer) return null
          return { answer, insight }
        })
        .filter(Boolean)
    : []
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

  if (!title && !plainEnglish && !background && answerInsights.length === 0 && keyTerms.length === 0 && sources.length === 0) return null

  return {
    title: title || 'More Insights',
    plainEnglish,
    background,
    answerInsights,
    keyTerms,
    sources,
  }
}

export default function Vote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, tier } = useAuth()

  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const q = await fetchQuestion(id)
        setQuestion(q)
        if (user) {
          const voted = await hasUserVoted(id, user.id)
          setAlreadyVoted(voted)
        }
      } catch {
        setError('Statement not found.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user])

  async function handleSubmit(voteData) {
    if (tier === 'guest' || !user) { setShowAuth(true); return }
    if (alreadyVoted) return
    setSubmitting(true)
    setError('')
    try {
      await submitVote({
        questionId: id,
        userId: user.id,
        type: question.type || 'statement',
        isVerified: tier === 'verified',
        ...voteData,
      })
      navigate(`/results/${id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <><NavBar /><PageLoading /></>

  if (!question) return (
    <div className="page">
      <NavBar />
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        {error || 'Not found.'}
      </div>
    </div>
  )

  const canVote = tier !== 'guest' && !!user
  const questionType = question.type || 'statement'
  const options = parseOptions(question.options)
  const brief = parseBrief(question.brief)

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 20px 80px' }}>
        <button onClick={() => navigate('/feed')} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 13, marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back
        </button>

        {/* Question card */}
        <div className="glass" style={{ padding: '32px 36px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <CategoryBadge category={question.category} />
            <TypeBadge type={questionType} />
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 3vw, 26px)',
            fontStyle: questionType === 'statement' ? 'italic' : 'normal',
            lineHeight: 1.45, color: 'var(--text)',
          }}>
            {questionType === 'statement' ? `"${question.text}"` : question.text}
          </p>
        </div>

        {/* Question image */}
        {question.image_url && (
          <div style={{
            marginBottom: 24,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--gold-border)',
            maxHeight: 320,
          }}>
            <QuestionMedia src={question.image_url} alt="" variant="detail" />
          </div>
        )}

        {/* Tier banner */}
        <div style={{ marginBottom: 24 }}>
          <TierBanner
            tier={tier}
            onAction={() => tier === 'guest' ? setShowAuth(true) : navigate('/verify')}
          />
        </div>

        {brief && (
          <MoreInsightsCard brief={brief} />
        )}

        {/* Already voted state */}
        {alreadyVoted && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              fontSize: 32, marginBottom: 16, color: 'var(--teal)'
            }}>◈</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 24,
              color: 'var(--text)', marginBottom: 12
            }}>
              You've already signalled on this.
            </div>
            <p style={{
              color: 'var(--text-muted)', fontSize: 14,
              marginBottom: 28
            }}>
              Your anonymous vote is recorded in the Truth Layer.
            </p>
            <button
              onClick={() => navigate(`/results/${id}`)}
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
                border: 'none', color: '#05060F',
                padding: '14px 32px', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}
            >
              See the Truth Gap →
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 20,
            fontSize: 13, color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        {/* Anonymity assurance */}
        {!alreadyVoted && (
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            ◈ Your vote is anonymous — your identity is never linked to your response.
          </p>
        )}

        {/* Vote UI — type-aware */}
        {!alreadyVoted && (
          <>
            {questionType === 'statement' && (
              <StatementVote onSubmit={handleSubmit} submitting={submitting} canVote={canVote} />
            )}
            {questionType === 'choice' && (
              <ChoiceVote options={options} onSubmit={handleSubmit} submitting={submitting} canVote={canVote} />
            )}
            {questionType === 'ranked' && (
              <RankedVote options={options} onSubmit={handleSubmit} submitting={submitting} canVote={canVote} />
            )}
          </>
        )}
      </div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      )}
    </div>
  )
}

function MoreInsightsCard({ brief }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        marginBottom: 24,
        background: 'rgba(12, 18, 34, 0.72)',
        border: '1px solid rgba(76,201,168,0.18)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '18px 20px',
        }}
      >
        <div>
          <div style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            fontWeight: 700,
            marginBottom: 6,
          }}>
            More Insights
          </div>
          <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>
            {brief.title || 'High-level context for this question'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Click for more context before you vote.
          </div>
        </div>
        <span style={{ color: 'var(--gold)', fontSize: 18, lineHeight: 1 }}>
          {expanded ? '-' : '+'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', display: 'grid', gap: 18 }}>
          {brief.plainEnglish && (
            <div>
              <div style={sectionLabelStyle}>In plain English</div>
              <p style={sectionBodyStyle}>{brief.plainEnglish}</p>
            </div>
          )}

          {brief.background && (
            <div>
              <div style={sectionLabelStyle}>Why this matters</div>
              <p style={sectionBodyStyle}>{brief.background}</p>
            </div>
          )}

          {brief.answerInsights.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>About the answers</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {brief.answerInsights.map((item) => (
                  <div key={`${item.answer}-${item.insight || 'plain'}`} style={glossaryRowStyle}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: item.insight ? 4 : 0 }}>{item.answer}</div>
                    {item.insight ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.insight}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.keyTerms.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Key Terms</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {brief.keyTerms.map((item) => (
                  <div key={`${item.term}-${item.definition}`} style={glossaryRowStyle}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: item.definition ? 4 : 0 }}>{item.term}</div>
                    {item.definition ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.definition}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.sources.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Sources</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {brief.sources.map((item) => (
                  item.url ? (
                    <a
                      key={`${item.label}-${item.url}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'var(--teal)',
                        textDecoration: 'none',
                        fontSize: 13,
                      }}
                    >
                      {item.label} {'->'}
                    </a>
                  ) : (
                    <div
                      key={`${item.label}-plain`}
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.label}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const sectionLabelStyle = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 700,
  marginBottom: 8,
}

const sectionBodyStyle = {
  color: 'var(--text-muted)',
  fontSize: 14,
  lineHeight: 1.65,
  margin: 0,
}

const glossaryRowStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
}
