import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AuthModal from '../components/AuthModal'
import QuestionMedia from '../components/QuestionMedia'
import { PageLoading, CategoryBadge, TypeBadge, Button } from '../components/ui'
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

const SIGNAL_DRIVER_OPTIONS = ['Experience', 'Evidence', 'Instinct', 'Pattern', 'Belief']

const QUESTION_DETAIL_STYLES = `
  .question-detail-shell {
    max-width: 1260px;
    margin: 0 auto;
    display: grid;
    gap: 24px;
  }

  .question-main-grid {
    display: grid;
    grid-template-columns: minmax(320px, 0.78fr) minmax(0, 1.06fr);
    gap: 24px;
    align-items: start;
  }

  .question-preview-stage {
    position: relative;
    min-height: 320px;
    height: clamp(300px, 42vh, 460px);
    border-radius: 30px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(13, 18, 33, 0.86), rgba(8, 10, 18, 0.96));
    box-shadow: 0 24px 60px rgba(0,0,0,0.34);
  }

  .question-preview-glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(0,0,0,0.02), transparent 42%, rgba(4,6,12,0.72));
  }

  .question-header {
    text-align: left;
    display: grid;
    gap: 12px;
    max-width: 960px;
  }

  .question-eyebrow {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    font-weight: 800;
  }

  .question-heading {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(34px, 4.2vw, 56px);
    line-height: 1.03;
    letter-spacing: -0.03em;
    color: var(--text);
  }

  .question-heading em {
    font-style: italic;
    font-weight: 500;
  }

  .question-subcopy {
    max-width: 760px;
    margin: 0;
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1.64;
  }

  .question-meta-strip {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .question-panel {
    background: rgba(16, 22, 34, 0.88);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 26px;
    box-shadow: 0 18px 48px rgba(0,0,0,0.24);
  }

  .question-footnote {
    display: flex;
    justify-content: center;
    gap: 18px;
    flex-wrap: wrap;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .question-link-row {
    display: flex;
    justify-content: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .question-inline-link {
    color: var(--gold);
    text-decoration: none;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .question-inline-link:hover {
    opacity: 0.86;
  }

  .question-option-grid,
  .question-stack {
    display: grid;
    gap: 12px;
  }

  .question-option-card {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 22px;
    text-align: left;
    padding: 20px 20px 18px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    color: inherit;
    cursor: pointer;
    transition: var(--transition);
  }

  .question-option-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.14);
  }

  .question-option-card.is-selected {
    background: rgba(255,255,255,0.05);
    box-shadow: inset 0 0 0 1px currentColor;
  }

  .question-option-letter {
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .question-option-title {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: clamp(24px, 2.4vw, 34px);
    line-height: 1.04;
    color: var(--text);
  }

  .question-option-description {
    margin: 0;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.56;
    max-width: 620px;
  }

  .question-option-mark {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.14);
    flex-shrink: 0;
    margin-top: 8px;
    transition: var(--transition);
  }

  .question-cta-wrap {
    display: grid;
    gap: 14px;
    justify-items: center;
    margin-top: 4px;
  }

  .question-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 12px;
    border-radius: 999px;
    outline: none;
    cursor: pointer;
    background: linear-gradient(90deg, #ff9f95 0%, #d6b34d 50%, #5fdfbd 100%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  }

  .question-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--gold);
    border: 6px solid rgba(201,168,76,0.18);
    box-shadow: 0 10px 26px rgba(0,0,0,0.36), 0 0 0 1px rgba(201,168,76,0.42);
  }

  .question-slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--gold);
    border: 6px solid rgba(201,168,76,0.18);
    box-shadow: 0 10px 26px rgba(0,0,0,0.36), 0 0 0 1px rgba(201,168,76,0.42);
  }

  .question-driver-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .question-driver-chip {
    min-height: 44px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: var(--transition);
  }

  .question-driver-chip.is-selected {
    background: rgba(201,168,76,0.12);
    border-color: rgba(201,168,76,0.42);
    color: var(--gold);
  }

  .question-panel-compact {
    padding: 22px 22px 24px;
  }

  .question-side-card {
    display: grid;
    gap: 16px;
  }

  @media (max-width: 960px) {
    .question-detail-shell {
      gap: 28px;
    }

    .question-main-grid {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .question-header {
      text-align: center;
      max-width: none;
    }

    .question-heading {
      font-size: clamp(34px, 10vw, 52px);
    }

    .question-subcopy {
      font-size: 16px;
      margin: 0 auto;
    }

    .question-meta-strip {
      justify-content: center;
    }

    .question-preview-stage {
      height: auto;
      min-height: 260px;
    }

    .question-option-card {
      padding: 20px 18px;
      gap: 14px;
    }

    .question-driver-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
`

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
  if (type === 'choice' || type === 'ranked') {
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

function getDetailTone(type) {
  if (type === 'choice') return 'var(--teal)'
  if (type === 'ranked') return '#9B6FD8'
  return 'var(--gold)'
}

function getPreviewLabel(type) {
  if (type === 'choice') return 'Active Signal'
  if (type === 'ranked') return 'Priority Layer'
  return 'Truth Layer'
}

function getQuestionPrompt(type, brief) {
  if (brief?.plainEnglish) return brief.plainEnglish
  if (type === 'choice') return 'Choose the answer that best reflects your current stance, then reveal the live signal.'
  if (type === 'ranked') return 'Order the options from strongest to weakest pull, then submit the sequence that feels true.'
  return 'Move the signal between disagreement and agreement, then cast your anonymous Pulse.'
}

function getStatusMeta(type, tier) {
  return [
    'Anonymous vote',
    tier === 'verified' ? 'Pulse verified' : 'Verification optional',
    type === 'ranked' ? 'Order defines outcome' : type === 'choice' ? 'One answer only' : 'Truth gap updates live',
  ]
}

function getSignalBucketLabel(value) {
  if (value <= 20) return 'Strong disagree'
  if (value <= 40) return 'Lean disagree'
  if (value < 60) return 'Balanced'
  if (value < 80) return 'Lean agree'
  return 'Strong agree'
}

function getSignalPositionTone(value) {
  if (value <= 40) return '#ff9f95'
  if (value < 60) return 'var(--gold)'
  return 'var(--teal)'
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
        setError('Question not found.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user])

  async function handleSubmit(voteData) {
    if (tier === 'guest' || !user) {
      setShowAuth(true)
      return
    }
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

  if (loading) {
    return (
      <>
        <NavBar />
        <PageLoading />
      </>
    )
  }

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
      <style>{QUESTION_DETAIL_STYLES}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 20px 96px' }}>
        <button
          type="button"
          onClick={() => navigate('/feed')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: 26,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Back to feed
        </button>

        {error && (
          <div
            style={{
              background: 'var(--red-dim)',
              border: '1px solid var(--red-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              marginBottom: 20,
              fontSize: 13,
              color: 'var(--red)',
            }}
          >
            {error}
          </div>
        )}

        {alreadyVoted ? (
          <AlreadyVotedPanel id={id} navigate={navigate} />
        ) : (
          <>
            {questionType === 'choice' ? (
              <ChoiceQuestionVote
                question={question}
                brief={brief}
                options={options}
                tier={tier}
                canVote={canVote}
                submitting={submitting}
                onSubmit={handleSubmit}
                onRequireAuth={() => setShowAuth(true)}
              />
            ) : questionType === 'statement' ? (
              <SignalQuestionVote
                question={question}
                brief={brief}
                tier={tier}
                canVote={canVote}
                submitting={submitting}
                onSubmit={handleSubmit}
                onRequireAuth={() => setShowAuth(true)}
              />
            ) : (
              <RankedQuestionVote
                question={question}
                brief={brief}
                options={options}
                tier={tier}
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

function AlreadyVotedPanel({ id, navigate }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '48px auto 0',
        textAlign: 'center',
        background: 'rgba(12, 18, 30, 0.84)',
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: 28,
        padding: '56px 28px',
        boxShadow: '0 24px 56px rgba(0,0,0,0.28)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontWeight: 800,
          marginBottom: 18,
        }}
      >
        Signal Captured
      </div>
      <h1
        style={{
          margin: '0 0 12px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(34px, 5vw, 48px)',
          lineHeight: 1.08,
          color: 'var(--text)',
        }}
      >
        You&apos;ve already voted on this question.
      </h1>
      <p style={{ margin: '0 auto 28px', maxWidth: 520, color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7 }}>
        Your anonymous response is already sitting in the truth layer. You can jump straight to the live result view at any time.
      </p>
      <Button
        size="xl"
        onClick={() => navigate(`/results/${id}`)}
        style={{
          borderRadius: 999,
          minWidth: 260,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        See the truth gap
      </Button>
    </div>
  )
}

function QuestionShell({ question, brief, tier, children }) {
  const questionType = question.type || 'statement'
  const tone = getDetailTone(questionType)
  const intro = getQuestionPrompt(questionType, brief)

  return (
    <div className="question-detail-shell">
      <div className="question-header">
        <div className="question-eyebrow" style={{ color: tone }}>
          {getVoteLabel(questionType)}
        </div>
        <h1 className="question-heading">
          {questionType === 'statement' ? <em>{question.text}</em> : question.text}
        </h1>
        <p className="question-subcopy">{intro}</p>
        <div className="question-meta-strip">
          <CategoryBadge category={question.category} />
          <TypeBadge type={questionType} />
        </div>
      </div>

      <div className="question-main-grid">
        <QuestionPreview question={question} tone={tone} tier={tier} />
        <div className="question-side-card">
          {children}
        </div>
      </div>

      {brief && <MoreInsightsCard brief={brief} question={question} />}
    </div>
  )
}

function QuestionPreview({ question, tone, tier }) {
  const questionType = question.type || 'statement'

  return (
    <div className="question-preview-stage">
      {question.image_url ? (
        <QuestionMedia
          src={question.image_url}
          alt={question.text}
          variant="reference"
          style={{ height: '100%', minHeight: 260, padding: 0, boxSizing: 'border-box' }}
        />
      ) : (
        <div
          style={{
            minHeight: 260,
            background: `radial-gradient(circle at top, ${tone}22, rgba(7, 9, 16, 0.96) 62%)`,
          }}
        />
      )}

      <div className="question-preview-glow" />

      <div
        style={{
          position: 'absolute',
          left: 22,
          right: 22,
          bottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={previewChipStyle(tone)}>{getPreviewLabel(questionType)}</span>
          <span style={previewChipStyle('var(--teal)')}>{tier === 'verified' ? 'Verified layer' : 'Anonymous pulse'}</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Curated question view
        </div>
      </div>
    </div>
  )
}

function ChoiceQuestionVote({ question, brief, options, tier, canVote, submitting, onSubmit, onRequireAuth }) {
  const [selected, setSelected] = useState(null)
  const answerInsights = deriveAnswerInsights(question, brief)
  const optionDescriptions = Object.fromEntries(answerInsights.map((item) => [item.answer, item.insight]))

  function handleSubmitChoice() {
    if (!canVote) {
      onRequireAuth()
      return
    }
    if (!selected) return
    onSubmit({ choiceValue: selected })
  }

  return (
    <QuestionShell question={question} brief={brief} tier={tier}>
      <div className="question-panel question-panel-compact">
        <div className="question-option-grid">
          {options.map((option, index) => {
            const isSelected = selected === option

            return (
              <button
                key={option}
                type="button"
                className={`question-option-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => setSelected(isSelected ? null : option)}
                style={{ color: isSelected ? 'var(--teal)' : 'inherit' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="question-option-letter">Option {String.fromCharCode(65 + index)}</div>
                  <h2 className="question-option-title">{option}</h2>
                  <p className="question-option-description">
                    {optionDescriptions[option] || `This option represents the case for ${humanizeOptionLabel(option).toLowerCase()}.`}
                  </p>
                </div>
                <div
                  className="question-option-mark"
                  style={{
                    borderColor: isSelected ? 'var(--teal)' : 'rgba(255,255,255,0.14)',
                    background: isSelected ? 'rgba(76,201,168,0.16)' : 'transparent',
                    boxShadow: isSelected ? 'inset 0 0 0 7px var(--teal)' : 'none',
                  }}
                />
              </button>
            )
          })}
        </div>

        <div className="question-cta-wrap">
          <Button
            size="xl"
            loading={submitting}
            disabled={canVote && !selected}
            onClick={handleSubmitChoice}
            variant={canVote && selected ? 'primary' : 'secondary'}
            style={canVote && selected ? {
              background: 'linear-gradient(135deg, #f2cf5a, #b68e18)',
              borderRadius: 999,
              minWidth: 320,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            } : {
              borderRadius: 999,
              minWidth: 320,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {!canVote ? 'Sign in to vote' : !selected ? 'Select an option to vote' : 'Cast this vote'}
          </Button>

          <div className="question-footnote">
            {getStatusMeta(question.type, tier).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="question-link-row">
            <button type="button" onClick={() => setSelected(null)} style={ghostButtonStyle}>
              Reset choice
            </button>
            <a className="question-inline-link" href={`/results/${question.id}`}>See current results</a>
          </div>
        </div>
      </div>
    </QuestionShell>
  )
}

function SignalQuestionVote({ question, brief, tier, canVote, submitting, onSubmit, onRequireAuth }) {
  const [value, setValue] = useState(50)
  const [reason, setReason] = useState(null)
  const signalLabel = getSignalBucketLabel(value)
  const signalTone = getSignalPositionTone(value)

  function handleSubmitSignal() {
    if (!canVote) {
      onRequireAuth()
      return
    }
    onSubmit({ spectrumValue: value, reason })
  }

  return (
    <QuestionShell question={question} brief={brief} tier={tier}>
      <div className="question-panel question-panel-compact">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 10,
            }}
          >
            Position on the signal
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 42px)', color: signalTone, marginBottom: 6 }}>
            {signalLabel}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {value} / 100
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: '#ff9f95' }}>Disagree</span>
            <span style={{ color: 'var(--gold)' }}>Mixed</span>
            <span style={{ color: 'var(--teal)' }}>Agree</span>
          </div>
          <input
            className="question-slider"
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
          />
        </div>

        <div style={{ marginBottom: 26 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginBottom: 14,
            }}
          >
            Primary sentiment driver
          </div>
          <div className="question-driver-grid">
            {SIGNAL_DRIVER_OPTIONS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`question-driver-chip${reason === chip ? ' is-selected' : ''}`}
                onClick={() => setReason(reason === chip ? null : chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="question-cta-wrap">
          <Button
            size="xl"
            loading={submitting}
            onClick={handleSubmitSignal}
            style={{
              borderRadius: 999,
              minWidth: 320,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {!canVote ? 'Sign in to vote' : 'Cast my pulse'}
          </Button>

          <div className="question-footnote">
            {getStatusMeta(question.type, tier).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="question-link-row">
            <a className="question-inline-link" href={`/results/${question.id}`}>See current results</a>
          </div>
        </div>
      </div>
    </QuestionShell>
  )
}

function RankedQuestionVote({ question, brief, options, tier, canVote, submitting, onSubmit, onRequireAuth }) {
  function handleSubmitRanked(voteData) {
    if (!canVote) {
      onRequireAuth()
      return
    }
    onSubmit(voteData)
  }

  return (
    <QuestionShell question={question} brief={brief} tier={tier}>
      <div className="question-stack">
        <div className="question-panel question-panel-compact">
          <RankedVote options={options} onSubmit={handleSubmitRanked} submitting={submitting} canVote={canVote} />

          <div className="question-cta-wrap" style={{ marginTop: 16 }}>
            <div className="question-footnote">
              {getStatusMeta(question.type, tier).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="question-link-row">
              <a className="question-inline-link" href={`/results/${question.id}`}>See current results</a>
            </div>
          </div>
        </div>
      </div>
    </QuestionShell>
  )
}

function MoreInsightsCard({ brief, question }) {
  const [expanded, setExpanded] = useState(false)
  const plainEnglish = derivePlainEnglish(question, brief)
  const answerInsights = deriveAnswerInsights(question, brief)

  return (
    <div
      className="question-panel"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderColor: 'rgba(76,201,168,0.16)',
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
          padding: '22px 24px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            More Insights
          </div>
          <div style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 22 }}>
            {brief.title || 'High-level context for this question'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Click for more context before you vote.
          </div>
        </div>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text)',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {expanded ? '-' : '⌄'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 24px 24px', display: 'grid', gap: 20 }}>
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
                    {item.insight ? <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.insight}</div> : null}
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
                    {item.definition ? <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.definition}</div> : null}
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

function previewChipStyle(color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color,
    border: `1px solid ${color}44`,
    background: `${color}16`,
    backdropFilter: 'blur(14px)',
  }
}

const ghostButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  padding: 0,
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
  lineHeight: 1.7,
  margin: 0,
}

const glossaryRowStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
}
