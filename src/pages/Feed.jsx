import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { CategoryBadge, TypeBadge, PageLoading, EmptyState } from '../components/ui'
import QuestionMedia from '../components/QuestionMedia'
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
  const [activeType, setActiveType] = useState('all')
  const [questions, setQuestions] = useState([])
  const [featuredQuestion, setFeaturedQuestion] = useState(null)
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [featuredBeat, setFeaturedBeat] = useState(false)
  const [ripple, setRipple] = useState(null)
  const [categories, setCategories] = useState(CATEGORIES)
  const navigate = useNavigate()
  const contentRef = useRef(null)
  const featuredCardRef = useRef(null)
  const totalQuestions = questions.length + (featuredQuestion && !questions.find(q => q.id === featuredQuestion.id) ? 1 : 0)
  const categoryCount = Math.max(categories.filter(cat => cat !== 'All').length, 0)

  // Fetch distinct categories from DB; fall back to the hardcoded constant on error
  useEffect(() => {
    supabase
      .from('questions')
      .select('category')
      .then(({ data, error }) => {
        if (error || !data) return
        const distinct = [...new Set(data.map(r => r.category).filter(Boolean))].sort()
        if (distinct.length > 0) setCategories(['All', ...distinct])
      })
  }, [])

  function handleFilterAndScroll(typeId) {
    // Toggle off — clicking the active card returns to All
    if (activeType === typeId) {
      setActiveType('all')
      return
    }
    setActiveType(typeId)
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  useEffect(() => { loadQuestions() }, [activeCategory])

  // Save scroll position continuously while on feed
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('feed_scroll', window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Restore scroll position after questions have rendered
  useEffect(() => {
    if (!loading && questions.length > 0) {
      const saved = sessionStorage.getItem('feed_scroll')
      if (saved) {
        setTimeout(() => {
          window.scrollTo({ top: parseInt(saved), behavior: 'instant' })
          sessionStorage.removeItem('feed_scroll')
        }, 80)
      }
    }
  }, [loading, questions])

  async function loadQuestions() {
    setLoading(true)

    // Fetch featured question independently so any failure never blocks the main feed
    let featuredData = null
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('featured', true)
        .eq('archived', false)
        .maybeSingle()
      if (!error) featuredData = data || null
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
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Live Feed
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Today&apos;s active questions
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, letterSpacing: '0.01em', lineHeight: 1.6, maxWidth: 520 }}>
            Browse the current signal stream, cast anonymously, and watch the Truth Gap form in real time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
          <FeedMetricChip label="Questions" value={String(totalQuestions)} />
          <FeedMetricChip label="Categories" value={String(categoryCount)} />
          <FeedMetricChip label="Source" value="Live backend aligned" accent="var(--teal)" />
        </div>

        {/* Featured / Pulse of the Day */}
        {featuredQuestion && (
          <div
            ref={featuredCardRef}
            className={`pulse-card${featuredBeat ? ' beat' : ''}`}
            onClick={() => {
              // Single strong beat — one-shot spike animation, then navigate
              setFeaturedBeat(true)
              setTimeout(() => setFeaturedBeat(false), 400)
              sessionStorage.setItem('feed_scroll', window.scrollY)
              setTimeout(() => navigate(`/vote/${featuredQuestion.id}`), 280)
            }}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(10,12,26,0.95))',
              border: '1px solid rgba(201,168,76,0.5)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 36px',
              marginBottom: 36,
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--gold)',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: 'var(--gold)', fontWeight: 800,
                textShadow: '0 0 20px rgba(201,168,76,0.4)',
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
                <QuestionMedia src={featuredQuestion.image_url} alt="" variant="hero" />
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {(() => {
                  const n = voteCounts[featuredQuestion.id]?.all?.total || 0
                  return n < 10 ? 'Be among the first to signal' : `${n} voices heard`
                })()}
              </span>
              <span
                className="reveal-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  const card = featuredCardRef.current
                  if (card) {
                    const cardRect = card.getBoundingClientRect()
                    const btnRect = e.currentTarget.getBoundingClientRect()
                    setRipple({
                      x: btnRect.left - cardRect.left + btnRect.width / 2,
                      y: btnRect.top - cardRect.top + btnRect.height / 2,
                      key: Date.now(),
                    })
                  }
                  sessionStorage.setItem('feed_scroll', window.scrollY)
                  setTimeout(() => navigate(`/vote/${featuredQuestion.id}`), 420)
                }}
              >
                Reveal the Signal →
              </span>
            </div>

            {/* Ripple broadcast overlay — fires on Reveal button click */}
            {ripple && (
              <div
                key={ripple.key}
                style={{
                  position: 'absolute',
                  left: ripple.x,
                  top: ripple.y,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              >
                <span className="ripple-ring" style={{ animationDelay: '0ms' }} />
                <span className="ripple-ring" style={{ animationDelay: '80ms' }} />
                <span className="ripple-ring" style={{ animationDelay: '160ms' }} />
              </div>
            )}

            {/* Background glow */}
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        {/* Mobile responsive style for preview grid + animations */}
        <style>{`
          @media (max-width: 768px) {
            .preview-grid { grid-template-columns: 1fr !important; }
          }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes heartbeat-calm {
            0%, 100% {
              box-shadow:
                0 0 20px rgba(201,168,76,0.12),
                0 0 0 1px rgba(201,168,76,0.35),
                inset 0 0 40px rgba(201,168,76,0.02);
            }
            50% {
              box-shadow:
                0 0 50px rgba(201,168,76,0.32),
                0 0 0 1px rgba(201,168,76,0.75),
                inset 0 0 60px rgba(201,168,76,0.04);
            }
          }
          @keyframes heartbeat-intense {
            0%, 100% {
              box-shadow:
                0 0 30px rgba(201,168,76,0.20),
                0 0 0 1px rgba(201,168,76,0.55),
                inset 0 0 50px rgba(201,168,76,0.03);
            }
            50% {
              box-shadow:
                0 0 70px rgba(201,168,76,0.60),
                0 0 0 1px rgba(201,168,76,0.95),
                inset 0 0 80px rgba(201,168,76,0.08);
            }
          }
          @keyframes heartbeat-spike {
            0% {
              box-shadow:
                0 0 20px rgba(201,168,76,0.12),
                0 0 0 1px rgba(201,168,76,0.35);
            }
            25% {
              box-shadow:
                0 0 90px rgba(201,168,76,0.85),
                0 0 0 2px rgba(201,168,76,1),
                inset 0 0 90px rgba(201,168,76,0.14);
            }
            100% {
              box-shadow:
                0 0 20px rgba(201,168,76,0.12),
                0 0 0 1px rgba(201,168,76,0.35);
            }
          }
          .pulse-card {
            animation: heartbeat-calm 2.5s ease-in-out infinite;
          }
          .pulse-card:hover {
            animation: heartbeat-intense 1.2s ease-in-out infinite;
          }
          /* Click beat overrides both calm and intense — placed last for specificity */
          .pulse-card.beat,
          .pulse-card:hover.beat {
            animation: heartbeat-spike 0.4s ease-out;
          }
          .reveal-btn {
            display: inline-block;
            padding: 8px 20px;
            border: 1px solid #C9A84C;
            border-radius: 6px;
            color: #C9A84C;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.05em;
            transition: all 0.2s ease;
          }
          .reveal-btn:hover {
            background: rgba(201,168,76,0.15);
            box-shadow: 0 0 20px rgba(201,168,76,0.35);
          }
          @keyframes ripple-expand {
            0%   { transform: translate(-50%, -50%) scale(1);   opacity: 0.85; }
            100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0;    }
          }
          .ripple-ring {
            position: absolute;
            left: 0;
            top: 0;
            width: 180px;
            height: 36px;
            border: 2px solid #C9A84C;
            border-radius: 10px;
            opacity: 0;
            pointer-events: none;
            animation: ripple-expand 0.5s ease-out forwards;
          }
        `}</style>

        {/* Three type preview cards */}
        {!loading && questions.length > 0 && (() => {
          const statements    = questions.filter(q => (q.type || 'statement') === 'statement' && !q.featured)
          const choices       = questions.filter(q => q.type === 'choice' && !q.featured)
          const ranked        = questions.filter(q => q.type === 'ranked' && !q.featured)
          const signalPreview = statements[0] || null
          const decidePreview = choices[0] || null
          const rankPreview   = ranked[0] || null
          return (
            <>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15, fontStyle: 'italic',
                color: 'var(--text-muted)', textAlign: 'center',
                marginBottom: 16,
              }}>
                Explore how people think, choose, and prioritize.
              </p>
              <div className="preview-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 32,
              }}>
                <PreviewCard
                  type="statement" label="Signal" icon="◈" color="#C9A84C"
                  tagline="Where do you stand?"
                  viewAllLabel="Explore Signals →"
                  question={signalPreview} count={statements.length}
                  onClick={() => handleFilterAndScroll('statement')}
                  isActive={activeType === 'statement'}
                  isDimmed={activeType !== 'all' && activeType !== 'statement'}
                />
                <PreviewCard
                  type="choice" label="Decide" icon="◉" color="#4CC9A8"
                  tagline="One choice. No middle ground."
                  viewAllLabel="Explore Decisions →"
                  question={decidePreview} count={choices.length}
                  onClick={() => handleFilterAndScroll('choice')}
                  isActive={activeType === 'choice'}
                  isDimmed={activeType !== 'all' && activeType !== 'choice'}
                />
                <PreviewCard
                  type="ranked" label="Rank" icon="◆" color="#9B6FD8"
                  tagline="Your order. Your truth."
                  viewAllLabel="Explore Rankings →"
                  question={rankPreview} count={ranked.length}
                  onClick={() => handleFilterAndScroll('ranked')}
                  isActive={activeType === 'ranked'}
                  isDimmed={activeType !== 'all' && activeType !== 'ranked'}
                />
              </div>
            </>
          )
        })()}

        {/* Category filter pills */}
        <div ref={contentRef} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, scrollMarginTop: 80 }}>
          {categories.map(cat => {
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
                const allSections = [
                  { key: 'statement', icon: '◈', color: 'var(--gold)',  title: 'Signals',   subtitle: 'What people feel across the spectrum', items: statements },
                  { key: 'choice',    icon: '◉', color: 'var(--teal)',  title: 'Decisions', subtitle: 'One choice. No middle ground.',        items: choices    },
                  { key: 'ranked',    icon: '◆', color: '#9B6FD8',      title: 'Rankings',  subtitle: 'Your order. Your truth.',              items: ranked     },
                ]
                const sections = activeType === 'all'
                  ? allSections
                  : allSections.filter(s => s.key === activeType)
                return sections
                  .filter(s => s.items.length > 0)
                  .map(s => (
                    <div key={s.key} style={{ marginBottom: 48 }}>
                      <div style={{
                        marginBottom: 20, paddingBottom: 16,
                        borderBottom: '1px solid rgba(201,168,76,0.12)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        {s.subtitle && (
                          <p style={{
                            fontSize: 13, fontStyle: 'italic',
                            color: 'var(--text-muted)',
                            marginTop: 8, marginLeft: 32,
                          }}>
                            {s.subtitle}
                          </p>
                        )}
                      </div>
                      <div key={`${activeType}-${s.key}`} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {s.items.map((q, i) => (
                          <div
                            key={q.id}
                            style={{
                              animation: 'fadeSlideUp 0.3s ease-out both',
                              animationDelay: `${i * 50}ms`,
                            }}
                          >
                            <StatementCard
                              question={q}
                              counts={voteCounts[q.id]}
                              onClick={() => {
                                sessionStorage.setItem('feed_scroll', window.scrollY)
                                navigate(`/vote/${q.id}`)
                              }}
                            />
                          </div>
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

function FeedMetricChip({ label, value, accent = 'var(--gold)' }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 999,
      background: 'rgba(10,12,26,0.74)',
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

function PreviewCard({ type, label, icon, color, tagline, viewAllLabel, question, count, onClick, isActive, isDimmed }) {
  const [hovered, setHovered] = useState(false)
  // Elevated = actively selected, or hovered while not dimmed
  const elevated = isActive || (!isDimmed && hovered)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: elevated
          ? `linear-gradient(135deg, rgba(15,18,35,0.98), ${color}22)`
          : 'rgba(10,12,26,0.8)',
        border: `1px solid ${isActive ? color : elevated ? color + '99' : color + '1A'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: isDimmed
          ? 'scale(0.97)'
          : elevated
            ? 'translateY(-5px) scale(1.02)'
            : 'none',
        opacity: isDimmed ? 0.5 : 1,
        boxShadow: isActive
          ? `0 16px 48px ${color}66, 0 0 0 1px ${color}, 0 0 24px ${color}44`
          : elevated
            ? `0 12px 40px ${color}55, 0 0 0 1px ${color}66`
            : 'none',
      }}
    >
      {/* Animated bottom border */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3,
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        background: `linear-gradient(to right, transparent, ${color}ee, transparent)`,
        opacity: elevated ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color, fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</span>
        </div>
        <span style={{
          fontSize: 11, color: 'var(--text-dim)',
          background: 'rgba(255,255,255,0.04)',
          padding: '2px 8px', borderRadius: 10,
        }}>
          {count}
        </span>
      </div>

      <p style={{
        fontSize: 12, color: 'var(--text-muted)',
        fontStyle: 'italic', marginBottom: 14, lineHeight: 1.4,
      }}>
        {tagline}
      </p>

      {question && (
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13, color: 'var(--text)', lineHeight: 1.4,
          fontStyle: type === 'statement' ? 'italic' : 'normal',
          marginBottom: 14,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {type === 'statement' ? `"${question.text}"` : question.text}
        </p>
      )}

      <div style={{
        fontSize: 13, color, fontWeight: 600,
        letterSpacing: '0.05em',
        opacity: elevated ? 1 : 0.7,
        transform: elevated ? 'translateX(6px)' : 'none',
        transition: 'all 0.25s ease',
      }}>
        {isActive ? `← Back to All` : viewAllLabel}
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

    const isLocked = question.reveal_mode && question.reveal_mode !== 'instant'
    if (isLocked) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic',
        }}>
          <span style={{ opacity: 0.5 }}>◈</span>
          <span>
            {question.reveal_mode === 'threshold'
              ? `${total} voted · results reveal at ${question.reveal_threshold}`
              : `${total} voted · results locked until reveal date`}
          </span>
        </div>
      )
    }

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
          maxHeight: 220,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <QuestionMedia src={question.image_url} alt="" variant="card" />
        </div>
      )}
      {total > 0
        ? getSummary()
        : <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>Be the first to signal →</div>
      }
    </div>
  )
}
