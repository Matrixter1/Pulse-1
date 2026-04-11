import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AuthModal from '../components/AuthModal'
import { TierBanner, PageLoading, CategoryBadge, TypeBadge } from '../components/ui'
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

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 20px 80px' }}>
        <button onClick={() => navigate('/feed')} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 13, marginBottom: 32,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back to statements
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
            <img
              src={question.image_url}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 320,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Tier banner */}
        <div style={{ marginBottom: 24 }}>
          <TierBanner
            tier={tier}
            onAction={() => tier === 'guest' ? setShowAuth(true) : navigate('/verify')}
          />
        </div>

        {/* Already voted notice */}
        {alreadyVoted && (
          <div style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 24,
            fontSize: 13, color: 'var(--gold)',
          }}>
            You've already voted.{' '}
            <button
              onClick={() => navigate(`/results/${id}`)}
              style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, fontSize: 13, textDecoration: 'underline' }}
            >
              See results →
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
