import { useRef, useState } from 'react'
import { Button } from '../ui'

const RANK_COLORS = ['#C9A84C', '#9B6FD8', '#4C8EC9', '#4CC9A8', '#7A7896']

export default function RankedVote({ options = [], onSubmit, submitting, canVote }) {
  const [items, setItems] = useState([...options])
  const dragIndex = useRef(null)
  const dragOverIndex = useRef(null)
  const touchDrag = useRef(null)

  function commitReorder(from, to) {
    if (from === null || to === null || from === to) return

    setItems(currentItems => {
      const reordered = [...currentItems]
      const [moved] = reordered.splice(from, 1)
      reordered.splice(to, 0, moved)
      return reordered
    })
  }

  function resetDragState() {
    dragIndex.current = null
    dragOverIndex.current = null
    touchDrag.current = null
  }

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
    commitReorder(dragIndex.current, dragOverIndex.current)
    resetDragState()
  }

  function handlePointerDown(e, index) {
    if (e.pointerType === 'mouse') return

    touchDrag.current = { from: index, over: index, pointerId: e.pointerId }
    dragIndex.current = index
    dragOverIndex.current = index
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!touchDrag.current || touchDrag.current.pointerId !== e.pointerId) return

    e.preventDefault()
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-rank-index]')
    if (!target) return

    const nextIndex = Number(target.getAttribute('data-rank-index'))
    if (Number.isNaN(nextIndex)) return

    touchDrag.current.over = nextIndex
    dragOverIndex.current = nextIndex
  }

  function handlePointerEnd(e) {
    if (!touchDrag.current || touchDrag.current.pointerId !== e.pointerId) return

    e.currentTarget.releasePointerCapture?.(e.pointerId)
    commitReorder(touchDrag.current.from, touchDrag.current.over)
    resetDragState()
  }

  function moveItem(index, direction) {
    const target = index + direction
    if (target < 0 || target >= items.length) return

    setItems(currentItems => {
      const nextItems = [...currentItems]
      ;[nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]]
      return nextItems
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        Drag to reorder or use arrows - #1 = most important
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, index) => {
          const isTouchDragging = touchDrag.current?.from === index

          return (
            <div
              key={item}
              data-rank-index={index}
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={handleDrop}
              onPointerDown={e => handlePointerDown(e, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 20px',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(255,255,255,0.07)',
                background: isTouchDragging ? 'rgba(18,22,42,0.95)' : 'rgba(10,12,26,0.7)',
                cursor: 'grab',
                userSelect: 'none',
                transition: 'var(--transition)',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `${RANK_COLORS[index] || 'var(--text-dim)'}22`,
                  border: `2px solid ${RANK_COLORS[index] || 'var(--text-dim)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: RANK_COLORS[index] || 'var(--text-dim)',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{item}</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: index === 0 ? 'var(--text-dim)' : 'var(--text-muted)',
                    cursor: index === 0 ? 'default' : 'pointer',
                    padding: '2px 4px',
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  ^
                </button>
                <button
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: index === items.length - 1 ? 'var(--text-dim)' : 'var(--text-muted)',
                    cursor: index === items.length - 1 ? 'default' : 'pointer',
                    padding: '2px 4px',
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  v
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.3, cursor: 'grab' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{ width: 16, height: 2, background: 'var(--text-muted)', borderRadius: 1 }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Button
        fullWidth
        size="xl"
        variant={canVote ? 'primary' : 'secondary'}
        loading={submitting}
        onClick={() => onSubmit({ rankedValues: items })}
        style={canVote ? { background: 'linear-gradient(135deg, #9B6FD8, #7a50c0)', color: '#fff', border: 'none' } : {}}
      >
        {!canVote ? 'Sign in to Submit Your Truth' : 'Submit Your Truth'}
      </Button>
    </div>
  )
}
