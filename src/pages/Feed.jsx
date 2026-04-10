import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { fetchQuestions, fetchVotesForQuestion, calcResults } from '../lib/votes'
import { useAuth } from '../lib/auth'

const CATEGORIES = ['All', 'Consumer', 'Health', 'Spirituality', 'Politics', 'Technology']

const CATEGORY_COLORS = {
  Consumer: '#C9A84C',
  Health: '#4CC9A8',
  Spirituality: '#9B6FD8',
  Politics: '#C94C4C',
  Technology: '#4C8EC9',
}

export default function Feed() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [questions, setQuestions] = useState([])
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const { tier } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadQuestions()
  }, [activeCategory])

  async function loadQuestions() {
    setLoading(true)
    try {
      const data = await fetchQuestions(activeCategory)
      setQuestions(data)
      // Load vote counts for each question
      const counts = {}
      await Promise.all(
        data.map(async (q) => {
          const votes = await fetchVotesForQuestion(q.id)
          const all = calcResults(votes)
          const verified = calcResults(votes.filter(v => v.is_verified))
          counts[q.id] = { all, verified, votes }
        })
      )
      setVoteCounts(counts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: 6,
          }}>
            Public Questions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Cast your vote. See where verified truth diverges from popular opinion.
          </p>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: `1px solid ${activeCategory === cat
                  ? (cat === 'All' ? 'var(--gold)' : (CATEGORY_COLORS[cat] || 'var(--gold)'))
                  : 'rgba(201,168,76,0.15)'}`,
                background: activeCategory === cat
                  ? `rgba(${cat === 'All' ? '201,168,76' : hexToRgb(CATEGORY_COLORS[cat] || '#C9A84C')},0.12)`
                  : 'transparent',
                color: activeCategory === cat
                  ? (cat === 'All' ? 'var(--gold)' : (CATEGORY_COLORS[cat] || 'var(--gold)'))
                  : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Question cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <LoadingPulse />
          </div>
        ) : questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            No questions found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                counts={voteCounts[q.id]}
                tier={tier}
                onClick={() => navigate(`/vote/${q.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question, counts, tier, onClick }) {
  const [hovered, setHovered] = useState(false)
  const catColor = CATEGORY_COLORS[question.category] || 'var(--gold)'
  const all = counts?.all || { Disagree: 0, Neutral: 0, Agree: 0, total: 0 }
  const verified = counts?.verified || { Disagree: 0, Neutral: 0, Agree: 0, total: 0 }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: 'rgba(10,12,26,0.8)',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 14,
        padding: '24px 28px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 32px rgba(201,168,76,0.08)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          {/* Category badge */}
          <span style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: catColor,
            fontWeight: 600,
            marginBottom: 10,
            display: 'block',
          }}>
            {question.category}
          </span>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            lineHeight: 1.4,
            color: 'var(--text)',
            fontStyle: 'italic',
          }}>
            "{question.text}"
          </p>
        </div>

        {/* Vote counts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{all.total}</span> responses
          </div>
          {verified.total > 0 && (
            <div style={{ fontSize: 12, color: 'var(--teal)' }}>
              <span style={{ fontWeight: 600 }}>{verified.total}</span> verified
            </div>
          )}
        </div>
      </div>

      {/* Ratio bar */}
      {all.total > 0 && (
        <div>
          <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${all.Disagree}%`, background: '#C94C4C', transition: 'width 0.4s ease' }} />
            <div style={{ width: `${all.Neutral}%`, background: 'var(--gold)', transition: 'width 0.4s ease' }} />
            <div style={{ width: `${all.Agree}%`, background: 'var(--teal)', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            <span><span style={{ color: '#C94C4C', fontWeight: 600 }}>{all.Disagree}%</span> Disagree</span>
            <span><span style={{ color: 'var(--gold)', fontWeight: 600 }}>{all.Neutral}%</span> Neutral</span>
            <span><span style={{ color: 'var(--teal)', fontWeight: 600 }}>{all.Agree}%</span> Agree</span>
          </div>
        </div>
      )}

      {all.total === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Be the first to vote →
        </div>
      )}
    </div>
  )
}

function LoadingPulse() {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--gold)',
          animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
