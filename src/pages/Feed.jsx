import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { CategoryBadge, TypeBadge, PageLoading, EmptyState } from '../components/ui'
import { fetchQuestions, fetchVotesForQuestion, calcResults, calcChoiceResults, calcRankedResults } from '../lib/data'
import { CATEGORIES, CATEGORY_COLORS } from '../constants'

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

export default function Feed() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [questions, setQuestions] = useState([])
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadQuestions() }, [activeCategory])

  async function loadQuestions() {
    setLoading(true)
    try {
      const data = await fetchQuestions(activeCategory)
      setQuestions(data)
      const counts = {}
      await Promise.all(data.map(async q => {
        const votes = await fetchVotesForQuestion(q.id)
        const type = q.type || 'statement'
        const options = parseOptions(q.options)
        let all, verified
        if (type === 'statement') {
          all = calcResults(votes)
          verified = calcResults(votes.filter(v => v.is_verified))
        } else if (type === 'choice') {
          all = calcChoiceResults(votes, options)
          verified = calcChoiceResults(votes.filter(v => v.is_verified), options)
        } else {
          all = calcRankedResults(votes, options)
          verified = calcRankedResults(votes.filter(v => v.is_verified), options)
        }
        counts[q.id] = { all, verified, type }
      }))
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
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Public Statements
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Cast your vote. See where verified truth diverges from popular opinion.
          </p>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat
            const catColor = cat === 'All' ? 'var(--gold)' : (CATEGORY_COLORS[cat] || 'var(--gold)')
            const rgb = cat === 'All' ? '201,168,76' : hexToRgb(CATEGORY_COLORS[cat] || '#C9A84C')
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '6px 16px', borderRadius: 20,
                border: `1px solid ${isActive ? catColor : 'rgba(201,168,76,0.15)'}`,
                background: isActive ? `rgba(${rgb},0.12)` : 'transparent',
                color: isActive ? catColor : 'var(--text-muted)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'var(--transition)',
              }}>
                {cat}
              </button>
            )
          })}
        </div>

        {loading
          ? <PageLoading />
          : questions.length === 0
            ? <EmptyState message="No statements found." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {questions.map(q => (
                  <StatementCard
                    key={q.id}
                    question={q}
                    counts={voteCounts[q.id]}
                    onClick={() => navigate(`/vote/${q.id}`)}
                  />
                ))}
              </div>
            )
        }
      </div>
    </div>
  )
}

function StatementCard({ question, counts, onClick }) {
  const [hovered, setHovered] = useState(false)
  const type = question.type || 'statement'
  const total = counts?.all?.total || 0
  const verCount = counts?.verified?.total || 0

  function getSummary() {
    if (!counts || total === 0) return null
    if (type === 'statement') {
      const { Disagree, Neutral, Agree } = counts.all
      return (
        <>
          <div style={{ display: 'flex', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ width: `${Disagree}%`, background: '#C94C4C' }} />
            <div style={{ width: `${Neutral}%`,  background: 'var(--gold)' }} />
            <div style={{ width: `${Agree}%`,    background: 'var(--teal)' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
            <span><span style={{ color: '#C94C4C',      fontWeight: 600 }}>{Disagree}%</span> Disagree</span>
            <span><span style={{ color: 'var(--gold)',  fontWeight: 600 }}>{Neutral}%</span> Neutral</span>
            <span><span style={{ color: 'var(--teal)',  fontWeight: 600 }}>{Agree}%</span> Agree</span>
          </div>
        </>
      )
    }
    if (type === 'choice') {
      const w = counts.all?.winner
      return w ? <div style={{ fontSize: 12, color: 'var(--teal)' }}>Leading: <strong>{w}</strong></div> : null
    }
    if (type === 'ranked') {
      const t = counts.all?.options?.[0]?.label
      return t ? <div style={{ fontSize: 12, color: '#9B6FD8' }}>Top ranked: <strong>{t}</strong></div> : null
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: 'rgba(10,12,26,0.8)',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 'var(--radius-lg)', padding: '22px 26px',
        cursor: 'pointer', transition: 'all var(--transition)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 32px rgba(201,168,76,0.07)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <CategoryBadge category={question.category} />
            <TypeBadge type={type} />
          </div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.4,
            color: 'var(--text)', fontStyle: type === 'statement' ? 'italic' : 'normal',
          }}>
            {type === 'statement' ? `"${question.text}"` : question.text}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{total}</span> {total === 1 ? 'vote' : 'votes'}
          </div>
          {verCount > 0 && (
            <div style={{ fontSize: 12, color: 'var(--teal)' }}>
              <span style={{ fontWeight: 600 }}>{verCount}</span> verified
            </div>
          )}
        </div>
      </div>
      {question.image_url && (
        <div style={{
          marginTop: 14,
          marginBottom: 14,
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          maxHeight: 180,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <img
            src={question.image_url}
            alt=""
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}
      {total > 0
        ? getSummary()
        : <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>Be the first to vote →</div>
      }
    </div>
  )
}
