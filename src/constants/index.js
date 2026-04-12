export const CATEGORIES = ['All', 'Consumer', 'Health', 'Spirituality', 'Politics', 'Technology']

export const CATEGORY_COLORS = {
  Consumer: '#C9A84C',
  Health: '#4CC9A8',
  Spirituality: '#9B6FD8',
  Politics: '#C94C4C',
  Technology: '#4C8EC9',
}

export const QUESTION_TYPES = { STATEMENT: 'statement', CHOICE: 'choice', RANKED: 'ranked' }

export const QUESTION_TYPE_META = {
  statement: { label: 'Signal', icon: '◈', color: 'var(--gold)', description: 'Your position on the spectrum.' },
  choice:    { label: 'Decide', icon: '◉', color: 'var(--teal)', description: 'One choice. No middle ground.' },
  ranked:    { label: 'Rank',   icon: '◆', color: '#9B6FD8',    description: 'Your order. Your truth.' },
}

export const REASON_CHIPS = [
  'Personal experience', 'Scientific evidence', 'Moral principle', 'Economic reasoning',
  'Cultural values', 'Historical precedent', 'Future concern', 'Religious belief',
]

export const TIER_META = {
  guest:      { label: 'Guest',    icon: '👁', color: 'var(--text-muted)' },
  registered: { label: 'Member',   icon: '✦',  color: 'var(--gold)'       },
  verified:   { label: 'Verified', icon: '◈',  color: 'var(--teal)'       },
}
