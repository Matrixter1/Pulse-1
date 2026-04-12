import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { Button, CategoryBadge, TypeBadge } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CATEGORIES } from '../constants'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase()

const TYPE_OPTIONS = [
  { value: 'statement', label: 'Signal', icon: '◈' },
  { value: 'choice',    label: 'Decide', icon: '◉' },
  { value: 'ranked',    label: 'Rank',   icon: '◆' },
]

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

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
  const [type, setType]         = useState('statement')
  const [category, setCategory] = useState('Consumer')
  const [text, setText]         = useState('')
  const [options, setOptions]   = useState(['', ''])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  // Reveal visibility state
  const [revealMode, setRevealMode]           = useState('instant')
  const [revealThreshold, setRevealThreshold] = useState('')
  const [revealDate, setRevealDate]           = useState('')

  // Image state — lifted here so handleSubmit can access file
  const [imageMode, setImageMode]       = useState('upload') // 'upload' | 'url'
  const [imageFile, setImageFile]       = useState(null)     // File object
  const [imagePreview, setImagePreview] = useState('')       // object URL or pasted URL
  const [imageUrlInput, setImageUrlInput] = useState('')     // pasted URL string
  const [uploading, setUploading]       = useState(false)

  function addOption()         { if (options.length < 8) setOptions([...options, '']) }
  function removeOption(i)     { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)) }
  function updateOption(i, val){ const n = [...options]; n[i] = val; setOptions(n) }

  function handleImageModeSwitch(mode) {
    setImageMode(mode)
    setImageFile(null)
    setImagePreview('')
    setImageUrlInput('')
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handlePasteFile(file) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  useEffect(() => {
    function handleGlobalPaste(e) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
          break
        }
      }
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [])

  function handleUrlInput(val) {
    setImageUrlInput(val)
    setImagePreview(val.trim())
  }

  function resetForm() {
    setType('statement'); setCategory('Consumer'); setText(''); setOptions(['', ''])
    setImageMode('upload'); setImageFile(null); setImagePreview(''); setImageUrlInput('')
    setRevealMode('instant'); setRevealThreshold(''); setRevealDate('')
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
    let resolvedImageUrl = null

    try {
      // Upload file to Supabase Storage if one was selected
      if (imageMode === 'upload' && imageFile) {
        setUploading(true)
        const ext  = imageFile.name.split('.').pop()
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('question-images')
          .upload(name, imageFile, { contentType: imageFile.type, upsert: false })
        if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`)
        const { data: { publicUrl } } = supabase.storage
          .from('question-images')
          .getPublicUrl(name)
        resolvedImageUrl = publicUrl
        setUploading(false)
      } else if (imageMode === 'url' && imageUrlInput.trim()) {
        resolvedImageUrl = imageUrlInput.trim()
      }
      // If neither — image_url stays null (fully optional)

      const payload = {
        text: text.trim(),
        category,
        type,
        options: needsOptions ? options.filter(o => o.trim()) : null,
        ...(resolvedImageUrl ? { image_url: resolvedImageUrl } : {}),
        reveal_mode: revealMode,
        reveal_threshold: revealMode === 'threshold' && revealThreshold ? parseInt(revealThreshold) : null,
        reveal_date: revealMode === 'date' && revealDate ? new Date(revealDate).toISOString() : null,
      }

      const { error: dbErr } = await supabase.from('questions').insert(payload)
      if (dbErr) throw dbErr

      setSuccess(`"${text.slice(0, 50)}${text.length > 50 ? '…' : ''}" added successfully.`)
      resetForm()
    } catch (err) {
      setUploading(false)
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
          <div style={{ display: 'flex', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--gold-border)', width: 'fit-content' }}>
            {TYPE_OPTIONS.map((opt, i) => (
              <button key={opt.value} type="button" onClick={() => setType(opt.value)} style={{
                padding: '9px 22px', border: 'none',
                borderRight: i < TYPE_OPTIONS.length - 1 ? '1px solid var(--gold-border)' : 'none',
                background: type === opt.value ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: type === opt.value ? 'var(--gold)' : 'var(--text-muted)',
                fontFamily: 'var(--font-ui)', fontSize: 13,
                fontWeight: type === opt.value ? 700 : 400,
                cursor: 'pointer', transition: 'var(--transition)',
              }}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <FieldLabel>Category</FieldLabel>
          <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Question text */}
        <div>
          <FieldLabel>{type === 'statement' ? 'Statement' : 'Question'} Text</FieldLabel>
          <textarea
            value={text} onChange={e => setText(e.target.value)} required rows={3}
            placeholder={
              type === 'statement' ? 'e.g. "Social media does more harm than good."'
                : type === 'choice' ? 'e.g. "Which platform do you trust most?"'
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
                    type="text" value={opt} onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`} style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="button" onClick={() => removeOption(i)} disabled={options.length <= 2}
                    style={{
                      background: 'none', border: 'none',
                      color: options.length <= 2 ? 'var(--text-dim)' : 'var(--red)',
                      cursor: options.length <= 2 ? 'default' : 'pointer',
                      fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0,
                    }}
                  >×</button>
                </div>
              ))}
              {options.length < 8 && (
                <button type="button" onClick={addOption} style={{
                  background: 'none', border: '1px dashed var(--gold-border)',
                  color: 'var(--text-muted)', borderRadius: 'var(--radius)',
                  padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                  transition: 'var(--transition)', alignSelf: 'flex-start',
                }}>
                  + Add option
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image picker */}
        <ImagePicker
          mode={imageMode}
          file={imageFile}
          preview={imagePreview}
          urlInput={imageUrlInput}
          uploading={uploading}
          onModeSwitch={handleImageModeSwitch}
          onFileChange={handleFileChange}
          onUrlChange={handleUrlInput}
          onClear={() => { setImageFile(null); setImagePreview(''); setImageUrlInput('') }}
          onPasteFile={handlePasteFile}
        />

        {/* Results Visibility */}
        <VisibilityPicker
          mode={revealMode}
          threshold={revealThreshold}
          date={revealDate}
          onModeChange={setRevealMode}
          onThresholdChange={setRevealThreshold}
          onDateChange={setRevealDate}
        />

        {error   && <Banner color="var(--red)"  bg="var(--red-dim)"  border="var(--red-border)">{error}</Banner>}
        {success && <Banner color="var(--teal)" bg="var(--teal-dim)" border="var(--teal-border)">✓ {success}</Banner>}

        <div>
          <Button type="submit" size="lg" loading={submitting}>
            {uploading
              ? 'Uploading image…'
              : type === 'statement' ? '◈ Add Signal'
              : type === 'choice'   ? '◉ Add Decision'
              :                       '◆ Add Ranking'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── Image Picker component ────────────────────────────────────────────────

function ImagePicker({ mode, file, preview, urlInput, uploading, onModeSwitch, onFileChange, onUrlChange, onClear, onPasteFile }) {
  const fileInputRef = useRef(null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <FieldLabel>
          Image <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
        </FieldLabel>
        {/* Mode toggle pills */}
        <div style={{
          display: 'flex', gap: 0,
          border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, overflow: 'hidden',
        }}>
          {[['upload', '↑ Upload'], ['url', '⊕ Paste URL']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => onModeSwitch(val)} style={{
              padding: '4px 14px', border: 'none', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.05em', cursor: 'pointer', transition: 'var(--transition)',
              background: mode === val ? 'rgba(201,168,76,0.15)' : 'transparent',
              color: mode === val ? 'var(--gold)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'upload' ? (
        <div>
          {/* Drop zone / file button */}
          <div
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onPaste={e => {
              const items = e.clipboardData?.items
              if (!items) return
              for (const item of items) {
                if (item.type.startsWith('image/')) {
                  const f = item.getAsFile()
                  if (f && onPasteFile) onPasteFile(f)
                  break
                }
              }
            }}
            style={{
              border: `1px dashed ${file ? 'var(--gold-border)' : 'rgba(201,168,76,0.2)'}`,
              borderRadius: 'var(--radius)',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'rgba(201,168,76,0.04)' : 'transparent',
              transition: 'var(--transition)',
              outline: 'none',
            }}
          >
            {file ? (
              <div style={{ fontSize: 13, color: 'var(--gold)' }}>
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.4 }}>↑</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Click to select · or paste from clipboard (Ctrl+V)
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  JPG, PNG, GIF, WEBP
                </div>
                <div style={{
                  marginTop: 8, fontSize: 11, color: 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <kbd style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4, padding: '1px 6px', fontSize: 10,
                    fontFamily: 'monospace', color: 'var(--text-muted)',
                  }}>Ctrl+V</kbd>
                  <span style={{ color: 'var(--text-dim)' }}>to paste from clipboard</span>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <input
          type="text"
          value={urlInput}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="https://media.giphy.com/... or any image URL"
          style={inputStyle}
        />
      )}

      {/* Preview */}
      {preview && (
        <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="Preview"
            onError={e => { e.target.style.display = 'none' }}
            style={{
              maxHeight: 160, maxWidth: '100%', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--gold-border)', display: 'block',
              opacity: uploading ? 0.5 : 1, transition: 'opacity 0.2s',
            }}
          />
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(5,6,15,0.6)', fontSize: 12, color: 'var(--gold)',
            }}>
              Uploading…
            </div>
          )}
          <button
            type="button"
            onClick={onClear}
            style={{
              position: 'absolute', top: -8, right: -8,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--surface2)', border: '1px solid var(--gold-border)',
              color: 'var(--text-muted)', fontSize: 14, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Remove image"
          >×</button>
        </div>
      )}
    </div>
  )
}

