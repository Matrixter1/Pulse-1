import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { Button, PageLoading } from '../components/ui'
import { useAuth } from '../lib/auth'
import {
  fetchSuggestions,
  submitSuggestion,
  toggleUpvote,
  fetchUserUpvotedIds,
  deleteSuggestion,
} from '../lib/data'

const PAGE_SIZE = 20

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function TierBadge({ tier }) {
  const cfg = {
    registered: { label: 'Member', color: 'var(--gold)' },
    verified:   { label: 'Verified', color: 'var(--teal)' },
    guest:      { label: 'Guest', color: 'var(--text-muted)' },
  }
  const c = cfg[tier] || cfg.guest
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: c.color, border: `1px solid ${c.color}44`, borderRadius: 10, padding: '1px 6px',
    }}>
      {tier === 'verified' && '✓ '}{c.label}
    </span>
  )
}

function SuggestionCard({ suggestion, isOwn, isUpvoted, onUpvote, onDelete, canUpvote, tier }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [upvoteAnim, setUpvoteAnim] = useState(false)

  async function handleUpvote() {
    if (!canUpvote) return
    setUpvoteAnim(true)
    setTimeout(() => setUpvoteAnim(false), 300)
    await onUpvote(suggestion.id, isUpvoted)
  }

  return (
    <div style={{
      background: 'rgba(10,12,26,0.8)',
      border: '1px solid rgba(201,168,76,0.12)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
      transition: 'border-color var(--transition)',
    }}>
      {/* Upvote */}
      <button
        onClick={handleUpvote}
        title={tier === 'guest' ? 'Sign in to upvote' : isUpvoted ? 'Remove upvote' : 'Upvote'}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          background: isUpvoted ? 'var(--gold-dim)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUpvoted ? 'var(--gold-border)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, padding: '8px 10px',
          color: isUpvoted ? 'var(--gold)' : 'var(--text-muted)',
          cursor: canUpvote ? 'pointer' : 'default',
          transition: 'all var(--transition)',
          transform: upvoteAnim ? 'scale(1.15)' : 'scale(1)',
          minWidth: 44, flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14 }}>▲</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{suggestion.upvotes}</span>
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 10 }}>
          {suggestion.text}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {suggestion.users?.display_name || suggestion.users?.nickname || 'Anonymous'}
          </span>
          {suggestion.users?.tier && <TierBadge tier={suggestion.users.tier} />}
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            · {timeAgo(suggestion.created_at)}
          </span>
        </div>
      </div>

      {/* Delete (own suggestions) */}
      {isOwn && (
        <div style={{ flexShrink: 0 }}>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delete?</span>
              <button
                onClick={() => onDelete(suggestion.id)}
                style={{
                  background: 'var(--red-dim)', border: '1px solid var(--red-border)',
                  borderRadius: 8, padding: '3px 8px',
                  color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '3px 8px',
                  color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
                }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-dim)', fontSize: 16, cursor: 'pointer',
                padding: 4, lineHeight: 1,
              }}
              title="Delete suggestion"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Suggestions() {
  const { user, tier, profile, updateProfile } = useAuth()
  const canSuggest = tier === 'registered' || tier === 'verified'
  const canUpvote = tier === 'registered' || tier === 'verified'

  const [suggestions, setSuggestions] = useState([])
  const [upvotedIds, setUpvotedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  // Submit form state
  const [submitText, setSubmitText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Nickname state
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState('')
  const publicDisplayName = profile?.display_name || profile?.nickname
  const hasNickname = !!publicDisplayName

  // Guest upvote nudge
  const [showUpvoteNudge, setShowUpvoteNudge] = useState(false)

  useEffect(() => {
    setNicknameInput(profile?.display_name || profile?.nickname || '')
  }, [profile?.display_name, profile?.nickname])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const data = await fetchSuggestions({ limit: PAGE_SIZE, offset: 0 })
        setSuggestions(data)
        setPage(1)
        setHasMore(data.length === PAGE_SIZE)
        if (user) {
          const ids = await fetchUserUpvotedIds(user.id)
          setUpvotedIds(ids)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      const data = await fetchSuggestions({ limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      setSuggestions(prev => [...prev, ...data])
      setPage(p => p + 1)
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleNicknameSave(e) {
    if (e) e.preventDefault()
    if (!nicknameInput.trim() || nicknameInput.trim().length < 2) {
      setNicknameError('Name must be at least 2 characters.')
      return
    }
    setNicknameError('')
    setNicknameSaving(true)
    try {
      await updateProfile({ displayName: nicknameInput.trim() })
    } catch (err) {
      setNicknameError('Failed to save. Try again.')
    } finally {
      setNicknameSaving(false)
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!hasNickname || submitText.trim().length < 10 || !user) return
    setSubmitError('')
    setSubmitting(true)
    try {
      const newSuggestion = await submitSuggestion(submitText.trim(), user.id)
      setSubmitDone(true)
      setSubmitText('')
      // Prepend with user info for immediate display
      const withUser = {
        ...newSuggestion,
        users: { display_name: publicDisplayName || 'Anonymous', tier },
      }
      setSuggestions(prev => [withUser, ...prev])
      setTimeout(() => setSubmitDone(false), 4000)
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpvote(suggestionId, alreadyUpvoted) {
    if (!canUpvote) { setShowUpvoteNudge(true); setTimeout(() => setShowUpvoteNudge(false), 3000); return }
    try {
      await toggleUpvote(suggestionId, user.id, alreadyUpvoted)
      setUpvotedIds(prev => {
        const next = new Set(prev)
        if (alreadyUpvoted) next.delete(suggestionId)
        else next.add(suggestionId)
        return next
      })
      setSuggestions(prev => prev.map(s =>
        s.id === suggestionId
          ? { ...s, upvotes: s.upvotes + (alreadyUpvoted ? -1 : 1) }
          : s
      ))
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(suggestionId) {
    try {
      await deleteSuggestion(suggestionId)
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="page">
      <NavBar />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '44px 20px 100px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 600, color: 'var(--text)', marginBottom: 8,
          }}>
            Community Suggestions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            Ideas from our community. Members and Verified users can suggest and upvote.
          </p>
        </div>

        {/* Guest banner */}
        {tier === 'guest' && (
          <div style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius)', padding: '14px 18px',
            marginBottom: 36, fontSize: 13, color: 'var(--gold)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          }}>
            <span>Sign in as Member to submit ideas and upvote</span>
            <Link to="/splash">
              <Button variant="secondary" size="sm">Sign in →</Button>
            </Link>
          </div>
        )}

        {/* Guest upvote nudge */}
        {showUpvoteNudge && (
          <div style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius)', padding: '10px 16px',
            marginBottom: 20, fontSize: 13, color: 'var(--gold)',
          }}>
            <Link to="/splash" style={{ color: 'var(--gold)', fontWeight: 700 }}>Sign in</Link>
            {' '}to upvote suggestions.
          </div>
        )}

        {/* Submit section */}
        {canSuggest && (
          <div style={{
            background: 'rgba(10,12,26,0.8)',
            border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 28px',
            marginBottom: 44,
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20, fontWeight: 600, color: 'var(--gold)', marginBottom: 20,
            }}>
              Submit an Idea
            </h3>

            {/* Nickname gate */}
            {!hasNickname ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Set a display name first — it'll appear with your suggestion.
                </p>
                <form onSubmit={handleNicknameSave} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    placeholder="Your display name…"
                    maxLength={30}
                    style={{
                      flex: '1 1 200px',
                      background: 'rgba(5,6,15,0.8)',
                      border: `1px solid ${nicknameError ? 'var(--red-border)' : 'var(--gold-border)'}`,
                      borderRadius: 'var(--radius)',
                      color: 'var(--text)', padding: '10px 14px',
                      fontFamily: 'var(--font-ui)', fontSize: 14, outline: 'none',
                    }}
                  />
                  <Button
                    size="md"
                    loading={nicknameSaving}
                    disabled={!nicknameInput.trim() || nicknameInput.trim().length < 2}
                    onClick={handleNicknameSave}
                  >
                    Set Name
                  </Button>
                </form>
                {nicknameError && (
                  <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{nicknameError}</p>
                )}
              </div>
            ) : (
              /* Suggestion form */
              <form onSubmit={handleSubmit}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Posting as <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{publicDisplayName}</span>
                </div>
                <textarea
                  value={submitText}
                  onChange={e => { setSubmitText(e.target.value); setSubmitError('') }}
                  placeholder="Describe your idea for Pulse… (10–500 characters)"
                  maxLength={500}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(5,6,15,0.8)',
                    border: `1px solid ${submitError ? 'var(--red-border)' : 'var(--gold-border)'}`,
                    borderRadius: 'var(--radius)',
                    color: 'var(--text)', padding: '12px 16px',
                    fontFamily: 'var(--font-ui)', fontSize: 14,
                    resize: 'vertical', minHeight: 100, marginBottom: 10,
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 12,
                      color: submitText.length > 480 ? 'var(--red)' : 'var(--text-dim)',
                    }}>
                      {submitText.length}/500
                    </span>
                    {submitError && (
                      <span style={{ fontSize: 12, color: 'var(--red)' }}>{submitError}</span>
                    )}
                    {submitDone && (
                      <span style={{ fontSize: 12, color: 'var(--teal)' }}>✓ Submitted!</span>
                    )}
                  </div>
                  <Button
                    size="md"
                    loading={submitting}
                    disabled={submitText.trim().length < 10}
                    onClick={handleSubmit}
                  >
                    Submit Suggestion
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Suggestions list */}
        {loading ? (
          <PageLoading />
        ) : suggestions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic',
          }}>
            No suggestions yet. Be the first to share an idea.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {suggestions.map(s => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  isOwn={user && s.user_id === user.id}
                  isUpvoted={upvotedIds.has(s.id)}
                  onUpvote={handleUpvote}
                  onDelete={handleDelete}
                  canUpvote={canUpvote}
                  tier={tier}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center' }}>
                <Button
                  variant="secondary"
                  size="md"
                  loading={loadingMore}
                  onClick={handleLoadMore}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
