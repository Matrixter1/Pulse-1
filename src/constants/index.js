export const CATEGORIES = [
  'All',
  'Consumer',
  'Entertainment',
  'Food',
  'Health',
  'Lifestyle',
  'Personality',
  'Politics',
  'Relationships',
  'Spirituality',
  'Technology',
  'Travel',
]

export const CATEGORY_COLORS = {
  Consumer: '#C9A84C',
  Entertainment: '#D8845C',
  Food: '#E0B85C',
  Health: '#4CC9A8',
  Lifestyle: '#7CCB8A',
  Personality: '#D86FA5',
  Spirituality: '#9B6FD8',
  Politics: '#C94C4C',
  Relationships: '#E08B8B',
  Technology: '#4C8EC9',
  Travel: '#5FB8D6',
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
