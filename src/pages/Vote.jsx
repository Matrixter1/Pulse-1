import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AuthModal from '../components/AuthModal'
import QuestionMedia from '../components/QuestionMedia'
import { TierBanner, PageLoading, CategoryBadge, TypeBadge, Button } from '../components/ui'
import RankedVote from '../components/question-types/RankedVote'
import { fetchQuestion, submitVote, hasUserVoted } from '../lib/data'
import { useAuth } from '../lib/auth'

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

const OPTION_INSIGHT_LIBRARY = [
  ['artificial general intelligence', 'AI that could reason and act across many tasks at or beyond human level, rather than being limited to one narrow job.'],
  ['genetic engineering', 'Directly changing genes in humans, animals, or crops to alter traits, capabilities, or biology.'],
  ['neural interfaces', 'Technology that connects the brain or nervous system directly to computers, devices, or networks.'],
  ['brain-computer interface', 'Technology that connects the brain or nervous system directly to computers, devices, or networks.'],
  ['global surveillance grids', 'Large-scale systems that track populations through cameras, sensors, biometrics, data collection, or network monitoring.'],
  ['surveillance', 'Systems that track people through cameras, sensors, biometrics, data collection, or network monitoring.'],
  ['quantum computing', 'A new kind of computing that uses quantum physics and could solve some problems far faster than today\'s machines.'],
  ['synthetic biology', 'Designing or building new biological systems, rather than only editing the ones that already exist.'],
  ['nanotechnology', 'Engineering matter at an extremely small scale so materials or machines behave in new ways.'],
  ['autonomous weapons', 'Weapons that can identify, track, or strike targets with little or no direct human control.'],
  ['digital minds', 'Software-based minds or mind copies that could think, remember, or act like a person.'],
  ['longevity', 'Technologies aimed at slowing aging, extending lifespan, or keeping people healthy for much longer.'],
]

