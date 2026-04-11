import { useState, useRef } from 'react'
import { Button } from '../ui'

const RANK_COLORS = ['#C9A84C', '#9B6FD8', '#4C8EC9', '#4CC9A8', '#7A7896']

export default function RankedVote({ options = [], onSubmit, submitting, canVote }) {
  const [items, setItems] = useState([...options])
  const dragIndex = useRef(null)
  const dragOverIndex = useRef(null)

  function handleDragStart(e, index) {
    dragIndex.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    dragOverIndex.current = index
  }

  function handleDrop(e) {
    e.preventDefault()
    const from = dragIndex.current
    const to = dragOverIndex.current
    if (from === null || to === null || from === to) return
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setItems(reordered)
    dragIndex.current = null
    dragOverIndex.current = null
  }

  function moveItem(index, direction) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const newItems = [...items]
    ;[newItems[index], newItems[target]] = [newItems[target], newItems[index]]
    setItems(newItems)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center' }}>
        Drag to reorder · #1 = most important
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, index) => (
          <div
            key={item}
            draggable
            onDragStart={e => handleDragStart(e, index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={handleDrop}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px', borderRadius: 'var(--radius)',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(10,12,26,0.7)',
              cursor: 'grab', userSelect: 'none',
              transition: 'var(--transition)',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `${RANK_COLORS[index] || 'var(--text-dim)'}22`,
              border: `2px solid ${RANK_COLORS[index] || 'var(--text-dim)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800,
              color: RANK_COLORS[index] || 'var(--text-dim)',
              flexShrink: 0,
            }}>
              {index + 1}
            </div>

            <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{item}</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => moveItem(index, -1)} disabled={index === 0}
                style={{ background: 'none', border: 'none', color: index === 0 ? 'var(--text-dim)' : 'var(--text-muted)', cursor: index === 0 ? 'default' : 'pointer', padding: '2px 4px', fontSize: 10, lineHeight: 1 }}>▲</button>
              <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}
                style={{ background: 'none', border: 'none', color: index === items.length - 1 ? 'var(--text-dim)' : 'var(--text-muted)', cursor: index === items.length - 1 ? 'default' : 'pointer', padding: '2px 4px', fontSize: 10, lineHeight: 1 }}>▼</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.3, cursor: 'grab' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 16, height: 2, background: 'var(--text-muted)', borderRadius: 1 }} />)}
            </div>
          </div>
        ))}
      </div>

      <Button
        fullWidth size="xl"
        variant={canVote ? 'primary' : 'secondary'}
        loading={submitting}
        onClick={() => onSubmit({ rankedValues: items })}
        style={canVote ? { background: 'linear-gradient(135deg, #9B6FD8, #7a50c0)', color: '#fff', border: 'none' } : {}}
      >
        {!canVote ? 'Sign in to Vote' : '◆ Submit Your Ranking'}
      </Button>
    </div>
  )
}
