import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AuthModal from '../components/AuthModal'
import QuestionMedia from '../components/QuestionMedia'
import { PageLoading, CategoryBadge, TypeBadge, Button } from '../components/ui'
import RankedVote from '../components/question-types/RankedVote'
import { fetchQuestion, submitVote, hasUserVoted } from '../lib/data'
import { useAuth } from '../lib/auth'
import { CATEGORIES, CATEGORY_COLORS } from '../constants'

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

function titleCase(value) {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getCuratorName(profile, user) {
  return profile?.display_name || profile?.nickname || user?.email?.split('@')[0] || 'Signal Curator'
}

function getCuratorMeta(tier) {
  if (tier === 'verified') return 'Verified Curator'
  if (tier === 'registered') return 'Member Curator'
  return 'Guest Access'
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'P'
}

function CategoryGlyph({ category, active }) {
  const stroke = active ? 'var(--gold)' : 'rgba(232, 230, 240, 0.78)'
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 18 18',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
  }

  switch (category) {
    case 'Consumer':
      return (
        <svg {...commonProps}>
          <path d="M3.5 5.5H14.5L13.4 13.5H4.6L3.5 5.5Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M6.5 7V5.8C6.5 4.25 7.62 3 9 3C10.38 3 11.5 4.25 11.5 5.8V7" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'Entertainment':
      return (
        <svg {...commonProps}>
          <rect x="2.8" y="4" width="12.4" height="10" rx="1.8" stroke={stroke} strokeWidth="1.6" />
          <path d="M7.2 7.1L11.7 9L7.2 10.9V7.1Z" stroke={stroke} strokeWidth="1.2" fill={stroke} />
        </svg>
      )
    case 'Food':
      return (
        <svg {...commonProps}>
          <path d="M5 3.2V8.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3.4 3.2V6.6C3.4 7.5 4.13 8.22 5.02 8.22C5.9 8.22 6.62 7.5 6.62 6.6V3.2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11.8 3.2C10.64 3.2 9.7 4.47 9.7 6.02V8.2C9.7 9.06 10.4 9.76 11.26 9.76H12.4V14.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'Health':
      return (
        <svg {...commonProps}>
          <path d="M9 14.4C12.6 11.4 14.8 9.3 14.8 6.8C14.8 5.2 13.58 4 12.05 4C10.92 4 9.84 4.65 9.37 5.64C8.9 4.65 7.82 4 6.69 4C5.16 4 3.94 5.2 3.94 6.8C3.94 9.3 6.14 11.4 9 14.4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'Lifestyle':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="6" r="2.1" stroke={stroke} strokeWidth="1.6" />
          <path d="M9 8.5V13.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M5.9 10.2L9 8.7L12.1 10.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'Personality':
      return (
        <svg {...commonProps}>
          <path d="M5.2 5.7C5.2 3.95 6.91 2.6 9.02 2.6C11.13 2.6 12.84 3.95 12.84 5.7C12.84 7.1 11.82 8.28 10.38 8.68V10.1L8.44 9.08" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.1 11.05C6.1 9.95 7.4 9.06 9 9.06C10.6 9.06 11.9 9.95 11.9 11.05C11.9 12.15 10.6 13.04 9 13.04C8.45 13.04 7.94 12.94 7.5 12.77L5.8 13.55L6.22 12.02C6.14 11.72 6.1 11.39 6.1 11.05Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    case 'Politics':
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="9" r="5.8" stroke={stroke} strokeWidth="1.6" />
          <path d="M3.9 9H14.1" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9 3.3C10.58 4.78 11.48 6.82 11.48 9C11.48 11.18 10.58 13.22 9 14.7C7.42 13.22 6.52 11.18 6.52 9C6.52 6.82 7.42 4.78 9 3.3Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    case 'Relationships':
      return (
        <svg {...commonProps}>
          <path d="M9 14.4C12.6 11.4 14.8 9.3 14.8 6.8C14.8 5.2 13.58 4 12.05 4C10.92 4 9.84 4.65 9.37 5.64C8.9 4.65 7.82 4 6.69 4C5.16 4 3.94 5.2 3.94 6.8C3.94 9.3 6.14 11.4 9 14.4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'Spirituality':
      return (
        <svg {...commonProps}>
          <path d="M9 2.9C10.78 5.26 12.8 6.83 12.8 9.14C12.8 11.32 11.08 13.1 9 13.1C6.92 13.1 5.2 11.32 5.2 9.14C5.2 6.83 7.22 5.26 9 2.9Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 13.1V15" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6.8 15H11.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'Technology':
      return (
        <svg {...commonProps}>
          <rect x="4.1" y="4.1" width="9.8" height="9.8" rx="1.8" stroke={stroke} strokeWidth="1.6" />
          <path d="M9 1.9V4.1M9 13.9V16.1M1.9 9H4.1M13.9 9H16.1M4.35 4.35L2.8 2.8M13.65 13.65L15.2 15.2M13.65 4.35L15.2 2.8M4.35 13.65L2.8 15.2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'Travel':
      return (
        <svg {...commonProps}>
          <path d="M9 2.5L11.05 6.6L15.6 7.25L12.3 10.4L13.08 14.9L9 12.8L4.92 14.9L5.7 10.4L2.4 7.25L6.95 6.6L9 2.5Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="9" r="5.4" stroke={stroke} strokeWidth="1.6" />
        </svg>
      )
  }
}

const OPTION_INSIGHT_LIBRARY = [
  ['artificial general intelligence', 'AI that could reason and act across many tasks at or beyond human level, rather than being limited to one narrow job.'],
  ['genetic engineering', 'Directly changing genes in humans, animals, or crops to alter traits, capabilities, or biology.'],
  ['neural interfaces', 'Technology that connects the brain or nervous system directly to computers, devices, or networks.'],
  ['brain-computer interface', 'Technology that connects the brain or nervous system directly to computers, devices, or networks.'],
  ['global surveillance grids', 'Large-scale systems that track populations through cameras, sensors, biometrics, data collection, or network monitoring.'],
  ['surveillance', 'Systems that track people through cameras, sensors, biometrics, data collection, or network monitoring.'],
  ['quantum computing', 'A new kind of computing that uses quantum physics and could solve some problems far faster than today\'s machines.'],
  ['synthetic biology', 'Designing or building new biological systems, rather than only editing the ones that already exist.'],
  ['nanotechnology', 'Engineering matter at an extremely small scale so materials or machines behave in new ways.'],
  ['autonomous weapons', 'Weapons that can identify, track, or strike targets with little or no direct human control.'],
  ['digital minds', 'Software-based minds or mind copies that could think, remember, or act like a person.'],
  ['longevity', 'Technologies aimed at slowing aging, extending lifespan, or keeping people healthy for much longer.'],
]

const SIGNAL_DRIVER_OPTIONS = ['Experience', 'Evidence', 'Instinct', 'Pattern', 'Belief']

const QUESTION_DETAIL_STYLES = `
  .question-screen-shell {
    min-height: calc(100vh - 60px);
    display: grid;
    grid-template-columns: 238px minmax(0, 1fr);
  }

  .question-sidebar {
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 18px 0 18px;
    background: #14181f;
    border-right: 1px solid rgba(255,255,255,0.05);
    overflow-y: auto;
  }

  .question-sidebar-brand,
  .question-sidebar-section,
  .question-sidebar-actions,
  .question-sidebar-profile {
    padding-left: 18px;
    padding-right: 18px;
  }

  .question-sidebar-brand h2 {
    margin: 0 0 10px;
    font-family: var(--font-display);
    font-size: 42px;
    line-height: 0.9;
    color: var(--gold);
  }

  .question-sidebar-kicker,
  .question-sidebar-label {
    font-size: 10px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
    margin: 0 0 12px;
  }

  .question-sidebar-copy {
    max-width: 206px;
    color: rgba(232, 230, 240, 0.58);
    font-size: 11px;
    line-height: 1.65;
    margin: 0;
  }

  .question-sidebar-category-list {
    display: grid;
    gap: 2px;
  }

  .question-sidebar-category {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    width: 100%;
    padding: 10px 14px 10px 18px;
    background: transparent;
    border: 0;
    color: rgba(232, 230, 240, 0.76);
    text-align: left;
    transition: var(--transition);
  }

  .question-sidebar-category::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 999px;
    background: transparent;
    transition: var(--transition);
  }

  .question-sidebar-category.active {
    color: var(--text);
    background: rgba(255,255,255,0.07);
  }

  .question-sidebar-category.active::before {
    background: var(--category-accent);
  }

  .question-sidebar-category:hover {
    color: var(--text);
    background: rgba(255,255,255,0.04);
  }

  .question-sidebar-category-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .question-sidebar-category-name {
    font-size: 14px;
    font-weight: 500;
  }

  .question-sidebar-actions {
    display: grid;
    gap: 10px;
    padding-top: 6px;
  }

  .question-sidebar-primary {
    min-height: 48px;
    border: 1px solid rgba(201,168,76,0.4);
    border-radius: 14px;
    background: rgba(201,168,76,0.04);
    color: var(--gold);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    transition: var(--transition);
  }

  .question-sidebar-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 30px rgba(201,168,76,0.12);
  }

  .question-sidebar-profile {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .question-sidebar-avatar {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, rgba(201,168,76,0.22), rgba(76,201,168,0.16));
    color: #f7f1db;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .question-sidebar-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .question-sidebar-profile-copy {
    display: grid;
    gap: 2px;
  }

  .question-sidebar-profile-copy strong {
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
  }

  .question-sidebar-profile-copy span {
    color: var(--gold);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .question-screen-main {
    min-width: 0;
  }

  .question-detail-shell {
    max-width: 1160px;
    margin: 0 auto;
    display: grid;
    gap: 20px;
  }

  .question-main-grid {
    display: grid;
    grid-template-columns: minmax(300px, 0.76fr) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }

  .question-preview-stage {
    position: relative;
    min-height: 250px;
    height: clamp(250px, 34vh, 360px);
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    background:
      radial-gradient(circle at top, rgba(201, 168, 76, 0.08), transparent 42%),
      linear-gradient(180deg, rgba(13, 18, 33, 0.9), rgba(8, 10, 18, 0.98));
    box-shadow: 0 20px 48px rgba(0,0,0,0.28);
  }

  .question-preview-glow {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(0,0,0,0.02), transparent 42%, rgba(4,6,12,0.72));
  }

  .question-header {
    text-align: left;
    display: grid;
    gap: 8px;
    max-width: 860px;
  }

  .question-eyebrow {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    font-weight: 800;
  }

  .question-heading {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(34px, 3.8vw, 54px);
    line-height: 1.01;
    letter-spacing: -0.03em;
    color: var(--text);
    max-width: 920px;
  }

  .question-heading em {
    font-style: italic;
    font-weight: 500;
  }

  .question-subcopy {
    max-width: 620px;
    margin: 0;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.52;
  }

  .question-meta-strip {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .question-panel {
    background:
      linear-gradient(180deg, rgba(19, 25, 38, 0.86), rgba(15, 20, 31, 0.9));
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 26px;
    box-shadow: 0 18px 48px rgba(0,0,0,0.22);
  }

  .question-footnote {
    display: flex;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .question-link-row {
    display: flex;
    justify-content: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .question-inline-link {
    color: var(--gold);
    text-decoration: none;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .question-inline-link:hover {
    opacity: 0.86;
  }

  .question-option-grid,
  .question-stack {
    display: grid;
    gap: 12px;
  }

  .question-option-card {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 22px;
    text-align: left;
    padding: 19px 20px 17px;
    background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.018));
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    color: inherit;
    cursor: pointer;
    transition: var(--transition);
  }

  .question-option-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,0.14);
    background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.024));
  }

  .question-option-card.is-selected {
    background: linear-gradient(180deg, rgba(76,201,168,0.09), rgba(76,201,168,0.03));
    box-shadow: inset 0 0 0 1px currentColor, 0 12px 28px rgba(76,201,168,0.1);
  }

  .question-option-letter {
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .question-option-title {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: clamp(24px, 2.4vw, 34px);
    line-height: 1.04;
    color: var(--text);
  }

  .question-option-description {
    margin: 0;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.5;
    max-width: 620px;
  }

  .question-option-mark {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.14);
    flex-shrink: 0;
    margin-top: 8px;
    transition: var(--transition);
  }

  .question-cta-wrap {
    display: grid;
    gap: 14px;
    justify-items: center;
    margin-top: 6px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .question-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 12px;
    border-radius: 999px;
    outline: none;
    cursor: pointer;
    background: linear-gradient(90deg, #ff9f95 0%, #d6b34d 50%, #5fdfbd 100%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  }

  .question-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--gold);
    border: 6px solid rgba(201,168,76,0.18);
    box-shadow: 0 10px 26px rgba(0,0,0,0.36), 0 0 0 1px rgba(201,168,76,0.42);
  }

  .question-slider::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--gold);
    border: 6px solid rgba(201,168,76,0.18);
    box-shadow: 0 10px 26px rgba(0,0,0,0.36), 0 0 0 1px rgba(201,168,76,0.42);
  }

  .question-driver-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .question-driver-chip {
    min-height: 44px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: var(--transition);
  }

  .question-driver-chip.is-selected {
    background: rgba(201,168,76,0.12);
    border-color: rgba(201,168,76,0.42);
    color: var(--gold);
  }

  .question-panel-compact {
    padding: 20px 20px 20px;
  }

  .question-side-card {
    display: grid;
    gap: 14px;
  }

  @media (max-width: 960px) {
    .question-screen-shell {
      grid-template-columns: 1fr;
    }

    .question-sidebar {
      display: none;
    }

    .question-detail-shell {
      gap: 28px;
    }

    .question-main-grid {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .question-header {
      text-align: center;
      max-width: none;
    }

    .question-heading {
      font-size: clamp(34px, 10vw, 52px);
    }

    .question-subcopy {
      font-size: 16px;
      margin: 0 auto;
    }

    .question-meta-strip {
      justify-content: center;
    }

    .question-preview-stage {
      height: auto;
      min-height: 260px;
    }

    .question-option-card {
      padding: 20px 18px;
      gap: 14px;
    }

    .question-driver-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
`

function humanizeOptionLabel(option) {
  return option
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function deriveOptionInsight(option, type) {
  const normalized = option.toLowerCase().trim()
  const matched = OPTION_INSIGHT_LIBRARY.find(([term]) => normalized.includes(term))
  if (matched) return matched[1]
  if (type === 'choice') {
    return `This option represents the case for ${humanizeOptionLabel(option).toLowerCase()}.`
  }
  if (type === 'ranked') {
    return `This refers to ${humanizeOptionLabel(option).toLowerCase()}. Think about how disruptive or important it could be compared with the other options here.`
  }
  return ''
}

function derivePlainEnglish(question, brief) {
  if (brief?.plainEnglish) return brief.plainEnglish
  const type = question.type || 'statement'
  const options = parseOptions(question.options)
  if (type === 'choice' && options.length >= 2) {
    return `This question asks you to choose between ${options.map((option) => `"${option}"`).join(' and ')}.`
  }
  if (type === 'ranked' && options.length > 0) {
    return `This question asks you to put ${options.length} options in order from most important to least important.`
  }
  if (brief?.background) {
    return `In simple terms, this statement is asking about ${brief.background.charAt(0).toLowerCase()}${brief.background.slice(1)}`
  }
  return 'This is asking where you stand on the statement above.'
}

function deriveAnswerInsights(question, brief) {
  if (brief?.answerInsights?.length) return brief.answerInsights
  const type = question.type || 'statement'
  const options = parseOptions(question.options)
  if (type === 'choice' || type === 'ranked') {
    return options.map((option) => ({
      answer: option,
      insight: deriveOptionInsight(option, type),
    }))
  }
  return []
}

function parseBrief(raw) {
  if (!raw) return null
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null

  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const plainEnglish = typeof value.plain_english === 'string' ? value.plain_english.trim() : ''
  const background = typeof value.background === 'string' ? value.background.trim() : ''
  const answerInsights = Array.isArray(value.answer_insights)
    ? value.answer_insights
        .map((item) => {
          if (typeof item === 'string') {
            const answer = item.trim()
            return answer ? { answer, insight: '' } : null
          }
          if (!item || typeof item !== 'object') return null
          const answer = typeof item.answer === 'string' ? item.answer.trim() : ''
          const insight = typeof item.insight === 'string' ? item.insight.trim() : ''
          if (!answer) return null
          return { answer, insight }
        })
        .filter(Boolean)
    : []
  const keyTerms = Array.isArray(value.key_terms)
    ? value.key_terms
        .map((item) => {
          if (typeof item === 'string') {
            const term = item.trim()
            return term ? { term, definition: '' } : null
          }
          if (!item || typeof item !== 'object') return null
          const term = typeof item.term === 'string' ? item.term.trim() : ''
          const definition = typeof item.definition === 'string' ? item.definition.trim() : ''
          if (!term) return null
          return { term, definition }
        })
        .filter(Boolean)
    : []
  const sources = Array.isArray(value.sources)
    ? value.sources
        .map((item) => {
          if (typeof item === 'string') {
            const label = item.trim()
            return label ? { label, url: '' } : null
          }
          if (!item || typeof item !== 'object') return null
          const label = typeof item.label === 'string' ? item.label.trim() : ''
          const url = typeof item.url === 'string' ? item.url.trim() : ''
          if (!label) return null
          return { label, url }
        })
        .filter(Boolean)
    : []

  if (!title && !plainEnglish && !background && answerInsights.length === 0 && keyTerms.length === 0 && sources.length === 0) return null

  return {
    title: title || 'More Insights',
    plainEnglish,
    background,
    answerInsights,
    keyTerms,
    sources,
  }
}

function getVoteLabel(type) {
  if (type === 'choice') return 'Binary Choice'
  if (type === 'ranked') return 'Ranked Priority'
  return 'Signal'
}

function getDetailTone(type) {
  if (type === 'choice') return 'var(--teal)'
  if (type === 'ranked') return '#9B6FD8'
  return 'var(--gold)'
}

function getQuestionPrompt(type, brief) {
  if (brief?.plainEnglish) return brief.plainEnglish
  if (type === 'choice') return 'Choose the answer that best reflects your current stance, then reveal the live signal.'
  if (type === 'ranked') return 'Order the options from strongest to weakest pull, then submit the sequence that feels true.'
  return 'Move the signal between disagreement and agreement, then cast your anonymous Pulse.'
}

function buildFeedPath(type, category) {
  const params = new URLSearchParams()
  if (type && type !== 'all') params.set('type', type)
  if (category && category !== 'All') params.set('category', category)
  const query = params.toString()
  return query ? `/feed?${query}` : '/feed'
}

function getStatusMeta(type, tier) {
  return [
    'Anonymous vote',
    tier === 'verified' ? 'Pulse verified' : 'Verification optional',
    type === 'ranked' ? 'Order defines outcome' : type === 'choice' ? 'One answer only' : 'Truth gap updates live',
  ]
}

function getSignalBucketLabel(value) {
  if (value <= 20) return 'Strong disagree'
  if (value <= 40) return 'Lean disagree'
  if (value < 60) return 'Balanced'
  if (value < 80) return 'Lean agree'
  return 'Strong agree'
}

function getSignalPositionTone(value) {
  if (value <= 40) return '#ff9f95'
  if (value < 60) return 'var(--gold)'
  return 'var(--teal)'
}

export default function Vote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, tier } = useAuth()

  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const q = await fetchQuestion(id)
        setQuestion(q)
        if (user) {
          const voted = await hasUserVoted(id, user.id)
          setAlreadyVoted(voted)
        }
      } catch {
        setError('Question not found.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user])

  async function handleSubmit(voteData) {
    if (tier === 'guest' || !user) {
      setShowAuth(true)
      return
    }
    if (alreadyVoted) return

    setSubmitting(true)
    setError('')

    try {
      await submitVote({
        questionId: id,
        userId: user.id,
        type: question.type || 'statement',
        isVerified: tier === 'verified',
        ...voteData,
      })
      navigate(`/results/${id}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <PageLoading />
      </>
    )
  }

  if (!question) {
    return (
      <div className="page">
        <NavBar />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
          {error || 'Not found.'}
        </div>
      </div>
    )
  }

  const canVote = tier !== 'guest' && !!user
  const questionType = question.type || 'statement'
  const options = parseOptions(question.options)
  const brief = parseBrief(question.brief)
  const currentCategory = titleCase(question.category || 'General')
  const curatorName = getCuratorName(profile, user)
  const curatorMeta = getCuratorMeta(tier)
  const curatorInitials = getInitials(curatorName)
  const questionFeedPath = buildFeedPath(questionType, currentCategory)

  return (
    <div className="page">
      <NavBar />
      <style>{QUESTION_DETAIL_STYLES}</style>

      <div className="question-screen-shell">
        <aside className="question-sidebar">
          <div className="question-sidebar-brand">
            <p className="question-sidebar-kicker">Signal Curator</p>
            <h2>Intellect</h2>
            <p className="question-sidebar-copy">
              Stay inside the same editorial system while you open a live question, review the context, and cast your answer.
            </p>
          </div>

          <div className="question-sidebar-section">
            <p className="question-sidebar-label">Domains</p>
            <div className="question-sidebar-category-list">
              {CATEGORIES.filter((category) => category !== 'All').map((category) => {
                const isActive = category === currentCategory
                const color = CATEGORY_COLORS[category] || 'var(--gold)'

                return (
                  <button
                    key={category}
                    type="button"
                    className={`question-sidebar-category ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(buildFeedPath(questionType, category))}
                    style={{ '--category-accent': color }}
                  >
                    <span className="question-sidebar-category-icon">
                      <CategoryGlyph category={category} active={isActive} />
                    </span>
                    <span className="question-sidebar-category-name">{category}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="question-sidebar-actions">
            <button type="button" className="question-sidebar-primary" onClick={() => navigate(questionFeedPath)}>
              Open in feed
            </button>
          </div>

          <div className="question-sidebar-profile">
            <div className="question-sidebar-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={curatorName} /> : <span>{curatorInitials}</span>}
            </div>
            <div className="question-sidebar-profile-copy">
              <strong>{curatorName}</strong>
              <span>{curatorMeta}</span>
            </div>
          </div>
        </aside>

        <div className="question-screen-main">
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 20px 96px' }}>
            <button
              type="button"
              onClick={() => navigate(questionFeedPath)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginBottom: 26,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Back to feed
            </button>

            {error && (
              <div
                style={{
                  background: 'var(--red-dim)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 14px',
                  marginBottom: 20,
                  fontSize: 13,
                  color: 'var(--red)',
                }}
              >
                {error}
              </div>
            )}

            {alreadyVoted ? (
              <AlreadyVotedPanel id={id} navigate={navigate} />
            ) : (
              <>
                {questionType === 'choice' ? (
                  <ChoiceQuestionVote
                    question={question}
                    brief={brief}
                    options={options}
                    tier={tier}
                    canVote={canVote}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onRequireAuth={() => setShowAuth(true)}
                  />
                ) : questionType === 'statement' ? (
                  <SignalQuestionVote
                    question={question}
                    brief={brief}
                    tier={tier}
                    canVote={canVote}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onRequireAuth={() => setShowAuth(true)}
                  />
                ) : (
                  <RankedQuestionVote
                    question={question}
                    brief={brief}
                    options={options}
                    tier={tier}
                    canVote={canVote}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                    onRequireAuth={() => setShowAuth(true)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      )}
    </div>
  )
}

function AlreadyVotedPanel({ id, navigate }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '48px auto 0',
        textAlign: 'center',
        background: 'rgba(12, 18, 30, 0.84)',
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: 28,
        padding: '56px 28px',
        boxShadow: '0 24px 56px rgba(0,0,0,0.28)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          fontWeight: 800,
          marginBottom: 18,
        }}
      >
        Signal Captured
      </div>
      <h1
        style={{
          margin: '0 0 12px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(34px, 5vw, 48px)',
          lineHeight: 1.08,
          color: 'var(--text)',
        }}
      >
        You&apos;ve already voted on this question.
      </h1>
      <p style={{ margin: '0 auto 28px', maxWidth: 520, color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7 }}>
        Your anonymous response is already sitting in the truth layer. You can jump straight to the live result view at any time.
      </p>
      <Button
        size="xl"
        onClick={() => navigate(`/results/${id}`)}
        style={{
          borderRadius: 999,
          minWidth: 260,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        See the truth gap
      </Button>
    </div>
  )
}

function QuestionShell({ question, brief, tier, children }) {
  const questionType = question.type || 'statement'
  const tone = getDetailTone(questionType)
  const intro = getQuestionPrompt(questionType, brief)

  return (
    <div className="question-detail-shell">
      <div className="question-header">
        <div className="question-eyebrow" style={{ color: tone }}>
          {getVoteLabel(questionType)}
        </div>
        <h1 className="question-heading">
          {questionType === 'statement' ? <em>{question.text}</em> : question.text}
        </h1>
        <p className="question-subcopy">{intro}</p>
        <div className="question-meta-strip">
          <CategoryBadge category={question.category} />
          <TypeBadge type={questionType} />
        </div>
      </div>

      <div className="question-main-grid">
        <QuestionPreview question={question} tone={tone} />
        <div className="question-side-card">
          {children}
        </div>
      </div>

      {brief && <MoreInsightsCard brief={brief} question={question} />}
    </div>
  )
}

function QuestionPreview({ question, tone }) {
  return (
    <div className="question-preview-stage">
      {question.image_url ? (
        <QuestionMedia
          src={question.image_url}
          alt={question.text}
          variant="reference"
          style={{
            height: '100%',
            minHeight: 260,
            padding: 0,
            boxSizing: 'border-box',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            minHeight: 260,
            background: `radial-gradient(circle at top, ${tone}22, rgba(7, 9, 16, 0.96) 62%)`,
          }}
        />
      )}

      <div className="question-preview-glow" />
    </div>
  )
}

function ChoiceQuestionVote({ question, brief, options, tier, canVote, submitting, onSubmit, onRequireAuth }) {
  const [selected, setSelected] = useState(null)
  const answerInsights = deriveAnswerInsights(question, brief)
  const optionDescriptions = Object.fromEntries(answerInsights.map((item) => [item.answer, item.insight]))

  function handleSubmitChoice() {
    if (!canVote) {
      onRequireAuth()
      return
    }
    if (!selected) return
    onSubmit({ choiceValue: selected })
  }

  return (
    <QuestionShell question={question} brief={brief} tier={tier}>
      <div className="question-panel question-panel-compact">
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          <div style={{ color: 'var(--teal)', fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Choose one answer
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
            Select the destination that feels truest, then reveal the live signal.
          </div>
        </div>

        <div className="question-option-grid">
          {options.map((option, index) => {
            const isSelected = selected === option

            return (
              <button
                key={option}
                type="button"
                className={`question-option-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => setSelected(isSelected ? null : option)}
                style={{
                  color: isSelected ? 'var(--teal)' : 'inherit',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="question-option-letter">Option {String.fromCharCode(65 + index)}</div>
                  <h2 className="question-option-title">{option}</h2>
                  <p className="question-option-description">
                    {optionDescriptions[option] || `This option represents the case for ${humanizeOptionLabel(option).toLowerCase()}.`}
                  </p>
                </div>
                <div
                  className="question-option-mark"
                  style={{
                    borderColor: isSelected ? 'var(--teal)' : 'rgba(255,255,255,0.14)',
                    background: isSelected ? 'rgba(76,201,168,0.18)' : 'transparent',
                    boxShadow: isSelected ? 'inset 0 0 0 8px var(--teal), 0 0 0 5px rgba(76,201,168,0.12)' : 'none',
                  }}
                />
              </button>
            )
          })}
        </div>

        <div className="question-cta-wrap">
          <Button
            size="xl"
            loading={submitting}
            disabled={canVote && !selected}
            onClick={handleSubmitChoice}
            variant={canVote && selected ? 'primary' : 'secondary'}
            style={canVote && selected ? {
              background: 'linear-gradient(135deg, #f2cf5a, #b68e18)',
              borderRadius: 999,
              minWidth: 360,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              boxShadow: '0 16px 36px rgba(201,168,76,0.22)',
              color: '#0a0b11',
            } : {
              borderRadius: 999,
              minWidth: 360,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {!canVote ? 'Sign in to vote' : !selected ? 'Select an option to vote' : 'Cast this vote'}
          </Button>

          <div className="question-footnote">
            {getStatusMeta(question.type, tier).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="question-link-row">
            <button type="button" onClick={() => setSelected(null)} style={ghostButtonStyle}>
              Reset choice
            </button>
            <a className="question-inline-link" href={`/results/${question.id}`}>See current results</a>
          </div>
        </div>
      </div>
    </QuestionShell>
  )
}

function SignalQuestionVote({ question, brief, tier, canVote, submitting, onSubmit, onRequireAuth }) {
  const [value, setValue] = useState(50)
  const [reason, setReason] = useState(null)
  const signalLabel = getSignalBucketLabel(value)
  const signalTone = getSignalPositionTone(value)

  function handleSubmitSignal() {
    if (!canVote) {
      onRequireAuth()
      return
    }
    onSubmit({ spectrumValue: value, reason })
  }

  return (
    <QuestionShell question={question} brief={brief} tier={tier}>
      <div className="question-panel question-panel-compact">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 10,
            }}
          >
            Position on the signal
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 42px)', color: signalTone, marginBottom: 6 }}>
            {signalLabel}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {value} / 100
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: '#ff9f95' }}>Disagree</span>
            <span style={{ color: 'var(--gold)' }}>Mixed</span>
            <span style={{ color: 'var(--teal)' }}>Agree</span>
          </div>
          <input
            className="question-slider"
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
          />
        </div>

        <div style={{ marginBottom: 26 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginBottom: 14,
            }}
          >
            Primary sentiment driver
          </div>
          <div className="question-driver-grid">
            {SIGNAL_DRIVER_OPTIONS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`question-driver-chip${reason === chip ? ' is-selected' : ''}`}
                onClick={() => setReason(reason === chip ? null : chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="question-cta-wrap">
          <Button
            size="xl"
            loading={submitting}
            onClick={handleSubmitSignal}
            style={{
              borderRadius: 999,
              minWidth: 320,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {!canVote ? 'Sign in to vote' : 'Cast my pulse'}
          </Button>

          <div className="question-footnote">
            {getStatusMeta(question.type, tier).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="question-link-row">
            <a className="question-inline-link" href={`/results/${question.id}`}>See current results</a>
          </div>
        </div>
      </div>
    </QuestionShell>
  )
}

function RankedQuestionVote({ question, brief, options, tier, canVote, submitting, onSubmit, onRequireAuth }) {
  function handleSubmitRanked(voteData) {
    if (!canVote) {
      onRequireAuth()
      return
    }
    onSubmit(voteData)
  }

  return (
    <QuestionShell question={question} brief={brief} tier={tier}>
      <div className="question-stack">
        <div className="question-panel question-panel-compact">
          <RankedVote options={options} onSubmit={handleSubmitRanked} submitting={submitting} canVote={canVote} />

          <div className="question-cta-wrap" style={{ marginTop: 16 }}>
            <div className="question-footnote">
              {getStatusMeta(question.type, tier).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="question-link-row">
              <a className="question-inline-link" href={`/results/${question.id}`}>See current results</a>
            </div>
          </div>
        </div>
      </div>
    </QuestionShell>
  )
}

function MoreInsightsCard({ brief, question }) {
  const [expanded, setExpanded] = useState(false)
  const plainEnglish = derivePlainEnglish(question, brief)
  const answerInsights = deriveAnswerInsights(question, brief)

  return (
    <div
      className="question-panel"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderColor: 'rgba(76,201,168,0.16)',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '22px 24px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            More Insights
          </div>
          <div style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 22 }}>
            {brief.title || 'High-level context for this question'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Click for more context before you vote.
          </div>
        </div>
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text)',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {expanded ? '-' : '⌄'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 24px 24px', display: 'grid', gap: 20 }}>
          {plainEnglish && (
            <div>
              <div style={sectionLabelStyle}>In plain English</div>
              <p style={sectionBodyStyle}>{plainEnglish}</p>
            </div>
          )}

          {brief.background && (
            <div>
              <div style={sectionLabelStyle}>Why this matters</div>
              <p style={sectionBodyStyle}>{brief.background}</p>
            </div>
          )}

          {answerInsights.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>About the answers</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {answerInsights.map((item) => (
                  <div key={`${item.answer}-${item.insight || 'plain'}`} style={glossaryRowStyle}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: item.insight ? 4 : 0 }}>{item.answer}</div>
                    {item.insight ? <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.insight}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.keyTerms.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Key Terms</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {brief.keyTerms.map((item) => (
                  <div key={`${item.term}-${item.definition}`} style={glossaryRowStyle}>
                    <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: item.definition ? 4 : 0 }}>{item.term}</div>
                    {item.definition ? <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{item.definition}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.sources.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Sources</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {brief.sources.map((item) => (
                  item.url ? (
                    <a
                      key={`${item.label}-${item.url}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'var(--teal)',
                        textDecoration: 'none',
                        fontSize: 13,
                      }}
                    >
                      {item.label} {'->'}
                    </a>
                  ) : (
                    <div
                      key={`${item.label}-plain`}
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.label}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ghostButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  padding: 0,
}

const sectionLabelStyle = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  fontWeight: 700,
  marginBottom: 8,
}

const sectionBodyStyle = {
  color: 'var(--text-muted)',
  fontSize: 14,
  lineHeight: 1.7,
  margin: 0,
}

const glossaryRowStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
}
