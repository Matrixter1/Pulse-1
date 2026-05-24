import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import QuestionMedia from '../components/QuestionMedia'
import { EmptyState, PageLoading } from '../components/ui'
import {
  calcChoiceResults,
  calcRankedResults,
  calcResults,
  fetchQuestions,
  fetchVotesForQuestion,
} from '../lib/data'
import { supabase } from '../lib/supabase'
import { CATEGORIES, CATEGORY_COLORS, QUESTION_TYPE_META } from '../constants'
import { useAuth } from '../lib/auth'
import { isAdminUser } from '../lib/adminAccess'
import { getOptimizedFeedMediaUrl } from '../lib/mediaUrls'

const TOP_TABS = [
  { key: 'all', label: 'Feed' },
  { key: 'statement', label: 'Signals' },
  { key: 'choice', label: 'Decisions' },
  { key: 'ranked', label: 'Rankings' },
]

const CARD_ACTION = {
  statement: 'Explore Signals',
  choice: 'Explore Decisions',
  ranked: 'Explore Rankings',
}

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`
}

function formatCount(value) {
  if (!value) return '0'
  if (value < 1000) return `${value}`
  const shortValue = value / 1000
  return `${shortValue.toFixed(shortValue < 10 ? 1 : 0).replace('.0', '')}k`
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function typeMatches(question, activeType) {
  if (activeType === 'all') return true
  return (question.type || 'statement') === activeType
}

function categoryMatches(question, activeCategory) {
  if (activeCategory === 'All') return true
  return titleCase(question.category || '') === activeCategory
}

function getQuestionAccent(type) {
  return QUESTION_TYPE_META[type || 'statement']?.color || 'var(--gold)'
}

function getQuestionLabel(type) {
  return QUESTION_TYPE_META[type || 'statement']?.label || 'Signal'
}

function getFeedMediaUrl(question) {
  return getOptimizedFeedMediaUrl(question)
}

function formatQuestionText(question) {
  if ((question.type || 'statement') === 'statement') {
    return `"${question.text}"`
  }

  return question.text
}

function getQuestionSummary(question, counts) {
  const type = question.type || 'statement'
  const totalVotes = counts?.all?.total || 0

  if (!counts || totalVotes === 0) {
    return 'Enter the question, cast anonymously, and shape the live signal.'
  }

  if (question.reveal_mode && question.reveal_mode !== 'instant') {
    if (question.reveal_mode === 'threshold') {
      return `Results stay locked until ${question.reveal_threshold || 'the threshold'} total votes are reached.`
    }
    return 'Results stay locked until the reveal window opens.'
  }

  if (type === 'statement') {
    return `${counts.all.Agree}% agree, ${counts.all.Neutral}% neutral, ${counts.all.Disagree}% disagree so far.`
  }

  if (type === 'choice' && counts.all?.winner) {
    return `${counts.all.winner} is leading the decision right now.`
  }

  if (type === 'ranked' && counts.all?.options?.[0]?.label) {
    return `${counts.all.options[0].label} currently sits at the top of the ranking.`
  }

  return 'Open the question to see how the signal is taking shape.'
}

function getQuestionFootnote(question, counts) {
  const totalVotes = counts?.all?.total || 0
  const verifiedVotes = counts?.verified?.total || 0

  if (!totalVotes) return 'Be the first to respond.'
  if (!verifiedVotes) return `${formatCount(totalVotes)} votes captured.`
  return `${formatCount(totalVotes)} votes captured, ${formatCount(verifiedVotes)} from verified members.`
}

export default function Feed() {
  const { user } = useAuth()
  const isAdmin = isAdminUser(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const contentRef = useRef(null)

  const [activeCategory, setActiveCategory] = useState('All')
  const requestedType = ['statement', 'choice', 'ranked'].includes(searchParams.get('type'))
    ? searchParams.get('type')
    : 'all'
  const [activeType, setActiveType] = useState(requestedType)
  const [questions, setQuestions] = useState([])
  const [featuredQuestion, setFeaturedQuestion] = useState(null)
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState(CATEGORIES)

  useEffect(() => {
    setActiveType(requestedType)
  }, [requestedType])

  useEffect(() => {
    void loadQuestions()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('feed_scroll', window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!loading && (questions.length > 0 || featuredQuestion)) {
      const saved = sessionStorage.getItem('feed_scroll')
      if (!saved) return

      setTimeout(() => {
        window.scrollTo(0, parseInt(saved, 10))
        sessionStorage.removeItem('feed_scroll')
      }, 80)
    }
  }, [featuredQuestion, loading, questions])

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

      if (!error) {
        featuredData = data || null
      }
    } catch (_) {
      featuredData = null
    }

    setFeaturedQuestion(featuredData)

    try {
      const data = await fetchQuestions('All')
      setQuestions(data)

      const discoveredCategories = [...new Set(
        data
          .map(question => titleCase(question.category || ''))
          .filter(Boolean),
      )].sort()

      setCategories(discoveredCategories.length > 0 ? ['All', ...discoveredCategories] : CATEGORIES)

      const queue = [...data]
      if (featuredData && !queue.find(question => question.id === featuredData.id)) {
        queue.unshift(featuredData)
      }

      const counts = {}
      await Promise.all(
        queue.map(async question => {
          const votes = await fetchVotesForQuestion(question.id)
          const type = question.type || 'statement'
          const options = parseOptions(question.options)

          if (type === 'statement') {
            counts[question.id] = {
              all: calcResults(votes),
              verified: calcResults(votes.filter(vote => vote.is_verified)),
              type,
            }
            return
          }

          if (type === 'choice') {
            counts[question.id] = {
              all: calcChoiceResults(votes, options),
              verified: calcChoiceResults(votes.filter(vote => vote.is_verified), options),
              type,
            }
            return
          }

          counts[question.id] = {
            all: calcRankedResults(votes, options),
            verified: calcRankedResults(votes.filter(vote => vote.is_verified), options),
            type,
          }
        }),
      )

      setVoteCounts(counts)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenQuestion(questionId) {
    sessionStorage.setItem('feed_scroll', window.scrollY)
    navigate(`/vote/${questionId}`)
  }

  function handleTypeChange(nextType) {
    const resolvedType = activeType === nextType ? 'all' : nextType
    setActiveType(resolvedType)

    const nextParams = new URLSearchParams(searchParams)
    if (resolvedType === 'all') {
      nextParams.delete('type')
    } else {
      nextParams.set('type', resolvedType)
    }
    setSearchParams(nextParams, { replace: true })

    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const allQuestions = useMemo(() => {
    const list = [...questions]
    if (featuredQuestion && !list.find(question => question.id === featuredQuestion.id)) {
      list.unshift(featuredQuestion)
    }
    return list
  }, [featuredQuestion, questions])

  const filteredQuestions = useMemo(
    () => allQuestions
      .filter(question => typeMatches(question, activeType))
      .filter(question => categoryMatches(question, activeCategory)),
    [activeCategory, activeType, allQuestions],
  )

  const heroQuestion =
    filteredQuestions.find(question => featuredQuestion && question.id === featuredQuestion.id) ||
    filteredQuestions[0] ||
    null

  const gridQuestions = heroQuestion
    ? filteredQuestions.filter(question => question.id !== heroQuestion.id)
    : filteredQuestions

  const allVisibleVotes = filteredQuestions.reduce(
    (sum, question) => sum + (voteCounts[question.id]?.all?.total || 0),
    0,
  )
  const allVisibleVerifiedVotes = filteredQuestions.reduce(
    (sum, question) => sum + (voteCounts[question.id]?.verified?.total || 0),
    0,
  )
  const activeQuestionCount = filteredQuestions.length
  const totalQuestions = allQuestions.length
  const visibleTypeLabel =
    activeType === 'all'
      ? 'Recent Signals'
      : `${QUESTION_TYPE_META[activeType]?.label || 'Signal'} Stream`

  const categoryCounts = useMemo(
    () => categories.reduce((accumulator, category) => {
      if (category === 'All') {
        accumulator.All = allQuestions.length
        return accumulator
      }

      accumulator[category] = allQuestions.filter(
        question => titleCase(question.category || '') === category,
      ).length
      return accumulator
    }, {}),
    [allQuestions, categories],
  )

  const laneCounts = {
    statement: allQuestions.filter(question => (question.type || 'statement') === 'statement').length,
    choice: allQuestions.filter(question => question.type === 'choice').length,
    ranked: allQuestions.filter(question => question.type === 'ranked').length,
  }

  return (
    <div className="page pulse-feed-page">
      <NavBar />
      <style>{feedStyles}</style>

      <div className="feed-shell">
        <aside className="feed-sidebar">
          <div className="sidebar-brand">
            <p className="sidebar-kicker">Signal Curator</p>
            <h1>Pulse</h1>
            <p className="sidebar-copy">
              A sharper home for Signal, Decide, and Rank. Browse by lane or move
              straight to the question pulling you in.
            </p>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">Discovery</p>
            <div className="sidebar-category-list">
              {categories.map(category => {
                const isActive = category === activeCategory
                const color = category === 'All' ? 'var(--gold)' : (CATEGORY_COLORS[category] || 'var(--gold)')
                return (
                  <button
                    key={category}
                    type="button"
                    className={`sidebar-category ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category)}
                    style={{
                      '--category-accent': color,
                      '--category-accent-rgb':
                        category === 'All'
                          ? '201, 168, 76'
                          : hexToRgb(CATEGORY_COLORS[category] || '#C9A84C'),
                    }}
                  >
                    <span>{category}</span>
                    <span className="sidebar-count">{categoryCounts[category] || 0}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">Your space</p>
            <div className="sidebar-link-list">
              <SidebarNavLink to="/my-pulses" label="My Pulses" meta="What you opened and answered" />
              <SidebarNavLink to="/suggestions" label="Suggestions" meta="Shape what Pulse asks next" />
              <SidebarNavLink to="/upcoming" label="Upcoming" meta="See the roadmap ahead" />
              <SidebarNavLink to="/profile" label="Profile" meta="Identity, recovery, and settings" />
              {isAdmin ? (
                <SidebarNavLink to="/admin" label="Admin" meta="Manage questions and reviews" accent="var(--gold)" />
              ) : null}
            </div>
          </div>

          <div className="sidebar-actions">
            <button
              type="button"
              className="sidebar-primary-action"
              onClick={() => navigate(isAdmin ? '/admin' : '/suggestions')}
            >
              {isAdmin ? '+ New Signal' : 'Suggest a Signal'}
            </button>
            <button type="button" className="sidebar-secondary-action" onClick={() => navigate('/profile')}>
              Settings
            </button>
            <button type="button" className="sidebar-secondary-action" onClick={() => navigate('/upcoming')}>
              Support
            </button>
          </div>

          <div className="sidebar-footer">
            <p className="sidebar-footnote">Verified layer active</p>
            <strong>{formatCount(allVisibleVerifiedVotes)} verified votes in view</strong>
          </div>
        </aside>

        <div className="feed-main-column">
          <header className="feed-topbar">
            <div className="feed-tabs" role="tablist" aria-label="Feed lanes">
              {TOP_TABS.map(tab => {
                const isActive = activeType === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`feed-tab ${isActive ? 'active' : ''}`}
                    onClick={() => handleTypeChange(tab.key)}
                  >
                    {tab.label}
                  </button>
                )
              })}
              <button type="button" className="feed-tab utility" onClick={() => navigate('/upcoming')}>
                Upcoming
              </button>
            </div>

            <div className="feed-topbar-actions">
              <div className="feed-search-shell">
                <span className="feed-search-icon">Search</span>
                <input
                  className="feed-search"
                  type="text"
                  value=""
                  readOnly
                  aria-label="Search signals"
                  placeholder="Search signals..."
                />
              </div>
              <button
                type="button"
                className="topbar-primary-action"
                onClick={() => navigate(isAdmin ? '/admin' : '/suggestions')}
              >
                {isAdmin ? 'New Signal' : 'Suggest'}
              </button>
            </div>
          </header>

          <main className="feed-content">
            <div className="feed-mobile-categories">
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={`mobile-category-chip ${category === activeCategory ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <section className="feed-intro">
              <p className="feed-kicker">Live Feed</p>
              <h2>
                A cinematic stream of <span>active questions.</span>
              </h2>
              <p className="feed-intro-copy">
                Browse the current signal stream, open the questions that pull you in,
                and watch verified truth separate from ambient opinion in real time.
              </p>
            </section>

            {loading ? (
              <PageLoading />
            ) : (
              <>
                {heroQuestion ? (
                  <FeaturedQuestionCard
                    question={heroQuestion}
                    counts={voteCounts[heroQuestion.id]}
                    onOpen={() => handleOpenQuestion(heroQuestion.id)}
                  />
                ) : (
                  <EmptyState message="No live questions match this lane yet." />
                )}

                <section className="feed-section" ref={contentRef}>
                  <div className="feed-section-heading">
                    <div>
                      <p className="feed-section-kicker">
                        {activeCategory === 'All' ? 'Across the feed' : activeCategory}
                      </p>
                      <h3>{visibleTypeLabel}</h3>
                    </div>
                    <p className="feed-section-meta">{activeQuestionCount} active questions</p>
                  </div>

                  {gridQuestions.length === 0 ? (
                    <EmptyState message="The featured card is carrying this lane for now." />
                  ) : (
                    <div className="feed-card-grid">
                      {gridQuestions.map(question => (
                        <FeedQuestionCard
                          key={question.id}
                          question={question}
                          counts={voteCounts[question.id]}
                          onOpen={() => handleOpenQuestion(question.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="feed-metrics">
                  <MetricCard
                    label="Active Questions"
                    value={formatCount(totalQuestions)}
                    body="Questions currently available across the live feed."
                  />
                  <MetricCard
                    label="Signals Captured"
                    value={formatCount(allVisibleVotes)}
                    body={`Signal ${laneCounts.statement} · Decide ${laneCounts.choice} · Rank ${laneCounts.ranked}`}
                  />
                  <MetricCard
                    label="Verified Layer"
                    value={formatCount(allVisibleVerifiedVotes)}
                    body="Verified participation stays visible without overpowering the question itself."
                    accent="teal"
                  />
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function FeaturedQuestionCard({ question, counts, onOpen }) {
  const type = question.type || 'statement'
  const accent = getQuestionAccent(type)
  const mediaUrl = getFeedMediaUrl(question)
  const verifiedVotes = counts?.verified?.total || 0

  return (
    <section className="featured-card" style={{ '--featured-accent': accent }}>
      <div className="featured-copy">
        <div className="featured-meta">
          <span className="featured-pill">Pulse of the Day</span>
          <span className="featured-tag">{titleCase(question.category || 'General')}</span>
          <span className="featured-tag subtle">{getQuestionLabel(type)}</span>
        </div>

        <h3>{formatQuestionText(question)}</h3>
        <p>{getQuestionSummary(question, counts)}</p>

        <div className="featured-actions">
          <button type="button" className="featured-cta" onClick={onOpen}>
            Reveal the Signal
          </button>
          <div className="featured-stats">
            <span>{getQuestionFootnote(question, counts)}</span>
            {verifiedVotes > 0 ? <strong>{formatCount(verifiedVotes)} verified</strong> : null}
          </div>
        </div>
      </div>

      <button type="button" className="featured-media-shell" onClick={onOpen}>
        {mediaUrl ? (
          <QuestionMedia
            src={mediaUrl}
            alt={question.text}
            variant="hero"
            style={{ width: '100%', height: '100%', minHeight: 320 }}
          />
        ) : (
          <div className="featured-media placeholder">
            <span>Signal Preview</span>
          </div>
        )}
        <div className="featured-media-overlay" />
      </button>
    </section>
  )
}

function FeedQuestionCard({ question, counts, onOpen }) {
  const type = question.type || 'statement'
  const accent = getQuestionAccent(type)
  const mediaUrl = getFeedMediaUrl(question)

  return (
    <article className="feed-card" style={{ '--card-accent': accent }}>
      <button type="button" className="feed-card-button" onClick={onOpen}>
        <div className="feed-card-header">
          <div className="feed-card-meta">
            <span className="feed-card-type">{getQuestionLabel(type)}</span>
            <span className="feed-card-category">{titleCase(question.category || 'General')}</span>
          </div>
          <span className="feed-card-votes">
            {formatCount(counts?.all?.total || 0)} votes
          </span>
        </div>

        <div className="feed-card-media-shell">
          {mediaUrl ? (
            <QuestionMedia
              src={mediaUrl}
              alt={question.text}
              variant="card"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div className="feed-card-media placeholder">
              <span>{getQuestionLabel(type)}</span>
            </div>
          )}
        </div>

        <div className="feed-card-body">
          <h4>{formatQuestionText(question)}</h4>
          <p>{getQuestionSummary(question, counts)}</p>
        </div>

        <div className="feed-card-footer">
          <span className="feed-card-action">{`${CARD_ACTION[type] || 'Open Question'} ->`}</span>
          <span className="feed-card-footnote">{getQuestionFootnote(question, counts)}</span>
        </div>
      </button>
    </article>
  )
}

function MetricCard({ label, value, body, accent = 'gold' }) {
  return (
    <article className={`metric-card ${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{body}</span>
    </article>
  )
}