function humanizeOptionLabel(option) {
  return option
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function deriveOptionInsight(option, type) {
  const normalized = option.toLowerCase().trim()
  const matched = OPTION_INSIGHT_LIBRARY.find(([term]) => normalized.includes(term))
  if (matched) return matched[1]
  if (type === 'choice') {
    return `This option represents the case for ${humanizeOptionLabel(option).toLowerCase()}.`
  }
  if (type === 'ranked') {
    return `This refers to ${humanizeOptionLabel(option).toLowerCase()}. Think about how disruptive or important it could be compared with the other options here.`
  }
  return ''
}

function derivePlainEnglish(question, brief) {
  if (brief?.plainEnglish) return brief.plainEnglish
  const type = question.type || 'statement'
  const options = parseOptions(question.options)
  if (type === 'choice' && options.length >= 2) {
    return `This question asks you to choose between ${options.map((option) => `"${option}"`).join(' and ')}.`
  }
  if (type === 'ranked' && options.length > 0) {
    return `This question asks you to put ${options.length} options in order from most important to least important.`
  }
  if (brief?.background) {
    return `In simple terms, this statement is asking about ${brief.background.charAt(0).toLowerCase()}${brief.background.slice(1)}`
  }
  return 'This is asking where you stand on the statement above.'
}

function deriveAnswerInsights(question, brief) {
  if (brief?.answerInsights?.length) return brief.answerInsights
  const type = question.type || 'statement'
  const options = parseOptions(question.options)
  if (type === 'choice') {
    return options.map((option) => ({
      answer: option,
      insight: deriveOptionInsight(option, type),
    }))
  }
  if (type === 'ranked') {
    return options.map((option) => ({
      answer: option,
      insight: deriveOptionInsight(option, type),
    }))
  }
  return []
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

function getVoteLabel(type) {
  if (type === 'choice') return 'Binary Choice'
  if (type === 'ranked') return 'Ranked Priority'
  return 'Signal'
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

  if (!question) {
    return (
      <div className="page">
        <NavBar />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
          {error || 'Not found.'}
        </div>
      </div>
    )
  }

  const canVote = tier !== 'guest' && !!user
  const questionType = question.type || 'statement'
  const options = parseOptions(question.options)
  const brief = parseBrief(question.brief)

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '40px 20px 90px' }}>
        <button onClick={() => navigate('/feed')} style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 13,
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          ← Back
        </button>

        {error && (
          <div style={{
            background: 'var(--red-dim)',
            border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        {alreadyVoted ? (
          <div style={{
            background: 'rgba(10,12,26,0.76)',
            border: '1px solid rgba(201,168,76,0.16)',
            borderRadius: 'var(--radius-xl)',
            padding: '56px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16, color: 'var(--teal)' }}>◈</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--text)',
              marginBottom: 12,
            }}>
              You&apos;ve already signalled on this.
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
              Your anonymous vote is recorded in the Truth Layer.
            </p>
            <button
              onClick={() => navigate(`/results/${id}`)}
              style={{
                background: 'linear-gradient(135deg, #C9A84C, #a8882e)',
                border: 'none',
                color: '#05060F',
                padding: '14px 32px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              See the Truth Gap →
            </button>
          </div>
        ) : (
          <>
            {questionType === 'choice' ? (
              <CinematicChoiceVote
                question={question}
                options={options}
                tier={tier}
                brief={brief}
                canVote={canVote}
                submitting={submitting}
                onSubmit={handleSubmit}
                onRequireAuth={() => setShowAuth(true)}
              />
            ) : questionType === 'statement' ? (
              <SignalAnalysisVote
                question={question}
                tier={tier}
                brief={brief}
                canVote={canVote}
                submitting={submitting}
                onSubmit={handleSubmit}
                onRequireAuth={() => setShowAuth(true)}
              />
            ) : (
              <CinematicStandardVote
                question={question}
                questionType={questionType}
                options={options}
                tier={tier}
                brief={brief}
                canVote={canVote}
                submitting={submitting}
                onSubmit={handleSubmit}
                onRequireAuth={() => setShowAuth(true)}
              />
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

function SignalAnalysisVote({ question, tier, brief, canVote, submitting, onSubmit, onRequireAuth }) {
  const [value, setValue] = useState(50)
  const [reason, setReason] = useState(null)

  function handleReveal() {
    if (!canVote) {
      onRequireAuth()
      return
    }
    onSubmit({ spectrumValue: value, reason })
  }

  return (
    <>
      <style>{`
        .signal-mobile-flow {
          max-width: 860px;
          margin: 0 auto;
        }
        .signal-slider-input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffa49d 0%, #d8b84f 50%, #63dcbc 100%);
          outline: none;
          cursor: pointer;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        }
        .signal-slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--gold);
          border: 8px solid rgba(201,168,76,0.22);
          box-shadow: 0 12px 28px rgba(0,0,0,0.42), 0 0 0 1px rgba(201,168,76,0.55);
        }
        .signal-slider-input::-moz-range-thumb {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--gold);
          border: 8px solid rgba(201,168,76,0.22);
          box-shadow: 0 12px 28px rgba(0,0,0,0.42), 0 0 0 1px rgba(201,168,76,0.55);
        }
        .signal-driver-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 960px) {
          .vote-reference-frame {
            min-height: 0 !important;
            aspect-ratio: auto !important;
            max-height: none !important;
          }
          .vote-reference-frame img,
          .vote-reference-frame video {
            height: auto !important;
            max-height: 74vh !important;
          }
          .vote-reference-caption {
            position: static !important;
            padding: 14px 16px 16px !important;
            background: rgba(5, 7, 16, 0.78) !important;
          }
          .signal-driver-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      <div className="signal-mobile-flow">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 12,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            fontWeight: 800,
            marginBottom: 14,
          }}>
            Live Signal
          </div>
          <h1 style={{
            fontFamily: 'var(--font-ui, inherit)',
            fontSize: 'clamp(38px, 6vw, 72px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            fontWeight: 500,
            fontStyle: 'italic',
            color: 'var(--text)',
            marginBottom: 18,
          }}>
            "{question.text}"
          </h1>
          <p style={{
            fontSize: 17,
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            maxWidth: 820,
            margin: '0 auto',
          }}>
            {brief?.plainEnglish || 'Move the signal between disagree and agree, then cast your Pulse.'}
          </p>
        </div>

        <div className="vote-reference-frame" style={{
          position: 'relative',
          minHeight: 480,
          borderRadius: '34px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          background: question.image_url
            ? 'rgba(5,7,16,0.82)'
            : 'radial-gradient(circle at center, rgba(76,201,168,0.18), rgba(10,12,26,0.96) 62%)',
          marginBottom: 38,
          boxShadow: '0 20px 54px rgba(0,0,0,0.34)',
        }}>
          {question.image_url && (
            <QuestionMedia
              src={question.image_url}
              alt={question.text}
              variant="reference"
              controls
              style={{ minHeight: 480, height: '100%', padding: 0, boxSizing: 'border-box' }}
            />
          )}
          <div className="vote-reference-caption" style={{ position: 'absolute', left: 24, right: 24, bottom: 24, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CategoryBadge category={question.category} />
              <TypeBadge type={question.type} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 34 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 28,
            color: 'var(--text-muted)',
            fontSize: 18,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            <span style={{ color: '#ffa49d' }}>Disagree</span>
            <span style={{ color: 'var(--teal)' }}>Agree</span>
          </div>
          <input
            className="signal-slider-input"
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
          />
          <div style={{
            color: 'var(--text-muted)',
            fontSize: 22,
            letterSpacing: '0.22em',
            textAlign: 'center',
            marginTop: 24,
          }}>
            {value}/100
          </div>
        </div>

        <div style={{ marginBottom: 34 }}>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 18,
            letterSpacing: '0.16em',
            textAlign: 'center',
            textTransform: 'uppercase',
            marginBottom: 18,
          }}>
            Primary sentiment driver
          </p>
          <div className="signal-driver-grid">
            {['Experience', 'Evidence', 'Instinct', 'Pattern', 'Belief'].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setReason(reason === chip ? null : chip)}
                style={{
                  padding: '12px 10px',
                  borderRadius: 999,
                  border: `1px solid ${reason === chip ? 'var(--gold)' : 'rgba(201,168,76,0.16)'}`,
                  background: reason === chip ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.02)',
                  color: reason === chip ? 'var(--gold)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'var(--transition)',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <Button
            size="xl"
            variant={canVote ? 'primary' : 'secondary'}
            loading={submitting}
            onClick={handleReveal}
            style={canVote ? {
              background: 'linear-gradient(135deg, #f0cf67, #8b6d05)',
              color: '#05060F',
              border: 'none',
              borderRadius: 999,
              width: '100%',
              minHeight: 72,
              fontSize: 22,
              letterSpacing: '0.02em',
            } : {
              borderRadius: 999,
              width: '100%',
              minHeight: 72,
              fontSize: 18,
            }}
          >
            {!canVote ? 'Sign in to Cast My Pulse' : 'Cast My Pulse ->'}
          </Button>

          <a
            href="/feed"
            style={{
              display: 'grid',
              placeItems: 'center',
              minHeight: 58,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--gold)',
              textDecoration: 'none',
              fontSize: 18,
            }}
          >
            Back to Feed
          </a>

          <a
            href={`/results/${question.id}`}
            style={{
              color: 'var(--gold)',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: 18,
              padding: '14px 0',
            }}
          >
            See the Truth Gap -&gt;
          </a>

          <div style={{
            color: 'var(--text-muted)',
            fontSize: 13,
            letterSpacing: '0.18em',
            textAlign: 'center',
            textTransform: 'uppercase',
            marginTop: 20,
          }}>
            Your vote is anonymous - your identity is never linked to your response.
          </div>
        </div>

        {brief && (
          <div style={{ maxWidth: 980, margin: '36px auto 0' }}>
            <MoreInsightsCard brief={brief} question={question} />
          </div>
        )}
      </div>
    </>
  )
}

function CinematicChoiceVote({ question, options, tier, brief, canVote, submitting, onSubmit, onRequireAuth }) {
  const [selected, setSelected] = useState(null)
  const answerInsights = deriveAnswerInsights(question, brief)
  const optionDescriptions = Object.fromEntries(answerInsights.map((item) => [item.answer, item.insight]))

  function handleReveal() {
    if (!selected) return
    if (!canVote) {
      onRequireAuth()
      return
    }
    onSubmit({ choiceValue: selected })
  }

  return (
    <>
      <style>{`
        @media (max-width: 960px) {
          .choice-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .vote-reference-frame {
            min-height: 0 !important;
            aspect-ratio: auto !important;
            max-height: none !important;
          }
          .vote-reference-frame img,
          .vote-reference-frame video {
            height: auto !important;
            max-height: 74vh !important;
          }
          .vote-reference-caption {
            position: static !important;
            padding: 14px 16px 16px !important;
            background: rgba(5, 7, 16, 0.78) !important;
          }
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 34, maxWidth: 980, marginInline: 'auto' }}>
        <div style={{
          fontSize: 12,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: 'var(--teal)',
          fontWeight: 800,
          marginBottom: 14,
        }}>
          {getVoteLabel(question.type)}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-ui, inherit)',
          fontSize: 'clamp(34px, 4.2vw, 58px)',
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 18,
        }}>
          {question.text}
        </h1>
        <p style={{
          fontSize: 17,
          color: 'var(--text-muted)',
          lineHeight: 1.65,
          maxWidth: 820,
          margin: '0 auto',
        }}>
          {brief?.plainEnglish || 'Reflect on the signal. The choice defines the architecture of the void.'}
        </p>
      </div>

      <div className="choice-hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 0.9fr) minmax(0, 1.25fr)',
        gap: 34,
        alignItems: 'stretch',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          <div className="vote-reference-frame" style={{
            position: 'relative',
            minHeight: 520,
            borderRadius: '34px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: question.image_url
              ? 'rgba(5,7,16,0.82)'
              : 'radial-gradient(circle at center, rgba(76,201,168,0.18), rgba(10,12,26,0.96) 62%)',
          }}>
            {question.image_url && (
              <>
                <QuestionMedia
                  src={question.image_url}
                  alt={question.text}
                  variant="reference"
                  style={{ minHeight: 520, height: '100%', padding: 12, boxSizing: 'border-box' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(5,7,16,0.02), transparent 46%, rgba(5,7,16,0.42))',
                }} />
              </>
            )}
            <div className="vote-reference-caption" style={{ position: 'absolute', left: 24, right: 24, bottom: 24 }}>
              <div style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 10,
              }}>
                Prompt Reference
              </div>
              <div style={{ color: 'var(--teal)', fontSize: 14, fontWeight: 700 }}>
                Active Pulse Detected
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <CategoryBadge category={question.category} />
              <TypeBadge type={question.type || 'choice'} />
            </div>
            <p style={{
              fontFamily: 'var(--font-ui, inherit)',
              fontSize: 'clamp(26px, 3vw, 40px)',
              lineHeight: 1.14,
              letterSpacing: '-0.01em',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 12,
            }}>
              Define your signal.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, marginBottom: 0 }}>
              Choose the answer that best reflects your current stance. The reveal holds until you commit.
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(10,12,26,0.84)',
          border: '1px solid rgba(76,201,168,0.18)',
          borderRadius: '34px',
          padding: '26px 26px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          boxShadow: '0 18px 48px rgba(0,0,0,0.24)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              fontWeight: 800,
            }}>
              Binary choice
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.45 }}>
              {canVote ? 'One answer. No middle ground.' : 'Sign in to cast your pulse.'}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {options.map((option, index) => {
              const isSelected = selected === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : option)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: isSelected ? 'rgba(76,201,168,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'rgba(76,201,168,0.8)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 28,
                    padding: '22px 24px',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    boxShadow: isSelected ? '0 0 0 1px rgba(76,201,168,0.2), 0 12px 30px rgba(76,201,168,0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginBottom: 8,
                      }}>
                        Option {String.fromCharCode(65 + index)}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-ui, inherit)',
                        fontSize: 'clamp(26px, 2.4vw, 40px)',
                        lineHeight: 1.14,
                        letterSpacing: '-0.01em',
                        fontWeight: 700,
                        color: isSelected ? '#FFFFFF' : 'var(--text)',
                        marginBottom: 10,
                      }}>
                        {option}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.65, maxWidth: 520 }}>
                        {optionDescriptions[option] || `This answer represents the case for ${humanizeOptionLabel(option).toLowerCase()}.`}
                      </div>
                    </div>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--teal)' : 'rgba(255,255,255,0.12)'}`,
                      background: isSelected ? 'var(--teal)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#05060F',
                      fontWeight: 900,
                      flexShrink: 0,
                      marginTop: 10,
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginTop: 4 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                padding: 0,
              }}
            >
              Reset choice
            </button>

            <Button
              size="xl"
              variant={canVote && selected ? 'teal' : 'secondary'}
              loading={submitting}
              disabled={!selected}
              onClick={handleReveal}
              style={canVote && selected ? {
                background: 'linear-gradient(135deg, var(--teal), #2fa886)',
                color: '#05060F',
                border: 'none',
                borderRadius: 999,
                minWidth: 260,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              } : {
                borderRadius: 999,
                minWidth: 260,
              }}
            >
              {!canVote ? 'Sign in to Cast Your Pulse' : !selected ? 'Select an option to vote' : 'Reveal the Signal'}
            </Button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 22,
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: 13,
            paddingTop: 4,
          }}>
            <span>Anonymous vote</span>
            <span>•</span>
            <span>{tier === 'verified' ? 'Verified layer active' : 'Truth Layer available'}</span>
          </div>
        </div>
      </div>

      {brief && (
        <div style={{ maxWidth: 980, margin: '32px auto 0' }}>
          <MoreInsightsCard brief={brief} question={question} />
        </div>
      )}
    </>
  )
}

