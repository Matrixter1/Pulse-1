import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { Button, CategoryBadge, TypeBadge } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CATEGORIES } from '../constants'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase()

const TYPE_OPTIONS = [
  { value: 'statement', label: 'Statement', icon: '◈' },
  { value: 'choice',    label: 'Choice',    icon: '◉' },
  { value: 'ranked',    label: 'Ranked',    icon: '◆' },
]

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect if not admin (wait for auth to resolve first)
  useEffect(() => {
    if (loading) return
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      navigate('/feed', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading || !user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return null
  }

  return (
    <div className="page">
      <NavBar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(201,168,76,0.08)', border: '1px solid var(--gold-border)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              ⚙ Admin Panel
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Question Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Add new questions and manage existing ones.
          </p>
        </div>

        <AddQuestionForm />
        <ManageQuestions />
      </div>
    </div>
  )
}

// ─── Section 1: Add Question ───────────────────────────────────────────────

function AddQuestionForm() {
  const [type, setType]           = useState('statement')
  const [category, setCategory]   = useState('Consumer')
  const [text, setText]           = useState('')
  const [options, setOptions]     = useState(['', ''])
  const [imageUrl, setImageUrl]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')

  function addOption() {
    if (options.length < 8) setOptions([...options, ''])
  }

  function removeOption(i) {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  function updateOption(i, val) {
    const next = [...options]
    next[i] = val
    setOptions(next)
  }

  function resetForm() {
    setType('statement'); setCategory('Consumer'); setText('')
    setOptions(['', '']); setImageUrl('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')

    const needsOptions = type === 'choice' || type === 'ranked'
    if (needsOptions) {
      const filled = options.filter(o => o.trim())
      if (filled.length < 2) { setError('Add at least 2 options.'); return }
    }

    setSubmitting(true)
    try {
      const payload = {
        text: text.trim(),
        category,
        type,
        options: needsOptions ? options.filter(o => o.trim()) : null,
        image_url: imageUrl.trim() || null,
      }
      const { error: dbErr } = await supabase.from('questions').insert(payload)
      if (dbErr) throw dbErr
      setSuccess(`"${text.slice(0, 50)}${text.length > 50 ? '…' : ''}" added successfully.`)
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const needsOptions = type === 'choice' || type === 'ranked'

  return (
    <div style={{
      background: 'rgba(10,12,26,0.8)', border: '1px solid var(--gold-border)',
      borderRadius: 'var(--radius-lg)', padding: '32px 36px', marginBottom: 28,
    }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--gold)', marginBottom: 24 }}>
        Add New Question
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Type toggle */}
        <div>
          <FieldLabel>Question Type</FieldLabel>
          <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--gold-border)', width: 'fit-content' }}>
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                style={{
                  padding: '9px 22px', border: 'none',
                  background: type === opt.value ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: type === opt.value ? 'var(--gold)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-ui)', fontSize: 13,
                  fontWeight: type === opt.value ? 700 : 400,
                  cursor: 'pointer', transition: 'var(--transition)',
                  borderRight: '1px solid var(--gold-border)',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <FieldLabel>Category</FieldLabel>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={selectStyle}
          >
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Question text */}
        <div>
          <FieldLabel>
            {type === 'statement' ? 'Statement' : 'Question'} Text
          </FieldLabel>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            required
            rows={3}
            placeholder={
              type === 'statement'
                ? 'e.g. "Social media does more harm than good."'
                : type === 'choice'
                  ? 'e.g. "Which platform do you trust most?"'
                  : 'e.g. "Rank these values by personal importance."'
            }
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* Options — Choice / Ranked only */}
        {needsOptions && (
          <div>
            <FieldLabel>Options <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(2–8)</span></FieldLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(201,168,76,0.08)', border: '1px solid var(--gold-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  }}>
                    {type === 'choice' ? String.fromCharCode(65 + i) : i + 1}
                  </div>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    style={{
                      background: 'none', border: 'none',
                      color: options.length <= 2 ? 'var(--text-dim)' : 'var(--red)',
                      cursor: options.length <= 2 ? 'default' : 'pointer',
                      fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0,
                    }}
                    title="Remove option"
                  >
                    ×
                  </button>
                </div>
              ))}
              {options.length < 8 && (
                <button
                  type="button"
                  onClick={addOption}
                  style={{
                    background: 'none', border: '1px dashed var(--gold-border)',
                    color: 'var(--text-muted)', borderRadius: 'var(--radius)',
                    padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                    transition: 'var(--transition)', alignSelf: 'flex-start',
                  }}
                >
                  + Add option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image URL */}
        <div>
          <FieldLabel>Image URL <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional, for future use)</span></FieldLabel>
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        {error   && <Banner color="var(--red)"  bg="var(--red-dim)"  border="var(--red-border)">{error}</Banner>}
        {success && <Banner color="var(--teal)" bg="var(--teal-dim)" border="var(--teal-border)">✓ {success}</Banner>}

        <div>
          <Button type="submit" size="lg" loading={submitting}>
            {type === 'statement' ? '◈ Add Statement' : type === 'choice' ? '◉ Add Choice Question' : '◆ Add Ranked Question'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Section 2: Manage Questions ──────────────────────────────────────────

function ManageQuestions() {
  const [questions, setQuestions]   = useState([])
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading]       = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null) // question id pending confirm
  const [deleting, setDeleting]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: qs }, { data: votes }] = await Promise.all([
        supabase.from('questions').select('*').order('created_at', { ascending: false }),
        supabase.from('votes').select('question_id'),
      ])
      setQuestions(qs || [])
      const counts = {}
      votes?.forEach(v => { counts[v.question_id] = (counts[v.question_id] || 0) + 1 })
      setVoteCounts(counts)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    setDeleting(id)
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id)
      if (error) throw error
      setQuestions(qs => qs.filter(q => q.id !== id))
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  return (
    <div style={{
      background: 'rgba(10,12,26,0.8)', border: '1px solid var(--gold-border)',
      borderRadius: 'var(--radius-lg)', padding: '32px 36px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--gold)' }}>
          Manage Questions
        </h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {questions.length} total
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Loading…
        </div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
          No questions yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 80px 60px 90px 80px',
            gap: 12, padding: '8px 12px',
            fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--text-dim)', fontWeight: 700,
          }}>
            <span>Question</span>
            <span>Category</span>
            <span>Type</span>
            <span style={{ textAlign: 'right' }}>Votes</span>
            <span>Created</span>
            <span></span>
          </div>

          {questions.map(q => (
            <QuestionRow
              key={q.id}
              question={q}
              voteCount={voteCounts[q.id] || 0}
              confirming={confirmDelete === q.id}
              deleting={deleting === q.id}
              onDeleteClick={() => setConfirmDelete(q.id)}
              onConfirm={() => handleDelete(q.id)}
              onCancel={() => setConfirmDelete(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionRow({ question, voteCount, confirming, deleting, onDeleteClick, onConfirm, onCancel }) {
  const truncated = question.text.length > 60
    ? question.text.slice(0, 60) + '…'
    : question.text

  const date = new Date(question.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: '2-digit',
  })

  return (
    <div style={{
      background: confirming ? 'rgba(201,76,76,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${confirming ? 'var(--red-border)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 'var(--radius)',
      transition: 'var(--transition)',
    }}>
      {/* Main row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 80px 60px 90px 80px',
        gap: 12, padding: '13px 12px', alignItems: 'center',
      }}>
        <span style={{
          fontSize: 13, color: 'var(--text)',
          fontStyle: question.type === 'statement' ? 'italic' : 'normal',
          lineHeight: 1.4,
        }} title={question.text}>
          {question.type === 'statement' ? `"${truncated}"` : truncated}
        </span>

        <span><CategoryBadge category={question.category} /></span>

        <span><TypeBadge type={question.type || 'statement'} /></span>

        <span style={{ fontSize: 13, textAlign: 'right', fontWeight: voteCount > 0 ? 600 : 400, color: voteCount > 0 ? 'var(--text)' : 'var(--text-dim)' }}>
          {voteCount}
        </span>

        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</span>

        <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!confirming && (
            <button
              onClick={onDeleteClick}
              style={{
                background: 'none', border: '1px solid var(--red-border)',
                color: 'var(--red)', padding: '4px 10px', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', transition: 'var(--transition)',
              }}
            >
              Delete
            </button>
          )}
        </span>
      </div>

      {/* Confirmation row */}
      {confirming && (
        <div style={{
          padding: '10px 12px 13px',
          borderTop: '1px solid var(--red-border)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: 'var(--red)', flex: 1 }}>
            ⚠ Delete this question? All {voteCount} vote{voteCount !== 1 ? 's' : ''} will be permanently removed.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-muted)', padding: '5px 14px', borderRadius: 6,
              fontSize: 12, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={deleting} style={{
              background: 'var(--red)', border: 'none', color: '#fff',
              padding: '5px 14px', borderRadius: 6, fontSize: 12,
              fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block', marginBottom: 8,
      fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--text-muted)', fontWeight: 600,
    }}>
      {children}
    </label>
  )
}

function Banner({ children, color, bg, border }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 'var(--radius-sm)',
      fontSize: 13, color, background: bg, border: `1px solid ${border}`,
    }}>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  width: 'auto',
  minWidth: 200,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A7896' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
}
