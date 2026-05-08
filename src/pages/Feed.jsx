import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import QuestionMedia from '../components/QuestionMedia'
import { CategoryBadge, TypeBadge, PageLoading, EmptyState } from '../components/ui'
import { fetchQuestions, fetchVotesForQuestion, calcResults, calcChoiceResults, calcRankedResults } from '../lib/data'
import { supabase } from '../lib/supabase'
import { CATEGORIES, CATEGORY_COLORS } from '../constants'
import { useAuth } from '../lib/auth'
import { isAdminUser } from '../lib/adminAccess'
import { getOptimizedFeedMediaUrl } from '../lib/mediaUrls'

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

function getActionLabel(type) {
  if (type === 'choice') return 'Open Decision'
  if (type === 'ranked') return 'Open Ranking'
  return 'Open Signal'
}

function getSectionSubtitle(type) {
  if (type === 'choice') return 'One choice. No middle ground.'
  if (type === 'ranked') return 'Arrange what matters most.'
  return 'Where instinct, doubt, and conviction meet.'
}

function getFeedMediaUrl(question) {
  return getOptimizedFeedMediaUrl(question)
}

export default function Feed() {
  const { user } = useAuth()
  const isAdmin = isAdminUser(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState('All')
  const requestedType = ['statement', 'choice', 'ranked'].includes(searchParams.get('type'))
    ? searchParams.get('type')
    : 'all'
  const [activeType, setActiveType] = useState(requestedType)
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
  const typeCounts = {
    statement: questions.filter(q => (q.type || 'statement') === 'statement' && !q.featured).length,
    choice: questions.filter(q => q.type === 'choice' && !q.featured).length,
    ranked: questions.filter(q => q.type === 'ranked' && !q.featured).length,
  }
  const categoryCounts = Object.fromEntries(
    categories
      .filter(cat => cat !== 'All')
      .map(cat => [cat, questions.filter(q => q.category === cat).length])
  )

  useEffect(() => {
    setActiveType(requestedType)
  }, [requestedType])

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
    const nextType = activeType === typeId ? 'all' : typeId
    setActiveType(nextType)
    const nextParams = new URLSearchParams(searchParams)
    if (nextType === 'all') {
      nextParams.delete('type')
    } else {
      nextParams.set('type', nextType)
    }
    setSearchParams(nextParams, { replace: true })
    if (nextType === 'all') {
      setActiveType('all')
      return
    }
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  useEffect(() => { loadQuestions() }, [activeCategory])

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('feed_scroll', window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

    let featuredData = null
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('featured', true)
        .eq('archived', false)
        .maybeSingle()
      if (!error) featuredData = data || null
    } catch (_) {}
    setFeaturedQuestion(featuredData)

    try {
      const data = await fetchQuestions(activeCategory)
      setQuestions(data)

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
      <style>{`
        @media (max-width: 1120px) {
          .feed-shell {
            grid-template-columns: 1fr !important;
          }
          .feed-sidebar {
            display: none !important;
          }
        }
        @media (min-width: 1121px) {
          .feed-chip-row {
            display: none !important;
          }
        }
      `}</style>
      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '36px 20px 96px' }}>
        <div className="feed-shell" style={{ display: 'grid', gridTemplateColumns: '248px minmax(0, 1fr)', gap: 36, alignItems: 'start' }}>
          <aside className="feed-sidebar" style={{ position: 'sticky', top: 90 }}>
            <div style={{
              background: 'rgba(8,10,22,0.88)',
              border: '1px solid rgba(201,168,76,0.12)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(18px)',
            }}>
              <div style={{ padding: '24px 22px 18px', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', marginBottom: 8 }}>
                  Pulse Feed
                </div>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
                  Intellectual rigor
                </div>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                  lineHeight: 1.3,
                }}>
                  Curated signals with room to think.
                </p>
              </div>

              <div style={{ padding: '18px 12px 14px' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '0 10px 10px' }}>
                  Browse
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: activeCategory === cat ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        borderLeft: activeCategory === cat ? '2px solid var(--gold)' : '2px solid transparent',
                        color: activeCategory === cat ? 'var(--text)' : 'var(--text-muted)',
                        padding: '12px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'var(--transition)',
                        borderRadius: 14,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                        {cat !== 'All' && (categoryCounts[cat] || 0) > 0 && (
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: activeCategory === cat ? 'var(--gold)' : 'var(--teal)',
                            boxShadow: activeCategory === cat ? '0 0 14px rgba(201,168,76,0.35)' : '0 0 12px rgba(76,201,168,0.26)',
                            flexShrink: 0,
                          }} />
                        )}
                        {cat}
                      </span>
                      <span style={{ fontSize: 11, color: activeCategory === cat ? 'var(--gold)' : 'var(--text-dim)' }}>
                        {cat === 'All'
                          ? totalQuestions
                          : categoryCounts[cat] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '10px 12px 18px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '0 10px 10px' }}>
                  Your space
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <SidebarNavLink to="/my-pulses" label="My Pulses" meta="What you've opened and answered" />
                  <SidebarNavLink to="/suggestions" label="Suggestions" meta="Shape what Pulse asks next" />
                  <SidebarNavLink to="/upcoming" label="Upcoming" meta="See the roadmap ahead" />
                  <SidebarNavLink to="/profile" label="Profile" meta="Identity, recovery, and settings" />
                  {isAdmin ? <SidebarNavLink to="/admin" label="Admin" meta="Manage questions and reviews" accent="var(--gold)" /> : null}
                </div>
              </div>

              <div style={{ padding: '0 12px 18px' }}>
                <Link
                  to={isAdmin ? '/admin' : '/suggestions'}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    padding: '13px 14px',
                    borderRadius: 16,
                    border: '1px solid rgba(201,168,76,0.22)',
                    background: 'linear-gradient(180deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
                    color: 'var(--gold)',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
                  }}
                >
                  {isAdmin ? 'New Signal' : 'Suggest a Signal'}
                </Link>
              </div>
            </div>
          </aside>

          <div>
        <div style={{ marginBottom: 28, maxWidth: 760 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
            Live Feed
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(34px, 5vw, 62px)',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.02,
            marginBottom: 14,
            maxWidth: 760,
          }}>
            A cinematic stream of active questions.
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, letterSpacing: '0.01em', lineHeight: 1.7, maxWidth: 640 }}>
            Browse the current signal stream, open the questions that pull you in, and watch the Truth Gap form in real time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 36 }}>
          <FeedMetricChip label="Questions" value={String(totalQuestions)} />
          <FeedMetricChip label="Categories" value={String(categoryCount)} />
          <FeedMetricChip label="Source" value="Live backend aligned" accent="var(--teal)" />
          <FeedMetricChip label="Signals" value={String(typeCounts.statement)} accent="var(--gold)" />
          <FeedMetricChip label="Decisions" value={String(typeCounts.choice)} accent="var(--teal)" />
          <FeedMetricChip label="Rankings" value={String(typeCounts.ranked)} accent="#9B6FD8" />
        </div>

        {featuredQuestion && (
          <div
            ref={featuredCardRef}
            className={`pulse-card${featuredBeat ? ' beat' : ''}`}
            onClick={() => {
              setFeaturedBeat(true)
              setTimeout(() => setFeaturedBeat(false), 400)
              sessionStorage.setItem('feed_scroll', window.scrollY)
              setTimeout(() => navigate(`/vote/${featuredQuestion.id}`), 280)
            }}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(10,12,26,0.95))',
              border: '1px solid rgba(201,168,76,0.42)',
              borderRadius: 'var(--radius-xl)',
              padding: '36px',
              marginBottom: 44,
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            <div className="featured-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.9fr)', gap: 28, alignItems: 'stretch', position: 'relative', zIndex: 1 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
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
                  fontFamily: 'var(--font-ui, inherit)',
                  fontSize: 'clamp(26px, 3.6vw, 42px)',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1.14,
                  letterSpacing: '-0.01em',
                  marginBottom: 18,
                  maxWidth: 760,
                }}>
                  {(featuredQuestion.type || 'statement') === 'statement'
                    ? `"${featuredQuestion.text}"`
                    : featuredQuestion.text}
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.65, maxWidth: 600, marginBottom: 0 }}>
                  Enter the question, cast anonymously, and see whether verified truth converges with popular instinct.
                </p>
              </div>

              <div style={{
                background: 'rgba(6, 10, 22, 0.72)',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: 'var(--radius-xl)',
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{
                  minHeight: 240,
                  borderRadius: 'var(--radius-lg)',
                  position: 'relative',
                  background: getFeedMediaUrl(featuredQuestion)
                    ? 'rgba(5,7,16,0.82)'
                    : 'radial-gradient(circle at center, rgba(201,168,76,0.16), rgba(10,12,26,0.98) 62%)',
                  border: '1px solid rgba(201,168,76,0.14)',
                  overflow: 'hidden',
                }}>
                  {getFeedMediaUrl(featuredQuestion) && (
                    <>
                      <QuestionMedia
                        src={getFeedMediaUrl(featuredQuestion)}
                        alt={featuredQuestion.text}
                        variant="hero"
                        style={{ minHeight: 240, height: '100%' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(5,7,16,0.08), rgba(5,7,16,0.5) 78%, rgba(5,7,16,0.72))',
                      }} />
                    </>
                  )}
                  <div style={{
                    position: 'absolute',
                    left: 18,
                    bottom: 18,
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>
                    Featured Signal
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
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
              </div>
            </div>

            {ripple && (
              <div
                key={ripple.key}
                style={{
                  position: 'absolute',
                  left: ripple.x,
                  top: ripple.y,
                  pointerEvents: 'none',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 5,
                }}
              >
                <span className="ripple-ring" style={{ animationDelay: '0ms' }} />
                <span className="ripple-ring" style={{ animationDelay: '80ms' }} />
                <span className="ripple-ring" style={{ animationDelay: '160ms' }} />
              </div>
            )}

            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          </div>
        )}

        <style>{`
          @media (max-width: 1024px) {
            .featured-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media (max-width: 768px) {
            .featured-grid {
              gap: 18px !important;
            }
            .pulse-card {
              padding: 20px !important;
            }
          }
          @media (max-width: 900px) {
            .feed-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media (max-width: 768px) {
            .preview-grid {
              grid-template-columns: 1fr !important;
            }
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
          .pulse-card.beat,
          .pulse-card:hover.beat {
            animation: heartbeat-spike 0.4s ease-out;
          }
          .reveal-btn {
            display: inline-block;
            padding: 10px 22px;
            border: 1px solid #C9A84C;
            border-radius: 999px;
            color: #C9A84C;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
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
            border-radius: 999px;
            opacity: 0;
            pointer-events: none;
            animation: ripple-expand 0.5s ease-out forwards;
          }
        `}</style>

        {!loading && questions.length > 0 && (() => {
          const statements = questions.filter(q => (q.type || 'statement') === 'statement' && !q.featured)
          const choices = questions.filter(q => q.type === 'choice' && !q.featured)
          const ranked = questions.filter(q => q.type === 'ranked' && !q.featured)
          const signalPreview = statements[0] || null
          const decidePreview = choices[0] || null
          const rankPreview = ranked[0] || null
          return (
            <div style={{ marginBottom: 40 }}>
              <p style={{
                fontFamily: 'var(--font-ui, inherit)',
                fontSize: 15,
                color: 'var(--text-muted)',
                textAlign: 'center',
                marginBottom: 18,
                lineHeight: 1.6,
              }}>
                Explore how people think, choose, and prioritize.
              </p>
              <div className="preview-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 18,
              }}>
                <PreviewCard
                  type="statement"
                  label="Signal"
                  icon="◈"
                  color="#C9A84C"
                  tagline="Where do you stand?"
                  viewAllLabel="Explore Signals →"
                  question={signalPreview}
                  count={statements.length}
                  onClick={() => handleFilterAndScroll('statement')}
                  isActive={activeType === 'statement'}
                  isDimmed={activeType !== 'all' && activeType !== 'statement'}
                />
                <PreviewCard
                  type="choice"
                  label="Decide"
                  icon="◎"
                  color="#4CC9A8"
                  tagline="One choice. No middle ground."
                  viewAllLabel="Explore Decisions →"
                  question={decidePreview}
                  count={choices.length}
                  onClick={() => handleFilterAndScroll('choice')}
                  isActive={activeType === 'choice'}
                  isDimmed={activeType !== 'all' && activeType !== 'choice'}
                />
                <PreviewCard
                  type="ranked"
                  label="Rank"
                  icon="◆"
                  color="#9B6FD8"
                  tagline="Your order. Your truth."
                  viewAllLabel="Explore Rankings →"
                  question={rankPreview}
                  count={ranked.length}
                  onClick={() => handleFilterAndScroll('ranked')}
                  isActive={activeType === 'ranked'}
                  isDimmed={activeType !== 'all' && activeType !== 'ranked'}
                />
              </div>
            </div>
          )
        })()}

        <div className="feed-chip-row" ref={contentRef} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, scrollMarginTop: 80 }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat
            const catColor = cat === 'All' ? 'var(--gold)' : (CATEGORY_COLORS[cat] || 'var(--gold)')
            const rgb = cat === 'All' ? '201,168,76' : hexToRgb(CATEGORY_COLORS[cat] || '#C9A84C')
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '7px 18px',
                borderRadius: 999,
                border: `1px solid ${isActive ? catColor : 'rgba(201,168,76,0.15)'}`,
                background: isActive ? `rgba(${rgb},0.12)` : 'transparent',
                color: isActive ? catColor : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition)',
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
                const choices = questions.filter(q => q.type === 'choice' && !q.featured)
                const ranked = questions.filter(q => q.type === 'ranked' && !q.featured)
                const allSections = [
                  { key: 'statement', icon: '◈', color: 'var(--gold)', title: 'Signals', items: statements },
                  { key: 'choice', icon: '◎', color: 'var(--teal)', title: 'Decisions', items: choices },
                  { key: 'ranked', icon: '◆', color: '#9B6FD8', title: 'Rankings', items: ranked },
                ]
                const sections = activeType === 'all'
                  ? allSections
                  : allSections.filter(s => s.key === activeType)
                return sections
                  .filter(s => s.items.length > 0)
                  .map(s => (
                    <div key={s.key} style={{ marginBottom: 54 }}>
                      <div style={{
                        marginBottom: 20,
                        paddingBottom: 16,
                        borderBottom: '1px solid rgba(201,168,76,0.12)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 20 }}>{s.icon}</span>
                          <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 28,
                            fontWeight: 600,
                            color: s.color,
                          }}>
                            {s.title}
                          </h2>
                          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                            {s.items.length} {s.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <p style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 17,
                          fontStyle: 'italic',
                          color: 'var(--text-muted)',
                          marginTop: 8,
                          marginLeft: 32,
                          lineHeight: 1.45,
                        }}>
                          {getSectionSubtitle(s.key)}
                        </p>
                      </div>
                      <div className="feed-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 34, rowGap: 40 }}>
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

function SidebarNavLink({ to, label, meta, accent = 'var(--teal)' }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        padding: '12px 12px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        textDecoration: 'none',
        transition: 'var(--transition)',
      }}
    >
      <div style={{ color: accent, fontSize: 13, fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.45 }}>
        {meta}
      </div>
    </Link>
  )
}