function SidebarNavLink({ to, label, meta, accent = 'var(--teal)' }) {
  return (
    <Link to={to} className="sidebar-link">
      <div className="sidebar-link-label" style={{ '--sidebar-link-accent': accent }}>
        {label}
      </div>
      <div className="sidebar-link-meta">{meta}</div>
    </Link>
  )
}

const feedStyles = `
  .pulse-feed-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top right, rgba(76, 201, 168, 0.12), transparent 24%),
      radial-gradient(circle at top left, rgba(201, 168, 76, 0.14), transparent 30%),
      linear-gradient(180deg, #05060f 0%, #070910 100%);
  }

  .feed-shell {
    min-height: calc(100vh - 60px);
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .feed-sidebar {
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding: 28px 20px 24px;
    background: rgba(13, 16, 27, 0.92);
    border-right: 1px solid rgba(201, 168, 76, 0.08);
    backdrop-filter: blur(18px);
  }

  .sidebar-brand h1 {
    font-family: var(--font-display);
    font-size: 54px;
    line-height: 0.95;
    color: var(--text);
    margin-bottom: 12px;
  }

  .sidebar-kicker,
  .sidebar-label,
  .feed-kicker,
  .feed-section-kicker {
    font-size: 11px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 12px;
  }

  .sidebar-copy {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.7;
    max-width: 220px;
  }

  .sidebar-section {
    display: grid;
    gap: 16px;
  }

  .sidebar-category-list,
  .sidebar-link-list {
    display: grid;
    gap: 8px;
  }

  .sidebar-category {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    background: rgba(255, 255, 255, 0.01);
    color: var(--text-muted);
    transition: var(--transition);
    text-align: left;
  }

  .sidebar-category.active {
    color: var(--category-accent);
    border-color: rgba(var(--category-accent-rgb), 0.32);
    background: rgba(var(--category-accent-rgb), 0.1);
  }

  .sidebar-category:hover {
    border-color: rgba(var(--category-accent-rgb), 0.2);
    color: var(--text);
  }

  .sidebar-count {
    min-width: 28px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    font-size: 11px;
    text-align: center;
  }

  .sidebar-link {
    display: block;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.02);
    transition: var(--transition);
  }

  .sidebar-link:hover {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .sidebar-link-label {
    color: var(--sidebar-link-accent);
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 4px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .sidebar-link-meta {
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.45;
  }

  .sidebar-actions {
    margin-top: auto;
    display: grid;
    gap: 10px;
  }

  .sidebar-primary-action,
  .topbar-primary-action,
  .featured-cta {
    border: 1px solid rgba(201, 168, 76, 0.42);
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.18), rgba(201, 168, 76, 0.06));
    color: var(--gold);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border-radius: 16px;
    transition: var(--transition);
  }

  .sidebar-primary-action {
    padding: 16px 18px;
  }

  .topbar-primary-action {
    padding: 14px 18px;
  }

  .featured-cta {
    padding: 18px 26px;
  }

  .sidebar-primary-action:hover,
  .topbar-primary-action:hover,
  .featured-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 30px rgba(201, 168, 76, 0.12);
  }

  .sidebar-secondary-action {
    padding: 12px 0;
    border: 0;
    background: none;
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: left;
  }

  .sidebar-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 18px;
    display: grid;
    gap: 6px;
  }

  .sidebar-footnote {
    color: var(--text-dim);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sidebar-footer strong {
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
  }

  .feed-main-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .feed-topbar {
    position: sticky;
    top: 60px;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 18px 40px;
    background: rgba(9, 11, 19, 0.86);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(18px);
  }

  .feed-tabs {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .feed-tab {
    position: relative;
    border: 0;
    background: none;
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 10px 0;
  }

  .feed-tab.active,
  .feed-tab:hover {
    color: var(--text);
  }

  .feed-tab.active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    border-radius: 999px;
    background: var(--gold);
  }

  .feed-tab.utility {
    color: var(--text-dim);
  }

  .feed-topbar-actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .feed-search-shell {
    min-width: min(320px, 40vw);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: 46px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .feed-search-icon {
    color: var(--text-dim);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .feed-search {
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    outline: none;
    font-size: 14px;
  }

  .feed-content {
    padding: 40px;
    display: grid;
    gap: 34px;
  }

  .feed-mobile-categories {
    display: none;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 6px;
  }

  .mobile-category-chip {
    flex: 0 0 auto;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid rgba(201, 168, 76, 0.15);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-muted);
    font-size: 12px;
  }

  .mobile-category-chip.active {
    color: var(--gold);
    background: rgba(201, 168, 76, 0.12);
    border-color: rgba(201, 168, 76, 0.3);
  }

  .feed-intro {
    max-width: 780px;
  }

  .feed-intro h2 {
    font-family: var(--font-display);
    font-size: clamp(44px, 6vw, 70px);
    line-height: 0.98;
    color: var(--text);
    margin-bottom: 20px;
  }

  .feed-intro h2 span {
    color: var(--gold);
    font-style: italic;
  }

  .feed-intro-copy {
    max-width: 700px;
    color: rgba(232, 230, 240, 0.72);
    font-size: 22px;
    line-height: 1.6;
  }

  .featured-card {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(280px, 360px);
    gap: 28px;
    padding: 28px;
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background:
      linear-gradient(180deg, rgba(12, 15, 24, 0.98), rgba(10, 12, 19, 0.96)),
      radial-gradient(circle at top right, rgba(201, 168, 76, 0.14), transparent 44%);
    box-shadow: inset 0 0 0 1px rgba(201, 168, 76, 0.04);
  }

  .featured-copy {
    display: grid;
    gap: 22px;
    align-content: start;
  }

  .featured-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .featured-pill,
  .featured-tag,
  .feed-card-type,
  .feed-card-category {
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .featured-pill {
    color: var(--gold);
    background: rgba(201, 168, 76, 0.16);
    border: 1px solid rgba(201, 168, 76, 0.28);
  }

  .featured-tag {
    color: rgba(232, 230, 240, 0.72);
    background: rgba(255, 255, 255, 0.04);
  }

  .featured-tag.subtle {
    color: rgba(232, 230, 240, 0.52);
  }

  .featured-copy h3 {
    font-family: var(--font-display);
    font-size: clamp(34px, 4vw, 56px);
    line-height: 1.02;
    color: #ffffff;
  }

  .featured-copy p {
    max-width: 640px;
    color: rgba(232, 230, 240, 0.76);
    font-size: 20px;
    line-height: 1.65;
  }

  .featured-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
  }

  .featured-stats {
    display: grid;
    gap: 6px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .featured-stats strong {
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
  }

  .featured-media-shell {
    position: relative;
    border: 0;
    border-radius: 24px;
    overflow: hidden;
    min-height: 320px;
    background: rgba(255, 255, 255, 0.04);
  }

  .featured-media,
  .feed-card-media {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .featured-media.placeholder,
  .feed-card-media.placeholder {
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at top, rgba(201, 168, 76, 0.18), transparent 42%),
      linear-gradient(180deg, rgba(16, 19, 30, 1), rgba(10, 12, 19, 1));
    color: rgba(232, 230, 240, 0.62);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .featured-media-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(5, 6, 15, 0.02), rgba(5, 6, 15, 0.26));
    pointer-events: none;
  }

  .feed-section {
    display: grid;
    gap: 22px;
    scroll-margin-top: 140px;
  }

  .feed-section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    padding-top: 6px;
  }

  .feed-section-heading h3 {
    font-family: var(--font-display);
    font-size: clamp(32px, 4vw, 44px);
    line-height: 1.02;
    color: var(--text);
  }

  .feed-section-meta {
    color: var(--text-muted);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding-bottom: 8px;
  }

  .feed-card-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
  }

  .feed-card {
    min-width: 0;
  }

  .feed-card-button {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 24px;
    background: rgba(12, 15, 24, 0.92);
    padding: 16px;
    display: grid;
    gap: 16px;
    text-align: left;
    transition: var(--transition);
  }

  .feed-card-button:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--card-accent) 50%, rgba(255, 255, 255, 0.08));
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
  }

  .feed-card-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
  }

  .feed-card-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .feed-card-type {
    color: var(--card-accent);
    background: color-mix(in srgb, var(--card-accent) 14%, transparent);
  }

  .feed-card-category {
    color: rgba(232, 230, 240, 0.56);
    background: rgba(255, 255, 255, 0.03);
  }

  .feed-card-votes {
    color: rgba(232, 230, 240, 0.62);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding-top: 6px;
  }

  .feed-card-media-shell {
    aspect-ratio: 16 / 10;
    border-radius: 18px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.03);
  }

  .feed-card-body {
    display: grid;
    gap: 10px;
  }

  .feed-card-body h4 {
    font-family: var(--font-display);
    font-size: clamp(28px, 2.2vw, 38px);
    line-height: 1.04;
    color: #ffffff;
  }

  .feed-card-body p {
    color: rgba(232, 230, 240, 0.72);
    font-size: 16px;
    line-height: 1.6;
  }

  .feed-card-footer {
    display: grid;
    gap: 8px;
    padding-top: 2px;
  }

  .feed-card-action {
    color: var(--card-accent);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .feed-card-footnote {
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.5;
  }

  .feed-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
  }

  .metric-card {
    padding: 22px 24px;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(12, 15, 24, 0.72);
    display: grid;
    gap: 10px;
  }

  .metric-card p {
    color: var(--text-dim);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .metric-card strong {
    font-family: var(--font-display);
    font-size: 48px;
    line-height: 1;
    color: var(--gold);
    font-weight: 600;
  }

  .metric-card span {
    color: rgba(232, 230, 240, 0.68);
    font-size: 14px;
    line-height: 1.6;
  }

  .metric-card.teal strong {
    color: var(--teal);
  }

  @media (max-width: 1240px) {
    .feed-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .feed-shell {
      grid-template-columns: 1fr;
    }

    .feed-sidebar {
      display: none;
    }

    .feed-topbar {
      top: 60px;
      padding: 16px 20px;
      flex-direction: column;
      align-items: stretch;
    }

    .feed-tabs {
      overflow-x: auto;
      flex-wrap: nowrap;
      padding-bottom: 2px;
    }

    .feed-topbar-actions {
      justify-content: space-between;
    }

    .feed-search-shell {
      min-width: 0;
      flex: 1;
    }

    .feed-content {
      padding: 24px 20px 40px;
    }

    .feed-mobile-categories {
      display: flex;
    }

    .featured-card {
      grid-template-columns: 1fr;
    }

    .featured-media-shell {
      order: -1;
      min-height: 240px;
    }

    .feed-section-heading {
      flex-direction: column;
      align-items: start;
    }

    .feed-metrics {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .feed-search-shell {
      display: none;
    }

    .topbar-primary-action {
      width: 100%;
    }

    .feed-intro h2 {
      font-size: 42px;
    }

    .feed-intro-copy {
      font-size: 17px;
    }

    .featured-copy h3,
    .feed-card-body h4 {
      font-size: 34px;
    }

    .featured-copy p {
      font-size: 17px;
    }

    .feed-card-grid {
      grid-template-columns: 1fr;
    }
  }
`