function CinematicStandardVote({ question, questionType, options, tier, brief, canVote, submitting, onSubmit, onRequireAuth }) {
  const answerInsights = deriveAnswerInsights(question, brief)

  return (
    <>
      <style>{`
        @media (max-width: 960px) {
          .standard-vote-grid {
            grid-template-columns: 1fr !important;
          }
          .vote-reference-frame {
            min-height: 0 !important;
            aspect-ratio: auto !important;
            max-height: none !important;
          }
          .vote-reference-frame img,
          .vote-reference-frame video {
            height: auto !important;
            max-height: 74vh !important;
          }
          .vote-reference-caption {
            position: static !important;
            padding: 14px 16px 16px !important;
            background: rgba(5, 7, 16, 0.78) !important;
          }
        }
      `}</style>

      <div className="standard-vote-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 0.92fr) minmax(0, 1.18fr)',
        gap: 32,
        alignItems: 'stretch',
        maxWidth: 1180,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="vote-reference-frame" style={{
            position: 'relative',
            minHeight: 520,
            borderRadius: '34px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: question.image_url
              ? 'rgba(5,7,16,0.82)'
              : 'radial-gradient(circle at center, rgba(201,168,76,0.16), rgba(10,12,26,0.96) 62%)',
          }}>
            {question.image_url && (
              <>
                <QuestionMedia
                  src={question.image_url}
                  alt={question.text}
                  variant="reference"
                  style={{ minHeight: 520, height: '100%', padding: 12, boxSizing: 'border-box' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(5,7,16,0.02), transparent 46%, rgba(5,7,16,0.42))',
                }} />
              </>
            )}
            <div className="vote-reference-caption" style={{ position: 'absolute', left: 24, right: 24, bottom: 24 }}>
              <div style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 10,
              }}>
                Prompt Reference
              </div>
              <div style={{ color: questionType === 'ranked' ? '#9B6FD8' : 'var(--gold)', fontSize: 14, fontWeight: 700 }}>
                {questionType === 'ranked' ? 'Priority sequence active' : 'Live signal detected'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <CategoryBadge category={question.category} />
              <TypeBadge type={questionType} />
            </div>
            <p style={{
              fontFamily: 'var(--font-ui, inherit)',
              fontSize: 'clamp(26px, 3vw, 40px)',
              lineHeight: 1.14,
              letterSpacing: '-0.01em',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 12,
            }}>
              {questionType === 'ranked' ? 'Define your order.' : 'Define your stance.'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, marginBottom: 0 }}>
              {brief?.plainEnglish || (questionType === 'ranked'
                ? 'Arrange the options to reflect what matters most to you right now.'
                : 'Place yourself on the signal and reveal the direction you trust most.')}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(10,12,26,0.84)',
          border: `1px solid ${questionType === 'ranked' ? 'rgba(155,111,216,0.18)' : 'rgba(201,168,76,0.18)'}`,
          borderRadius: '34px',
          padding: '26px 26px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 18px 48px rgba(0,0,0,0.24)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              fontSize: 12,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: questionType === 'ranked' ? '#9B6FD8' : 'var(--gold)',
              fontWeight: 800,
            }}>
              {getVoteLabel(questionType)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.45 }}>
              {canVote ? 'Anonymous signal. Real-time truth gap.' : 'Sign in to cast your pulse.'}
            </div>
          </div>

          <div>
            <h1 style={{
              fontFamily: 'var(--font-ui, inherit)',
              fontSize: 'clamp(28px, 3.4vw, 44px)',
              lineHeight: 1.16,
              letterSpacing: '-0.01em',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 14,
            }}>
              {questionType === 'statement' ? `"${question.text}"` : question.text}
            </h1>
            {answerInsights.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
                {questionType === 'ranked'
                  ? 'The image holds the atmosphere. The sequence on the right defines the signal.'
                  : answerInsights[0]?.insight || 'The image and the answer belong to the same signal experience.'}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 2 }}>
            <TierBanner
              tier={tier}
              onAction={() => tier === 'guest' ? onRequireAuth() : navigate('/verify')}
            />
          </div>

          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginBottom: 0,
            lineHeight: 1.45,
          }}>
            ◈ Your vote is anonymous — your identity is never linked to your response.
          </p>

          {questionType === 'statement' && (
            <StatementVote onSubmit={onSubmit} submitting={submitting} canVote={canVote} />
          )}
          {questionType === 'ranked' && (
            <RankedVote options={options} onSubmit={onSubmit} submitting={submitting} canVote={canVote} />
          )}
        </div>
      </div>

      {brief && (
        <div style={{ maxWidth: 980, margin: '32px auto 0' }}>
          <MoreInsightsCard brief={brief} question={question} />
        </div>
      )}
    </>
  )
}

function MoreInsightsCard({ brief, question }) {
  const [expanded, setExpanded] = useState(false)
  const plainEnglish = derivePlainEnglish(question, brief)
  const answerInsights = deriveAnswerInsights(question, brief)

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
          {plainEnglish && (
            <div>
              <div style={sectionLabelStyle}>In plain English</div>
              <p style={sectionBodyStyle}>{plainEnglish}</p>
            </div>
          )}

          {brief.background && (
            <div>
              <div style={sectionLabelStyle}>Why this matters</div>
              <p style={sectionBodyStyle}>{brief.background}</p>
            </div>
          )}

          {answerInsights.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>About the answers</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {answerInsights.map((item) => (
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