function PreviewCard({ type, label, icon, color, tagline, viewAllLabel, question, count, onClick, isActive, isDimmed }) {
  const [hovered, setHovered] = useState(false)
  const elevated = isActive || (!isDimmed && hovered)
  const previewText = question
    ? (type === 'statement' ? `"${question.text}"` : question.text)
    : tagline

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 336,
        background: elevated
          ? `linear-gradient(135deg, rgba(15,18,35,0.98), ${color}22)`
          : 'linear-gradient(180deg, rgba(10,12,26,0.92), rgba(10,12,26,0.74))',
        border: `1px solid ${isActive ? color : elevated ? `${color}99` : `${color}1A`}`,
        borderRadius: 'var(--radius-xl)',
        padding: '22px',
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
            ? `0 12px 40px ${color}33, 0 0 0 1px ${color}44`
            : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(3,4,11,0.08) 0%, rgba(3,4,11,0.2) 36%, rgba(3,4,11,0.92) 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color, fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</span>
        </div>
        <span style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          background: 'rgba(255,255,255,0.04)',
          padding: '2px 8px',
          borderRadius: 999,
        }}>
          {count}
        </span>
      </div>

      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
        {getFeedMediaUrl(question) && (
          <div style={{
            position: 'relative',
            borderRadius: 22,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 18,
            minHeight: 176,
            background: 'rgba(5,7,16,0.72)',
          }}>
            <QuestionMedia
              src={getFeedMediaUrl(question)}
              alt={question.text}
              variant="card"
              style={{ minHeight: 176, height: '100%' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(3,4,11,0.04), rgba(3,4,11,0.18) 48%, rgba(3,4,11,0.52))',
            }} />
          </div>
        )}
        <p style={{
          fontFamily: 'var(--font-ui, inherit)',
          fontSize: 21,
          color: 'var(--text)',
          lineHeight: 1.26,
          fontWeight: 700,
          marginBottom: 12,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {previewText}
        </p>

        <p style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginBottom: 14,
          lineHeight: 1.55,
          maxWidth: 280,
        }}>
          {tagline}
        </p>

        <div style={{
          fontSize: 13,
          color,
          fontWeight: 600,
          letterSpacing: '0.05em',
          opacity: elevated ? 1 : 0.75,
          transform: elevated ? 'translateX(6px)' : 'none',
          transition: 'all 0.25s ease',
        }}>
          {isActive ? '← Back to All' : viewAllLabel}
        </div>
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
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-dim)',
          lineHeight: 1.45,
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
          <div style={{ display: 'flex', gap: 2, height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${Disagree}%`, background: '#C94C4C' }} />
            <div style={{ width: `${Neutral}%`, background: 'var(--gold)' }} />
            <div style={{ width: `${Agree}%`, background: 'var(--teal)' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span><span style={{ color: '#C94C4C', fontWeight: 600 }}>{Disagree}%</span> Disagree</span>
            <span><span style={{ color: 'var(--gold)', fontWeight: 600 }}>{Neutral}%</span> Neutral</span>
            <span><span style={{ color: 'var(--teal)', fontWeight: 600 }}>{Agree}%</span> Agree</span>
          </div>
        </>
      )
    }

    if (type === 'choice') {
      const winner = counts.all?.winner
      return winner ? <div style={{ fontSize: 12, color: 'var(--teal)' }}>Leading: <strong>{winner}</strong></div> : null
    }

    if (type === 'ranked') {
      const top = counts.all?.options?.[0]?.label
      return top ? <div style={{ fontSize: 12, color: '#9B6FD8' }}>Top ranked: <strong>{top}</strong></div> : null
    }

    return null
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative',
        minHeight: 520,
        background: 'linear-gradient(180deg, rgba(15,18,34,0.96), rgba(8,10,22,0.98))',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: '22px 22px 24px',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 18px 42px rgba(0,0,0,0.26)' : 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        height: 1,
        background: type === 'choice'
          ? 'linear-gradient(90deg, transparent, rgba(76,201,168,0.75), transparent)'
          : type === 'ranked'
            ? 'linear-gradient(90deg, transparent, rgba(155,111,216,0.75), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(201,168,76,0.75), transparent)',
        opacity: hovered ? 1 : 0.55,
        transition: 'var(--transition)',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <CategoryBadge category={question.category} />
          <TypeBadge type={type} />
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          textAlign: 'right',
          flexShrink: 0,
          background: 'rgba(7,10,22,0.72)',
          padding: '10px 12px',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
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

      <div style={{
        minHeight: 180,
        borderRadius: '26px',
        overflow: 'hidden',
        position: 'relative',
        background: getFeedMediaUrl(question)
          ? 'rgba(5,7,16,0.82)'
          : 'radial-gradient(circle at center, rgba(76,201,168,0.1), rgba(18,22,42,0.98) 62%)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 20,
      }}>
        {getFeedMediaUrl(question) && (
          <>
            <QuestionMedia
              src={getFeedMediaUrl(question)}
              alt={question.text}
              variant="card"
              style={{ minHeight: 180, height: '100%' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(5,7,16,0.05), rgba(5,7,16,0.18) 55%, rgba(5,7,16,0.32))',
            }} />
          </>
        )}
        {!getFeedMediaUrl(question) && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.14)',
            fontSize: 34,
            letterSpacing: '0.2em',
          }}>
            {type === 'choice' ? '◎' : type === 'ranked' ? '◆' : '◈'}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <p style={{
          fontFamily: 'var(--font-ui, inherit)',
          fontSize: 'clamp(22px, 2vw, 31px)',
          lineHeight: 1.22,
          color: '#FFFFFF',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          marginTop: 0,
          marginBottom: 12,
        }}>
          {type === 'statement' ? `"${question.text}"` : question.text}
        </p>
        <p style={{
          fontSize: 14,
          color: 'var(--text-muted)',
          lineHeight: 1.65,
          marginTop: 0,
          marginBottom: 22,
          maxWidth: 520,
        }}>
          {type === 'choice'
            ? 'Choose one side and reveal where the collective is leaning.'
            : type === 'ranked'
              ? 'Arrange the options in order of intensity, importance, or risk.'
              : 'Place yourself on the spectrum and see how the wider signal responds.'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginTop: 'auto' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {total > 0
            ? getSummary()
            : <div style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>Be the first to signal →</div>
          }
          {hovered && (
            <div style={{
              marginTop: 12,
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              fontSize: 11,
              color: 'var(--text-dim)',
            }}>
              <span>Verified Truth: <span style={{ color: 'var(--teal)' }}>{verCount}</span></span>
              <span>Layer: <span style={{ color: 'var(--text-muted)' }}>{type === 'ranked' ? 'Priority' : type === 'choice' ? 'Decision' : 'Signal'}</span></span>
            </div>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: hovered ? 'var(--gold)' : 'var(--text-dim)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          transition: 'var(--transition)',
          flexShrink: 0,
        }}>
          {getActionLabel(type)} →
        </div>
      </div>
    </div>
  )
}
