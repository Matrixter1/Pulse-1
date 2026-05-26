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
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
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

function getCuratorName(profile, user) {
  return profile?.display_name || profile?.nickname || user?.email?.split('@')[0] || 'Signal Curator'
}

function getCuratorMeta({ tier, isAdmin }) {
  if (isAdmin) return 'Admin Curator'
  if (tier === 'verified') return 'Verified Curator'
  if (tier === 'registered') return 'Member Curator'
  return 'Guest Access'
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'P'
}

function CategoryGlyph({ category, active }) {
  const stroke = active ? 'var(--gold)' : 'rgba(232, 230, 240, 0.78)'
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 18 18',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  }

  switch (category) {
    case 'Consumer':
      return (
        <svg {...commonProps}>
          <path d="M3.5 5.5H14.5L13.4 13.5H4.6L3.5 5.5Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M6.5 7V5.8C6.5 4.25 7.62 3 9 3C10.38 3 11.5 4.25 11.5 5.8V7" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'Entertainment':
      return (
        <svg {...commonProps}>
          <rect x="2.8" y="4" width="12.4" height="10" rx="1.8" stroke={stroke} strokeWidth="1.6" />
          <path d="M7.2 7.1L11.7 9L7.2 10.9V7.1Z" stroke={stroke} strokeWidth="1.2" fill={stroke} />
        </svg>
      )
    case 'Food':
      return (
        <svg {...commonProps}>
          <path d="M5 3.2V8.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3.4 3.2V6.6C3.4 7.5 4.13 8.22 5.02 8.22C5.9 8.22 6.62 7.5 6.62 6.6V3.2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11.8 3.2C10.64 3.2 9.7 4.47 9.7 6.02V8.2C9.7 9.06 10.4 9.76 11.26 9.76H12.4V14.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'Health':
      return (
        <svg {...commonProps}>
          <path d="M9 14.4C12.6 11.4 14.8 9.3 14.8 6.8C14.8 5.2 13.58 4 12.05 4C10.92 4 9.84 4.65 9.37 5.64C8.9 4.65 7.82 4 6.69 4C5.16 4 3.94 5.2 3.94 6.8C3.94 9.3 6.14 11.4 9 14.4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'Lifestyle':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="6" r="2.1" stroke={stroke} strokeWidth="1.6" />
          <path d="M9 8.5V13.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M5.9 10.2L9 8.7L12.1 10.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'Personality':
      return (
        <svg {...commonProps}>
          <path d="M5.2 5.7C5.2 3.95 6.91 2.6 9.02 2.6C11.13 2.6 12.84 3.95 12.84 5.7C12.84 7.1 11.82 8.28 10.38 8.68V10.1L8.44 9.08" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.1 11.05C6.1 9.95 7.4 9.06 9 9.06C10.6 9.06 11.9 9.95 11.9 11.05C11.9 12.15 10.6 13.04 9 13.04C8.45 13.04 7.94 12.94 7.5 12.77L5.8 13.55L6.22 12.02C6.14 11.72 6.1 11.39 6.1 11.05Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    case 'Politics':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="9" r="5.8" stroke={stroke} strokeWidth="1.6" />
          <path d="M3.9 9H14.1" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9 3.3C10.58 4.78 11.48 6.82 11.48 9C11.48 11.18 10.58 13.22 9 14.7C7.42 13.22 6.52 11.18 6.52 9C6.52 6.82 7.42 4.78 9 3.3Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    case 'Relationships':
      return (
        <svg {...commonProps}>
          <path d="M9 14.4C12.6 11.4 14.8 9.3 14.8 6.8C14.8 5.2 13.58 4 12.05 4C10.92 4 9.84 4.65 9.37 5.64C8.9 4.65 7.82 4 6.69 4C5.16 4 3.94 5.2 3.94 6.8C3.94 9.3 6.14 11.4 9 14.4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'Spirituality':
      return (
        <svg {...commonProps}>
          <path d="M9 2.9C10.78 5.26 12.8 6.83 12.8 9.14C12.8 11.32 11.08 13.1 9 13.1C6.92 13.1 5.2 11.32 5.2 9.14C5.2 6.83 7.22 5.26 9 2.9Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 13.1V15" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6.8 15H11.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'Technology':
      return (
        <svg {...commonProps}>
          <rect x="4.1" y="4.1" width="9.8" height="9.8" rx="1.8" stroke={stroke} strokeWidth="1.6" />
          <path d="M9 1.9V4.1M9 13.9V16.1M1.9 9H4.1M13.9 9H16.1M4.35 4.35L2.8 2.8M13.65 13.65L15.2 15.2M13.65 4.35L15.2 2.8M4.35 13.65L2.8 15.2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'Travel':
      return (
        <svg {...commonProps}>
          <path d="M9 2.5L11.05 6.6L15.6 7.25L12.3 10.4L13.08 14.9L9 12.8L4.92 14.9L5.7 10.4L2.4 7.25L6.95 6.6L9 2.5Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="9" r="5.4" stroke={stroke} strokeWidth="1.6" />
        </svg>
      )
  }
}

export default function Feed() {
  const { user, profile, tier } = useAuth()
  const isAdmin = isAdminUser(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const contentRef = useRef(null)

  const requestedType = ['statement', 'choice', 'ranked'].includes(searchParams.get('type'))
    ? searchParams.get('type')
    : 'all'
  const requestedCategory = CATEGORIES.includes(searchParams.get('category'))
    ? searchParams.get('category')
    : 'All'
  const [activeCategory, setActiveCategory] = useState(requestedCategory)
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
    setActiveCategory(requestedCategory)
  }, [requestedCategory])

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
          .map((question) => titleCase(question.category || ''))
          .filter(Boolean),
      )].sort()

      setCategories(discoveredCategories.length > 0 ? ['All', ...discoveredCategories] : CATEGORIES)

      const queue = [...data]
      if (featuredData && !queue.find((question) => question.id === featuredData.id)) {
        queue.unshift(featuredData)
      }

      const counts = {}
      await Promise.all(
        queue.map(async (question) => {
          const votes = await fetchVotesForQuestion(question.id)
          const type = question.type || 'statement'
          const options = parseOptions(question.options)

          if (type === 'statement') {
            counts[question.id] = {
              all: calcResults(votes),
              verified: calcResults(votes.filter((vote) => vote.is_verified)),
              type,
            }
            return
          }

          if (type === 'choice') {
            counts[question.id] = {
              all: calcChoiceResults(votes, options),
              verified: calcChoiceResults(votes.filter((vote) => vote.is_verified), options),
              type,
            }
            return
          }

          counts[question.id] = {
            all: calcRankedResults(votes, options),
            verified: calcRankedResults(votes.filter((vote) => vote.is_verified), options),
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

  function handleCategoryChange(nextCategory) {
    setActiveCategory(nextCategory)

    const nextParams = new URLSearchParams(searchParams)
    if (nextCategory === 'All') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', nextCategory)
    }
    setSearchParams(nextParams, { replace: true })

    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const allQuestions = useMemo(() => {
    const list = [...questions]
    if (featuredQuestion && !list.find((question) => question.id === featuredQuestion.id)) {
      list.unshift(featuredQuestion)
    }
    return list
  }, [featuredQuestion, questions])

  const filteredQuestions = useMemo(
    () => allQuestions
      .filter((question) => typeMatches(question, activeType))
      .filter((question) => categoryMatches(question, activeCategory)),
    [activeCategory, activeType, allQuestions],
  )

  const heroQuestion =
    filteredQuestions.find((question) => featuredQuestion && question.id === featuredQuestion.id) ||
    filteredQuestions[0] ||
    null

  const gridQuestions = heroQuestion
    ? filteredQuestions.filter((question) => question.id !== heroQuestion.id)
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
  const liveCategoryCount = Math.max(categories.length - 1, 0)
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
        (question) => titleCase(question.category || '') === category,
      ).length
      return accumulator
    }, {}),
    [allQuestions, categories],
  )

  const curatorName = getCuratorName(profile, user)
  const curatorMeta = getCuratorMeta({ tier, isAdmin })
  const curatorInitials = getInitials(curatorName)

  return (
    <div className="page pulse-feed-page">
      <NavBar />
      <style>{feedStyles}</style>

      <div className="feed-shell">
        <aside className="feed-sidebar">
          <div className="sidebar-brand">
            <p className="sidebar-kicker">Signal Curator</p>
            <h1>Intellect</h1>
            <p className="sidebar-copy">
              A sharper home for Signal, Decide, and Rank. Browse by lane or move
              straight to the question pulling you in.
            </p>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">Discovery</p>
            <div className="sidebar-category-list">
              {categories.map((category) => {
                const isActive = category === activeCategory
                const color = category === 'All' ? 'var(--gold)' : (CATEGORY_COLORS[category] || 'var(--gold)')
                return (
                  <button
                    key={category}
                    type="button"
                    className={`sidebar-category ${isActive ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(category)}
                    style={{
                      '--category-accent': color,
                      '--category-accent-rgb':
                        category === 'All'
                          ? '201, 168, 76'
                          : hexToRgb(CATEGORY_COLORS[category] || '#C9A84C'),
                    }}
                  >
                    <span className="sidebar-category-content">
                      <span className="sidebar-category-icon">
                        <CategoryGlyph category={category} active={isActive} />
                      </span>
                      <span className="sidebar-category-name">{category}</span>
                    </span>
                    <span className="sidebar-count">{categoryCounts[category] || 0}</span>
                  </button>
                )
              })}
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
          </div>

          <div className="sidebar-utility-links">
            <button type="button" className="sidebar-secondary-action" onClick={() => navigate('/profile')}>
              Settings
            </button>
            <button type="button" className="sidebar-secondary-action" onClick={() => navigate('/upcoming')}>
              Support
            </button>
            <button type="button" className="sidebar-secondary-action" onClick={() => navigate('/my-pulses')}>
              My Pulses
            </button>
            <button type="button" className="sidebar-secondary-action" onClick={() => navigate('/suggestions')}>
              Suggestions
            </button>
            {isAdmin ? (
              <button type="button" className="sidebar-secondary-action admin" onClick={() => navigate('/admin')}>
                Admin
              </button>
            ) : null}
          </div>

          <div className="sidebar-profile-card">
            <div className="sidebar-profile-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={curatorName} className="sidebar-profile-avatar-image" />
              ) : (
                <span>{curatorInitials}</span>
              )}
            </div>
            <div className="sidebar-profile-copy">
              <strong>{curatorName}</strong>
              <span>{curatorMeta}</span>
            </div>
          </div>
        </aside>

        <div className="feed-main-column">
          <header className="feed-topbar">
            <div className="feed-tabs" role="tablist" aria-label="Feed lanes">
              {TOP_TABS.map((tab) => {
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
              <button type="button" className="feed-tab" onClick={() => navigate('/upcoming')}>
                Upcoming
              </button>
            </div>

            <div className="feed-topbar-actions">
              <div className="feed-search-shell">
                <span className="feed-search-icon" aria-hidden="true" />
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
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`mobile-category-chip ${category === activeCategory ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(category)}
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
                    <div className="feed-section-controls">
                      <span>Sort by popularity</span>
                      <span>Latest first</span>
                    </div>
                  </div>

                  {gridQuestions.length === 0 ? (
                    <EmptyState message="The featured card is carrying this lane for now." />
                  ) : (
                    <div className="feed-card-grid">
                      {gridQuestions.map((question) => (
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
                    body={`${activeQuestionCount} visible in this view right now.`}
                  />
                  <MetricCard
                    label="Curated Topics"
                    value={formatCount(liveCategoryCount)}
                    body="Distinct categories currently represented in the live feed."
                    accent="teal"
                  />
                  <MetricCard
                    label="Verified Layer"
                    value={formatCount(allVisibleVerifiedVotes)}
                    body={`${formatCount(allVisibleVotes)} total votes in view, with verified participation surfaced beside them.`}
                    accent="wide"
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
  const mediaUrl = getFeedMediaUrl(question)
  const totalVotes = counts?.all?.total || 0
  const verifiedVotes = counts?.verified?.total || 0
  const telemetryLabel = totalVotes > 0 ? `${formatCount(totalVotes)} signaling` : 'Awaiting the first signal'

  return (
    <section className="featured-card">
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
          <div className="featured-telemetry">
            <div className="featured-telemetry-copy">
              <span>{telemetryLabel}</span>
              {verifiedVotes > 0 ? <strong>{formatCount(verifiedVotes)} verified</strong> : null}
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="featured-media-shell" onClick={onOpen}>
        {mediaUrl ? (
          <QuestionMedia
            src={mediaUrl}
            alt={question.text}
            variant="hero"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="featured-media placeholder">
            <span>Featured Signal</span>
          </div>
        )}
        <div className="featured-media-overlay" />
        <span className="featured-media-caption">Featured Signal</span>
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
          <span className="feed-card-votes">{formatCount(counts?.all?.total || 0)} votes</span>
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

const feedStyles = `
  .pulse-feed-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 25% 0%, rgba(201, 168, 76, 0.08), transparent 22%),
      radial-gradient(circle at 100% 0%, rgba(76, 201, 168, 0.08), transparent 28%),
      linear-gradient(180deg, #040507 0%, #050608 100%);
  }

  .feed-shell {
    min-height: calc(100vh - 60px);
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .feed-sidebar {
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px 0 18px;
    background: #14181f;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    overflow-y: auto;
  }

  .sidebar-brand h1 {
    font-family: var(--font-display);
    font-size: 54px;
    line-height: 0.88;
    font-weight: 600;
    color: var(--gold);
    margin-bottom: 10px;
  }

  .sidebar-kicker,
  .sidebar-label,
  .feed-kicker,
  .feed-section-kicker {
    font-size: 10px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 12px;
  }

  .sidebar-copy {
    max-width: 220px;
    color: rgba(232, 230, 240, 0.62);
    font-size: 13px;
    line-height: 1.8;
  }

  .sidebar-section {
    display: grid;
    gap: 14px;
  }

  .sidebar-brand,
  .sidebar-section,
  .sidebar-actions,
  .sidebar-utility-links,
  .sidebar-profile-card {
    padding-left: 18px;
    padding-right: 18px;
  }

  .sidebar-category-list {
    display: grid;
    gap: 4px;
  }

  .sidebar-category {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    padding: 12px 14px 12px 18px;
    border-radius: 0;
    border: 0;
    background: transparent;
    color: rgba(232, 230, 240, 0.82);
    transition: var(--transition);
    text-align: left;
  }

  .sidebar-category::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 999px;
    background: transparent;
    transition: var(--transition);
  }

  .sidebar-category.active {
    color: var(--text);
    background: rgba(255, 255, 255, 0.07);
  }

  .sidebar-category.active::before {
    background: var(--category-accent);
  }

  .sidebar-category:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.04);
  }

  .sidebar-category-content {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .sidebar-category-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .sidebar-category-name {
    font-size: 16px;
    font-weight: 500;
  }

  .sidebar-count {
    min-width: 30px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(232, 230, 240, 0.58);
    font-size: 11px;
    text-align: center;
  }

  .sidebar-actions {
    display: grid;
    gap: 10px;
    padding-top: 8px;
  }

  .sidebar-primary-action,
  .topbar-primary-action,
  .featured-cta {
    border: 1px solid rgba(201, 168, 76, 0.42);
    background: linear-gradient(180deg, rgba(201, 168, 76, 0.16), rgba(201, 168, 76, 0.06));
    color: var(--gold);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    border-radius: 14px;
    transition: var(--transition);
  }

  .sidebar-primary-action {
    padding: 16px 18px;
    background: rgba(201, 168, 76, 0.04);
  }

  .topbar-primary-action {
    padding: 14px 20px;
  }

  .featured-cta {
    padding: 18px 24px;
  }

  .sidebar-primary-action:hover,
  .topbar-primary-action:hover,
  .featured-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 30px rgba(201, 168, 76, 0.12);
  }

  .sidebar-utility-links {
    margin-top: auto;
    display: grid;
    gap: 2px;
    padding-top: 6px;
  }

  .sidebar-secondary-action {
    padding: 9px 0;
    border: 0;
    background: none;
    color: rgba(232, 230, 240, 0.6);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-align: left;
  }

  .sidebar-secondary-action.admin {
    color: var(--gold);
  }

  .sidebar-profile-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .sidebar-profile-avatar {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.22), rgba(76, 201, 168, 0.16));
    color: #f7f1db;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .sidebar-profile-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .sidebar-profile-copy {
    display: grid;
    gap: 2px;
  }

  .sidebar-profile-copy strong {
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
  }

  .sidebar-profile-copy span {
    color: var(--gold);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
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
    padding: 16px 34px;
    background: rgba(10, 12, 18, 0.96);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .feed-tabs {
    display: flex;
    align-items: center;
    gap: 22px;
    flex-wrap: wrap;
  }

  .feed-tab {
    position: relative;
    border: 0;
    background: none;
    color: rgba(232, 230, 240, 0.54);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 9px 0;
  }

  .feed-tab.active,
  .feed-tab:hover {
    color: #f0edf8;
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

  .feed-topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .feed-search-shell {
    min-width: min(320px, 38vw);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: 42px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .feed-search-icon {
    width: 12px;
    height: 12px;
    border: 1.5px solid rgba(232, 230, 240, 0.28);
    border-radius: 999px;
    position: relative;
    flex: 0 0 auto;
  }

  .feed-search-icon::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 1.5px;
    border-radius: 999px;
    background: rgba(232, 230, 240, 0.28);
    right: -5px;
    bottom: -3px;
    transform: rotate(45deg);
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
    padding: 26px 34px 44px;
    display: grid;
    gap: 34px;
    background:
      radial-gradient(circle at top left, rgba(201, 168, 76, 0.08), transparent 26%),
      radial-gradient(circle at top right, rgba(76, 201, 168, 0.06), transparent 28%);
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
    max-width: 820px;
    padding-top: 12px;
  }

  .feed-intro h2 {
    font-family: var(--font-display);
    font-size: clamp(54px, 6vw, 76px);
    line-height: 0.92;
    font-weight: 600;
    color: #f3eef9;
    margin-bottom: 22px;
  }

  .feed-intro h2 span {
    color: var(--gold);
    font-style: italic;
  }

  .feed-intro-copy {
    max-width: 760px;
    color: rgba(232, 230, 240, 0.72);
    font-size: 19px;
    line-height: 1.75;
  }

  .featured-card {
    display: grid;
    grid-template-columns: minmax(0, 1.32fr) minmax(240px, 320px);
    gap: 28px;
    align-items: start;
    padding: 28px;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(10, 13, 21, 0.96);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);
  }

  .featured-copy {
    display: grid;
    gap: 20px;
    align-content: start;
  }

  .featured-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .featured-pill,
  .featured-tag,
  .feed-card-type,
  .feed-card-category {
    padding: 5px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .featured-pill {
    color: var(--gold);
    background: rgba(201, 168, 76, 0.16);
    border: 1px solid rgba(201, 168, 76, 0.26);
  }

  .featured-tag {
    color: rgba(232, 230, 240, 0.74);
    background: rgba(255, 255, 255, 0.04);
  }

  .featured-tag.subtle {
    color: rgba(232, 230, 240, 0.46);
  }

  .featured-copy h3 {
    max-width: 680px;
    font-family: var(--font-display);
    font-size: clamp(36px, 4.2vw, 62px);
    line-height: 0.95;
    font-weight: 600;
    color: #f6f2fb;
  }

  .featured-copy p {
    max-width: 580px;
    color: rgba(232, 230, 240, 0.68);
    font-size: 17px;
    line-height: 1.7;
  }

  .featured-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
    padding-top: 8px;
  }

  .featured-telemetry {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .featured-telemetry-dots {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .featured-telemetry-dots span {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  .featured-telemetry-copy {
    display: grid;
    gap: 3px;
  }

  .featured-telemetry-copy span {
    color: rgba(232, 230, 240, 0.44);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .featured-telemetry-copy strong {
    color: var(--text);
    font-size: 16px;
    font-weight: 600;
  }

  .featured-media-shell {
    position: relative;
    border: 0;
    border-radius: 18px;
    overflow: hidden;
    min-height: 168px;
    aspect-ratio: 1 / 0.84;
    background: rgba(255, 255, 255, 0.03);
    align-self: center;
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
    background: linear-gradient(180deg, rgba(5, 6, 15, 0.02), rgba(5, 6, 15, 0.22));
    pointer-events: none;
  }

  .featured-media-caption {
    position: absolute;
    left: 14px;
    bottom: 14px;
    color: var(--gold);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .feed-section {
    display: grid;
    gap: 24px;
    scroll-margin-top: 140px;
  }

  .feed-section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    padding-top: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 18px;
  }

  .feed-section-heading h3 {
    font-family: var(--font-display);
    font-size: clamp(34px, 3.5vw, 50px);
    line-height: 0.98;
    font-weight: 600;
    color: #f3eef9;
  }

  .feed-section-controls {
    display: flex;
    align-items: center;
    gap: 22px;
    padding-bottom: 6px;
    color: rgba(232, 230, 240, 0.58);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .feed-card-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .feed-card {
    min-width: 0;
  }

  .feed-card-button {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 22px;
    background: rgba(10, 13, 21, 0.94);
    padding: 14px;
    display: grid;
    gap: 14px;
    text-align: left;
    transition: var(--transition);
  }

  .feed-card-button:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--card-accent) 45%, rgba(255, 255, 255, 0.08));
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
  }

  .feed-card-header {
    display: flex;
    align-items: center;
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
    color: rgba(232, 230, 240, 0.52);
    background: rgba(255, 255, 255, 0.03);
  }

  .feed-card-votes {
    color: rgba(232, 230, 240, 0.62);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
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
    font-size: clamp(28px, 2.1vw, 40px);
    line-height: 0.98;
    font-weight: 600;
    color: #f5f1fa;
  }

  .feed-card-body p {
    color: rgba(232, 230, 240, 0.7);
    font-size: 15px;
    line-height: 1.68;
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
    grid-template-columns: 1fr 1fr minmax(280px, 1.6fr);
    gap: 20px;
  }

  .metric-card {
    padding: 26px 24px;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(10, 13, 21, 0.88);
    display: grid;
    align-content: start;
    gap: 10px;
    min-height: 164px;
  }

  .metric-card p {
    color: var(--text-dim);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .metric-card strong {
    font-family: var(--font-display);
    font-size: 52px;
    line-height: 0.95;
    font-weight: 600;
    color: var(--gold);
  }

  .metric-card span {
    color: rgba(232, 230, 240, 0.68);
    font-size: 15px;
    line-height: 1.7;
  }

  .metric-card.teal strong {
    color: var(--teal);
  }

  .metric-card.wide strong {
    color: #f3eef9;
    font-size: 34px;
  }

  @media (max-width: 1240px) {
    .feed-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .feed-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metric-card.wide {
      grid-column: 1 / -1;
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
      padding: 22px 20px 40px;
    }

    .feed-mobile-categories {
      display: flex;
    }

    .featured-card {
      grid-template-columns: 1fr;
    }

    .featured-media-shell {
      order: -1;
      max-width: 360px;
      width: 100%;
    }

    .feed-section-heading {
      flex-direction: column;
      align-items: start;
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
      font-size: 16px;
    }

    .featured-copy h3,
    .feed-card-body h4 {
      font-size: 34px;
    }

    .featured-copy p {
      font-size: 16px;
    }

    .feed-card-grid,
    .feed-metrics {
      grid-template-columns: 1fr;
    }
  }
`
