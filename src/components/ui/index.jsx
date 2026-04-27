import { useState } from 'react'

const BUTTON_VARIANTS = {
  primary:   { background: 'linear-gradient(135deg, var(--gold), #a8882e)', border: 'none', color: '#05060F' },
  secondary: { background: 'none', border: '1px solid var(--gold-border)', color: 'var(--gold)' },
  teal:      { background: 'none', border: '1px solid var(--teal-border)', color: 'var(--teal)' },
  ghost:     { background: 'none', border: 'none', color: 'var(--text-muted)' },
  danger:    { background: 'none', border: '1px solid var(--red-border)', color: 'var(--red)' },
}

export function Button({ children, variant = 'primary', size = 'md', fullWidth = false, disabled = false, loading = false, onClick, style = {}, ...props }) {
  const [hovered, setHovered] = useState(false)
  const sizeStyles = {
    sm: { padding: '6px 14px',  fontSize: 12, borderRadius: 'var(--radius-sm)' },
    md: { padding: '10px 20px', fontSize: 14, borderRadius: 'var(--radius)'    },
    lg: { padding: '14px 28px', fontSize: 16, borderRadius: 'var(--radius)'    },
    xl: { padding: '16px 32px', fontSize: 17, borderRadius: 'var(--radius)'    },
  }
  const variantStyle = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variantStyle,
        ...sizeStyles[size],
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'var(--transition)',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: hovered && variant === 'primary' && !disabled ? '0 4px 20px rgba(201,168,76,0.25)' : 'none',
        ...style,
      }}
      {...props}
    >
      {loading ? <LoadingDots /> : children}
    </button>
  )
}

export function Card({ children, teal = false, style = {}, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isClickable = !!onClick
  return (
    <div
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => isClickable && setHovered(false)}
      onClick={onClick}
      style={{
        background: 'rgba(10,12,26,0.8)',
        border: `1px solid ${hovered
          ? (teal ? 'rgba(76,201,168,0.4)' : 'rgba(201,168,76,0.4)')
          : (teal ? 'var(--teal-border)' : 'var(--gold-border)')}`,
        borderRadius: 'var(--radius-lg)',
        backdropFilter: 'blur(16px)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'var(--transition)',
        transform: hovered && isClickable ? 'translateY(-2px)' : 'none',
        boxShadow: hovered && isClickable
          ? (teal ? '0 8px 32px rgba(76,201,168,0.08)' : '0 8px 32px rgba(201,168,76,0.08)')
          : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Badge({ children, color = 'var(--gold)', style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      color, border: `1px solid ${color}44`, background: `${color}12`,
      ...style,
    }}>
      {children}
    </span>
  )
}

const CAT_COLORS = {
  Consumer: '#C9A84C',
  Entertainment: '#D8845C',
  Food: '#E0B85C',
  Health: '#4CC9A8',
  Lifestyle: '#7CCB8A',
  Personality: '#D86FA5',
  Politics: '#C94C4C',
  Relationships: '#E08B8B',
  Spirituality: '#9B6FD8',
  Technology: '#4C8EC9',
  Travel: '#5FB8D6',
}

export function CategoryBadge({ category }) {
  return <Badge color={CAT_COLORS[category] || 'var(--gold)'}>{category}</Badge>
}

const TYPE_META = {
  statement: { label: 'Signal', icon: '◈', color: 'var(--gold)' },
  choice:    { label: 'Decide', icon: '◉', color: 'var(--teal)' },
  ranked:    { label: 'Rank',   icon: '◆', color: '#9B6FD8'     },
}

export function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.statement
  return <Badge color={meta.color}>{meta.icon} {meta.label}</Badge>
}

export function TierBanner({ tier, onAction }) {
  if (tier === 'verified') return null
  const config = {
    guest: {
      text: '👁 Sign in to cast your vote and see full results',
      action: 'Sign in',
      color: 'var(--gold)',
      bg: 'rgba(201,168,76,0.06)',
      border: 'var(--gold-border)',
    },
    registered: {
      text: '✦ Get verified to join the Truth Layer and see verified sentiment',
      action: 'Verify →',
      color: 'var(--teal)',
      bg: 'rgba(76,201,168,0.06)',
      border: 'var(--teal-border)',
    },
  }
  const c = config[tier] || config.guest
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius)', padding: '12px 18px',
      fontSize: 13, color: c.color,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span>{c.text}</span>
      <Button variant="ghost" size="sm" onClick={onAction}
        style={{ border: `1px solid ${c.border}`, color: c.color, whiteSpace: 'nowrap' }}>
        {c.action}
      </Button>
    </div>
  )
}

export function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'currentColor',
          animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: 'inline-block',
        }} />
      ))}
    </span>
  )
}

export function Spinner({ size = 20, color = 'var(--gold)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

export function PageLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: 8 }}>
      <LoadingDots />
    </div>
  )
}

export function EmptyState({ message = 'Nothing here yet.' }) {
  return (
    <div style={{
      textAlign: 'center', padding: '80px 0',
      color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic',
    }}>
      {message}
    </div>
  )
}
