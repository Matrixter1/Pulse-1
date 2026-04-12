import { useState } from 'react'
import { REASON_CHIPS } from '../../constants'
import { bucketLabel } from '../../lib/data'
import { Button } from '../ui'

function sliderColor(v) {
  if (v <= 50) {
    const t = v / 50
    return `rgb(201,${Math.round(76 + (168 - 76) * t)},76)`
  } else {
    const t = (v - 50) / 50
    return `rgb(${Math.round(201 + (76 - 201) * t)},${Math.round(168 + (201 - 168) * t)},${Math.round(76 + (168 - 76) * t)})`
  }
}

export default function StatementVote({ onSubmit, submitting, canVote }) {
  const [value, setValue] = useState(50)
  const [reason, setReason] = useState(null)
  const color = sliderColor(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="glass" style={{ padding: '36px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 6vw, 48px)',
            fontWeight: 700,
            color,
            transition: 'color var(--transition-fast)',
            lineHeight: 1,
            marginBottom: 6,
          }}>
            {bucketLabel(value)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Position: <span style={{ color, fontWeight: 600 }}>{value}</span> / 100
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="range" min={0} max={100} value={value}
            onChange={e => setValue(Number(e.target.value))}
            style={{
              width: '100%', height: 6, appearance: 'none',
              background: 'linear-gradient(to right, #C94C4C 0%, #C9A84C 50%, #4CC9A8 100%)',
              borderRadius: 3, cursor: 'pointer', outline: 'none',
            }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%;
              background: ${color}; border: 3px solid var(--bg);
              box-shadow: 0 0 12px ${color}88; cursor: pointer;
              transition: background var(--transition-fast);
            }
            input[type=range]::-moz-range-thumb {
              width: 24px; height: 24px; border-radius: 50%;
              background: ${color}; border: 3px solid var(--bg); cursor: pointer;
            }
          `}</style>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <span style={{ color: '#C94C4C' }}>Disagree</span>
          <span style={{ color: 'var(--gold)' }}>Neutral</span>
          <span style={{ color: 'var(--teal)' }}>Agree</span>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Optional: Primary reason
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REASON_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setReason(reason === chip ? null : chip)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${reason === chip ? 'var(--gold)' : 'rgba(201,168,76,0.15)'}`,
                background: reason === chip ? 'var(--gold-dim)' : 'transparent',
                color: reason === chip ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: 12, cursor: 'pointer', transition: 'var(--transition)',
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <Button
        fullWidth size="xl"
        variant={canVote ? 'primary' : 'secondary'}
        loading={submitting}
        onClick={() => onSubmit({ spectrumValue: value, reason })}
        style={canVote ? { background: `linear-gradient(135deg, ${color}, ${color}99)`, color: '#05060F' } : {}}
      >
        {!canVote ? 'Sign in to Reveal the Signal' : '◈ Reveal the Signal →'}
      </Button>
    </div>
  )
}
