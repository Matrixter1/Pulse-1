import { useState } from 'react'
import { Button } from '../ui'

export default function ChoiceVote({ options = [], onSubmit, submitting, canVote }) {
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((option, idx) => {
          const isSelected = selected === option
          return (
            <button
              key={idx}
              onClick={() => setSelected(isSelected ? null : option)}
              style={{
                width: '100%', padding: '18px 24px', borderRadius: 'var(--radius)',
                border: `1px solid ${isSelected ? 'var(--teal)' : 'var(--gold-border)'}`,
                background: isSelected ? 'rgba(76,201,168,0.1)' : 'rgba(10,12,26,0.6)',
                color: isSelected ? 'var(--teal)' : 'var(--text)',
                fontSize: 15, fontWeight: isSelected ? 700 : 400,
                textAlign: 'left', cursor: 'pointer',
                transition: 'all var(--transition)',
                display: 'flex', alignItems: 'center', gap: 14,
                transform: isSelected ? 'translateX(4px)' : 'none',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--teal)' : 'var(--text-dim)'}`,
                background: isSelected ? 'var(--teal)' : 'transparent',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--transition)',
              }}>
                {isSelected && <span style={{ fontSize: 10, color: '#05060F', fontWeight: 900 }}>✓</span>}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                color: isSelected ? 'var(--teal)' : 'var(--text-dim)',
                textTransform: 'uppercase',
              }}>
                {String.fromCharCode(65 + idx)}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ fontSize: 13, color: 'var(--teal)', textAlign: 'center', fontStyle: 'italic', opacity: 0.8 }}>
          You selected: <strong>"{selected}"</strong>
        </div>
      )}

      <Button
        fullWidth size="xl"
        variant={canVote && selected ? 'teal' : 'secondary'}
        loading={submitting}
        disabled={!selected}
        onClick={() => onSubmit({ choiceValue: selected })}
        style={canVote && selected ? { background: 'linear-gradient(135deg, var(--teal), #2fa886)', color: '#05060F', border: 'none' } : {}}
      >
        {!canVote ? 'Sign in to Vote' : !selected ? 'Select an option to vote' : '◉ Cast Your Vote'}
      </Button>
    </div>
  )
}
