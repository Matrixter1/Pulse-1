import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { CategoryBadge, TypeBadge, PageLoading, EmptyState } from '../components/ui'
import { fetchQuestions, fetchVotesForQuestion, calcResults, calcChoiceResults, calcRankedResults } from '../lib/data'
import { supabase } from '../lib/supabase'
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
  const [featuredQuestion, setFeaturedQuestion] = useState(null)
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadQuestions() }, [activeCategory])

  async function loadQuestions() {
    setLoading(true)

    // Fetch featured question independently so any failure never blocks the main feed
    let featuredData = null
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('featured', true)
        .maybeSingle()
      if (!error) featuredData = data || null
      console.log('[Pulse] featured question:', featuredData)
    } catch (_) { /* featured column may not exist yet */ }
    setFeaturedQuestion(featuredData)

    // Fetch main questions list + vote counts
    try {
      const data = await fetchQuestions(activeCategory)
      setQuestions(data)

      // Include featured question in vote fetch if category filter excludes it
      const toFetch = [...data]
      if (featuredData && !data.find(q => q.id === featuredData.id)) {
        toFetch.push(featuredData)
      }

      const counts = {}
      await Promise.all(toFetch.map(async q => {
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
            Statements
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Vote. Rank. Choose. See where verified truth diverges.
          </p>
        </div>

        {/* Featured / Pulse of the Day */}
        {featuredQuestion && (
          <div
            onClick={() => navigate(`/vote/${featuredQuestion.id}`)}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(10,12,26,0.95))',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 36px',
              marginBottom: 36,
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--gold)',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'var(--gold)', fontWeight: 700,
              }}>
                Pulse of the Day
              </span>
              <CategoryBadge category={featuredQuestion.category} />
              <TypeBadge type={featuredQuestion.type || 'statement'} />
            </div>

            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 3vw, 30px)',
              fontStyle: (featuredQuestion.type || 'statement') === 'statement' ? 'italic' : 'normal',
              fontWeight: 600, color: '#FFFFFF', lineHeight: 1.35, marginBottom: 20,
            }}>
              {(featuredQuestion.type || 'statement') === 'statement'
                ? `"${featuredQuestion.text}"`
                : featuredQuestion.text}
            </p>

            {featuredQuestion.image_url && (
              <div style={{
                borderRadius: 'var(--radius)', overflow: 'hidden',
                maxHeight: 200, marginBottom: 20,
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                <img
                  src={featuredQuestion.image_url} alt=""
                  style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {voteCounts[featuredQuestion.id]?.all?.total || 0} votes cast
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.05em' }}>
                Cast your vote →
              </span>
            </div>

            {/* Background glow */}
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

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
            ? <EmptyState message="Nothing here yet." />
            : (() => {
                const statements = questions.filter(q => (q.type || 'statement') === 'statement' && !q.featured)
                const choices    = questions.filter(q => q.type === 'choice' && !q.featured)
                const ranked     = questions.filter(q => q.type === 'ranked' && !q.featured)
                const sections = [
                  { key: 'statement', icon: '◈', color: 'var(--gold)',  title: 'Statements', items: statements },
                  { key: 'choice',    icon: '◉', color: 'var(--teal)',  title: 'Choices',    items: choices    },
                  { key: 'ranked',    icon: '◆', color: '#9B6FD8',      title: 'Rankings',   items: ranked     },
                ]
                return sections
                  .filter(s => s.items.length > 0)
                  .map(s => (
                    <div key={s.key} style={{ marginBottom: 48 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        marginBottom: 20, paddingBottom: 16,
                        borderBottom: '1px solid rgba(201,168,76,0.12)',
                      }}>
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <h2 style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 24, fontWeight: 600, color: s.color,
                        }}>
                          {s.title}
                        </h2>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                          {s.items.length} {s.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {s.items.map(q => (
                          <StatementCard
                            key={q.id}
                            question={q}
                            counts={voteCounts[q.id]}
                            onClick={() => navigate(`/vote/${q.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
              })()
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
        borderRadius: 'var(--radius-lg)', padding: '24px 28px',
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
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 2.5vw, 24px)',
            lineHeight: 1.35,
            color: '#FFFFFF',
            fontStyle: type === 'statement' ? 'italic' : 'normal',
            fontWeight: 600,
            letterSpacing: '0.01em',
            marginTop: 4,
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
