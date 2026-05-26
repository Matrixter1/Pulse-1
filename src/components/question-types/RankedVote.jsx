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

    setItems((currentItems) => {
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

    setItems((currentItems) => {
      const nextItems = [...currentItems]
      ;[nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]]
      return nextItems
    })
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <p
        style={{
          margin: 0,
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Drag to reorder or use arrows. Position #1 carries the most weight.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item, index) => {
          const isTouchDragging = touchDrag.current?.from === index
          const rankColor = RANK_COLORS[index] || 'var(--text-muted)'

          return (
            <div
              key={item}
              data-rank-index={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onPointerDown={(e) => handlePointerDown(e, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 18px 18px 16px',
                borderRadius: 20,
                border: `1px solid ${isTouchDragging ? `${rankColor}66` : 'rgba(255,255,255,0.08)'}`,
                background: isTouchDragging ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                transition: 'var(--transition)',
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `1px solid ${rankColor}`,
                  color: rankColor,
                  background: `${rankColor}14`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Rank position
                </div>
                <div style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.08 }}>
                  {item}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  style={arrowButtonStyle(index === 0)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  style={arrowButtonStyle(index === items.length - 1)}
                >
                  ↓
                </button>
              </div>

              <div style={{ display: 'grid', gap: 4, opacity: 0.34, flexShrink: 0 }}>
                {[0, 1, 2].map((handle) => (
                  <span key={handle} style={{ display: 'block', width: 14, height: 2, borderRadius: 999, background: 'var(--text-muted)' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: 14, justifyItems: 'center', marginTop: 6 }}>
        <Button
          size="xl"
          variant={canVote ? 'primary' : 'secondary'}
          loading={submitting}
          onClick={() => onSubmit({ rankedValues: items })}
          style={canVote ? {
            borderRadius: 999,
            minWidth: 320,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #f2cf5a, #b58b14)',
          } : {
            borderRadius: 999,
            minWidth: 320,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {!canVote ? 'Sign in to vote' : 'Submit ranking'}
        </Button>
      </div>
    </div>
  )
}

function arrowButtonStyle(disabled) {
  return {
    width: 28,
    height: 24,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    color: disabled ? 'rgba(255,255,255,0.24)' : 'var(--text-muted)',
    cursor: disabled ? 'default' : 'pointer',
    padding: 0,
    lineHeight: 1,
  }
}