// ─── Section 2: Manage Questions ──────────────────────────────────────────

function ManageQuestions() {
  const [questions, setQuestions]         = useState([])
  const [voteCounts, setVoteCounts]       = useState({})
  const [loading, setLoading]             = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]           = useState(null)
  const [featuring, setFeaturing]         = useState(null)
  const [featureSuccess, setFeatureSuccess] = useState('')

  // Edit state
  const [editingId, setEditingId]           = useState(null)
  const [editText, setEditText]             = useState('')
  const [editImageFile, setEditImageFile]   = useState(null)
  const [editImageUrl, setEditImageUrl]     = useState('')
  const [editImageMode, setEditImageMode]   = useState('upload')
  const [editImagePreview, setEditImagePreview] = useState('')
  const [editSaving, setEditSaving]         = useState(false)
  const [editSuccess, setEditSuccess]       = useState('')
  const [editRevealMode, setEditRevealMode]           = useState('instant')
  const [editRevealThreshold, setEditRevealThreshold] = useState('')
  const [editRevealDate, setEditRevealDate]           = useState('')

  useEffect(() => {
    function handleGlobalPaste(e) {
      if (!editingId) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)) }
          break
        }
      }
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [editingId])

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

  function openEdit(question) {
    setEditingId(question.id)
    setEditText(question.text)
    setEditImageUrl(question.image_url || '')
    setEditImagePreview(question.image_url || '')
    setEditImageFile(null)
    setEditImageMode('upload')
    setEditRevealMode(question.reveal_mode || 'instant')
    setEditRevealThreshold(question.reveal_threshold != null ? String(question.reveal_threshold) : '')
    setEditRevealDate(question.reveal_date ? new Date(question.reveal_date).toISOString().slice(0, 16) : '')
    setConfirmDelete(null)
  }

  function closeEdit() {
    setEditingId(null)
    setEditText('')
    setEditImageFile(null)
    setEditImageUrl('')
    setEditImagePreview('')
    setEditRevealMode('instant')
    setEditRevealThreshold('')
    setEditRevealDate('')
  }

  async function handleSaveEdit(question) {
    setEditSaving(true)
    try {
      let resolvedImageUrl = editImageUrl || null

      if (editImageMode === 'upload' && editImageFile) {
        const ext  = editImageFile.name.split('.').pop()
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('question-images')
          .upload(name, editImageFile, { contentType: editImageFile.type, upsert: false })
        if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`)
        const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(name)
        resolvedImageUrl = publicUrl
      }

      const { error } = await supabase
        .from('questions')
        .update({
          text: editText.trim(),
          image_url: resolvedImageUrl,
          reveal_mode: editRevealMode,
          reveal_threshold: editRevealMode === 'threshold' && editRevealThreshold ? parseInt(editRevealThreshold) : null,
          reveal_date: editRevealMode === 'date' && editRevealDate ? new Date(editRevealDate).toISOString() : null,
        })
        .eq('id', question.id)
      if (error) throw error

      await load()
      closeEdit()
      setEditSuccess('✓ Question updated')
      setTimeout(() => setEditSuccess(''), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleFeature(id, text) {
    setFeaturing(id)
    try {
      // Unfeature all, then feature this one
      await supabase.from('questions').update({ featured: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('questions').update({ featured: true }).eq('id', id)
      await load()
      const label = text.length > 50 ? text.slice(0, 50) + '…' : text
      setFeatureSuccess(`✓ "${label}" set as Pulse of the Day`)
      setTimeout(() => setFeatureSuccess(''), 5000)
    } catch (err) {
      console.error(err)
    } finally {
      setFeaturing(null)
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
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{questions.length} total</span>
      </div>

      {(featureSuccess || editSuccess) && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
          fontSize: 13, color: 'var(--gold)',
        }}>
          {featureSuccess || editSuccess}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>No questions yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 80px 60px 90px 230px',
            gap: 12, padding: '8px 12px',
            fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'var(--text-dim)', fontWeight: 700,
          }}>
            <span>Question</span><span>Category</span><span>Type</span>
            <span style={{ textAlign: 'right' }}>Votes</span><span>Created</span><span></span>
          </div>
          {questions.map(q => (
            <QuestionRow
              key={q.id} question={q} voteCount={voteCounts[q.id] || 0}
              confirming={confirmDelete === q.id} deleting={deleting === q.id}
              featuring={featuring === q.id}
              editing={editingId === q.id}
              editText={editText}
              editImageMode={editImageMode}
              editImageFile={editImageFile}
              editImagePreview={editImagePreview}
              editImageUrl={editImageUrl}
              editSaving={editSaving}
              editRevealMode={editRevealMode}
              editRevealThreshold={editRevealThreshold}
              editRevealDate={editRevealDate}
              onDeleteClick={() => { closeEdit(); setConfirmDelete(q.id) }}
              onConfirm={() => handleDelete(q.id)}
              onCancel={() => setConfirmDelete(null)}
              onFeature={() => handleFeature(q.id, q.text)}
              onEditClick={() => editingId === q.id ? closeEdit() : openEdit(q)}
              onEditTextChange={setEditText}
              onEditImageModeSwitch={mode => {
                setEditImageMode(mode)
                setEditImageFile(null)
                setEditImagePreview(editImageUrl)
              }}
              onEditFileChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                setEditImageFile(file)
                setEditImagePreview(URL.createObjectURL(file))
              }}
              onEditUrlChange={val => { setEditImageUrl(val); setEditImagePreview(val) }}
              onEditClear={() => { setEditImageFile(null); setEditImageUrl(''); setEditImagePreview('') }}
              onEditRevealModeChange={setEditRevealMode}
              onEditRevealThresholdChange={setEditRevealThreshold}
              onEditRevealDateChange={setEditRevealDate}
              onSave={() => handleSaveEdit(q)}
              onCancelEdit={closeEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionRow({
  question, voteCount, confirming, deleting, featuring,
  editing, editText, editImageMode, editImageFile, editImagePreview, editImageUrl, editSaving,
  editRevealMode, editRevealThreshold, editRevealDate,
  onDeleteClick, onConfirm, onCancel, onFeature,
  onEditClick, onEditTextChange, onEditImageModeSwitch, onEditFileChange, onEditUrlChange, onEditClear,
  onEditRevealModeChange, onEditRevealThresholdChange, onEditRevealDateChange,
  onSave, onCancelEdit,
}) {
  const editFileRef = useRef(null)
  const truncated = question.text.length > 60 ? question.text.slice(0, 60) + '…' : question.text
  const date = new Date(question.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
  const isFeatured = !!question.featured

  return (
    <div style={{
      background: editing ? 'rgba(201,168,76,0.05)' : isFeatured ? 'rgba(201,168,76,0.04)' : confirming ? 'rgba(201,76,76,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${editing ? 'var(--gold-border)' : isFeatured ? 'rgba(201,168,76,0.25)' : confirming ? 'var(--red-border)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 'var(--radius)', transition: 'var(--transition)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 60px 90px 230px', gap: 12, padding: '13px 12px', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontStyle: question.type === 'statement' ? 'italic' : 'normal', lineHeight: 1.4 }} title={question.text}>
          {isFeatured && <span style={{ fontSize: 10, color: 'var(--gold)', marginRight: 5 }}>★</span>}
          {question.type === 'statement' ? `"${truncated}"` : truncated}
        </span>
        <span><CategoryBadge category={question.category} /></span>
        <span><TypeBadge type={question.type || 'statement'} /></span>
        <span style={{ fontSize: 13, textAlign: 'right', fontWeight: voteCount > 0 ? 600 : 400, color: voteCount > 0 ? 'var(--text)' : 'var(--text-dim)' }}>
          {voteCount}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</span>
        <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {!confirming && (
            <button
              onClick={onEditClick}
              title={editing ? 'Cancel edit' : 'Edit this question'}
              style={{
                background: editing ? 'rgba(201,168,76,0.15)' : 'none',
                border: '1px solid var(--gold-border)', color: 'var(--gold)',
                padding: '4px 8px', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', transition: 'var(--transition)', whiteSpace: 'nowrap',
              }}
            >
              {editing ? '✎ Editing' : '✎ Edit'}
            </button>
          )}
          {!confirming && (
            <button
              onClick={onFeature}
              disabled={featuring || isFeatured}
              title={isFeatured ? 'Currently featured' : 'Set as Pulse of the Day'}
              style={{
                background: isFeatured ? 'rgba(201,168,76,0.18)' : 'none',
                border: `1px solid ${isFeatured ? 'var(--gold-border)' : 'rgba(201,168,76,0.3)'}`,
                color: 'var(--gold)',
                padding: '4px 8px', borderRadius: 6, fontSize: 12,
                cursor: isFeatured || featuring ? 'default' : 'pointer',
                opacity: featuring ? 0.6 : 1,
                transition: 'var(--transition)', whiteSpace: 'nowrap',
              }}
            >
              {isFeatured ? '★ Featured' : featuring ? '…' : '☆ Feature'}
            </button>
          )}
          {!confirming && !editing && (
            <button onClick={onDeleteClick} style={{
              background: 'none', border: '1px solid var(--red-border)', color: 'var(--red)',
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'var(--transition)',
            }}>Delete</button>
          )}
        </span>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div style={{ padding: '18px 16px 20px', borderTop: '1px solid var(--gold-border)' }}>
          {/* Text */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 7 }}>
              Question Text
            </label>
            <textarea
              value={editText}
              onChange={e => onEditTextChange(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Image */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Image <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div style={{ display: 'flex', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, overflow: 'hidden' }}>
                {[['upload', '↑ Upload'], ['url', '⊕ Paste URL']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => onEditImageModeSwitch(val)} style={{
                    padding: '4px 14px', border: 'none', fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.05em', cursor: 'pointer', transition: 'var(--transition)',
                    background: editImageMode === val ? 'rgba(201,168,76,0.15)' : 'transparent',
                    color: editImageMode === val ? 'var(--gold)' : 'var(--text-dim)',
                    fontFamily: 'var(--font-ui)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {editImageMode === 'upload' ? (
              <div
                tabIndex={0}
                onClick={() => editFileRef.current?.click()}
                onPaste={e => {
                  const items = e.clipboardData?.items
                  if (!items) return
                  for (const item of items) {
                    if (item.type.startsWith('image/')) {
                      const f = item.getAsFile()
                      if (f) { onEditFileChange({ target: { files: [f] } }) }
                      break
                    }
                  }
                }}
                style={{
                  border: `1px dashed ${editImageFile ? 'var(--gold-border)' : 'rgba(201,168,76,0.2)'}`,
                  borderRadius: 'var(--radius)', padding: '14px', textAlign: 'center', cursor: 'pointer',
                  background: editImageFile ? 'rgba(201,168,76,0.04)' : 'transparent',
                  outline: 'none',
                }}
              >
                {editImageFile ? (
                  <span style={{ fontSize: 12, color: 'var(--gold)' }}>
                    <strong>{editImageFile.name}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({(editImageFile.size / 1024).toFixed(0)} KB)</span>
                  </span>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Click to select · or paste from clipboard (Ctrl+V)
                    </div>
                    <div style={{
                      marginTop: 8, fontSize: 11, color: 'var(--text-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <kbd style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4, padding: '1px 6px', fontSize: 10,
                        fontFamily: 'monospace', color: 'var(--text-muted)',
                      }}>Ctrl+V</kbd>
                      <span style={{ color: 'var(--text-dim)' }}>to paste from clipboard</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={editImageUrl}
                onChange={e => onEditUrlChange(e.target.value)}
                placeholder="https://... image URL"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
              />
            )}
            <input ref={editFileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*" onChange={onEditFileChange} style={{ display: 'none' }} />

            {/* Preview */}
            {editImagePreview && (
              <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                <img
                  src={editImagePreview} alt="Preview"
                  onError={e => { e.target.style.display = 'none' }}
                  style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gold-border)', display: 'block' }}
                />
                <button
                  type="button" onClick={onEditClear}
                  style={{
                    position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--surface2)', border: '1px solid var(--gold-border)',
                    color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            )}
          </div>

          {/* Results Visibility */}
          <div style={{ marginBottom: 18 }}>
            <VisibilityPicker
              mode={editRevealMode}
              threshold={editRevealThreshold}
              date={editRevealDate}
              onModeChange={onEditRevealModeChange}
              onThresholdChange={onEditRevealThresholdChange}
              onDateChange={onEditRevealDateChange}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onSave} disabled={editSaving || !editText.trim()}
              style={{
                background: 'linear-gradient(135deg, var(--gold), #a8882e)',
                border: 'none', color: '#05060F',
                padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: editSaving || !editText.trim() ? 'not-allowed' : 'pointer',
                opacity: editSaving || !editText.trim() ? 0.6 : 1,
              }}
            >
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={onCancelEdit}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div style={{ padding: '10px 12px 13px', borderTop: '1px solid var(--red-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--red)', flex: 1 }}>
            ⚠ Delete this question? All {voteCount} vote{voteCount !== 1 ? 's' : ''} will be permanently removed.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={deleting} style={{ background: 'var(--red)', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Visibility Picker ─────────────────────────────────────────────────────

const REVEAL_MODES = [
  { value: 'instant',   label: 'Instant' },
  { value: 'threshold', label: 'Vote Threshold' },
  { value: 'date',      label: 'Reveal Date' },
]

function VisibilityPicker({ mode, threshold, date, onModeChange, onThresholdChange, onDateChange }) {
  return (
    <div>
      <FieldLabel>Results Visibility</FieldLabel>
      {/* Three-pill toggle */}
      <div style={{
        display: 'flex', borderRadius: 'var(--radius)', overflow: 'hidden',
        border: '1px solid rgba(201,168,76,0.2)', width: 'fit-content', marginBottom: 14,
      }}>
        {REVEAL_MODES.map((opt, i) => (
          <button key={opt.value} type="button" onClick={() => onModeChange(opt.value)} style={{
            padding: '8px 18px', border: 'none',
            borderRight: i < REVEAL_MODES.length - 1 ? '1px solid rgba(201,168,76,0.2)' : 'none',
            background: mode === opt.value ? 'rgba(201,168,76,0.15)' : 'transparent',
            color: mode === opt.value ? 'var(--gold)' : 'var(--text-muted)',
            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: mode === opt.value ? 700 : 400,
            cursor: 'pointer', transition: 'var(--transition)', whiteSpace: 'nowrap',
          }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Threshold input */}
      {mode === 'threshold' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Reveal results after
            </label>
            <input
              type="number" min={2} max={10000} value={threshold}
              onChange={e => onThresholdChange(e.target.value)}
              placeholder="e.g. 50"
              style={{ ...inputStyle, width: 100 }}
            />
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>votes</label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Results stay blurred until this many people have voted
          </div>
        </div>
      )}

      {/* Date input */}
      {mode === 'date' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Reveal results on
            </label>
            <input
              type="datetime-local" value={date}
              onChange={e => onDateChange(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
            A live countdown will show until this date
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
      {children}
    </label>
  )
}

function Banner({ children, color, bg, border }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, color, background: bg, border: `1px solid ${border}` }}>
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
  width: 'auto', minWidth: 200, cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A7896' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
}
