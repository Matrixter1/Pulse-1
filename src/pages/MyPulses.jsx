import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { PageLoading, EmptyState, CategoryBadge, TypeBadge } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getOptimizedFeedMediaUrl } from '../lib/mediaUrls'

function formatWhen(dateString) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getArchiveMediaUrl(question) {
  return getOptimizedFeedMediaUrl(question)
}

export default function MyPulses() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data: votes, error: voteError } = await supabase
          .from('votes')
          .select('question_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (voteError) throw voteError

        const latestByQuestion = new Map()
        ;(votes || []).forEach((vote) => {
          if (!latestByQuestion.has(vote.question_id)) {
            latestByQuestion.set(vote.question_id, vote.created_at)
          }
        })

        const questionIds = Array.from(latestByQuestion.keys())
        if (questionIds.length === 0) {
          setItems([])
          return
        }

        const { data: questions, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds)

        if (questionError) throw questionError

        const mapped = questionIds
          .map((id) => {
            const question = (questions || []).find((item) => item.id === id)
            if (!question) return null
            return {
              ...question,
              lastVotedAt: latestByQuestion.get(id),
            }
          })
          .filter(Boolean)

        setItems(mapped)
      } catch (error) {
        console.error(error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="page">
        <NavBar />
        <PageLoading />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page">
        <NavBar />
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '80px 20px 96px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Your space
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 56px)', color: 'var(--text)', marginBottom: 16 }}>
            My Pulses
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 28px' }}>
            Sign in to see the questions you have already opened, answered, or shaped.
          </p>
          <Link
            to="/splash"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 22px',
              borderRadius: 999,
              border: '1px solid var(--gold-border)',
              color: 'var(--gold)',
              textDecoration: 'none',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <NavBar />
      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '40px 20px 96px' }}>
        <div style={{ marginBottom: 30, maxWidth: 760 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Your activity
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 5vw, 58px)', color: 'var(--text)', marginBottom: 14 }}>
            My Pulses
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, lineHeight: 1.7, maxWidth: 640 }}>
            A clean history of the signals, decisions, and rankings you have already shaped.
          </p>
        </div>

        {items.length === 0 ? (
          <EmptyState message="You have not answered any questions yet." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 26 }}>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/results/${item.id}`)}
                style={{
                  background: 'rgba(10,12,26,0.82)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 22,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <CategoryBadge category={item.category} />
                  <TypeBadge type={item.type || 'statement'} />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
                    {formatWhen(item.lastVotedAt)}
                  </span>
                </div>

                {getArchiveMediaUrl(item) ? (
                  <div style={{
                    height: 188,
                    borderRadius: 20,
                    background: `linear-gradient(180deg, rgba(5,7,16,0.06), rgba(5,7,16,0.26)), url(${getArchiveMediaUrl(item)}) center/cover`,
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: 18,
                  }} />
                ) : null}

                <div style={{ fontFamily: 'var(--font-ui, inherit)', fontSize: 28, lineHeight: 1.2, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
                  {(item.type || 'statement') === 'statement' ? `"${item.text}"` : item.text}
                </div>

                <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                  Open the result and compare your signal with the wider layer.
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
