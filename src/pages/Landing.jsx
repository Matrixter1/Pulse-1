import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StarField from '../components/StarField'
import SacredMark from '../components/SacredMark'
import NavBar from '../components/NavBar'
import { Button } from '../components/ui'
import { useAuth } from '../lib/auth'
import {
  fetchTotalVoteCount,
  fetchFirstQuestionByType,
  fetchVotesForQuestion,
  calcResults,
  calcChoiceResults,
  calcRankedResults,
  fetchSuggestions,
  submitSuggestion,
} from '../lib/data'

function parseOptions(raw) {
  if (!raw) return []
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

function useFadeIn() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function TierBadge({ tier }) {
  const cfg = {
    registered: { label: 'Member', color: 'var(--gold)' },
    verified:   { label: 'Verified', color: 'var(--teal)' },
    guest:      { label: 'Guest', color: 'var(--text-muted)' },
  }
  const c = cfg[tier] || cfg.guest
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: c.color, border: `1px solid ${c.color}44`, borderRadius: 10, padding: '1px 6px',
    }}>
      {tier === 'verified' && '✓ '}{c.label}
    </span>
  )
}

/* ─── Hero ─────────────────────────────────────────────────────────── */
function HeroSection({ animVotes, user }) {
  return (
    <section style={{
      position: 'relative', zIndex: 1,
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', padding: '60px 24px 100px',
    }}>
      <div style={{
        position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 720,
        animation: 'fade-in 0.9s ease forwards',
      }}>
        {/* SacredMark above heading */}
        <div style={{ animation: 'fadeIn 1.2s ease forwards', opacity: 0, marginBottom: 0 }}>
          <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SacredMark size={320} showRings={true} />
          </div>
        </div>

        <div style={{ marginBottom: 6, marginTop: 0 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(80px, 13vw, 128px)',
            fontWeight: 700,
            color: 'var(--gold)',
            display: 'block',
            lineHeight: 0.95,
            letterSpacing: '0.02em',
          }}>Pulse</span>
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>by Matrixter</span>
        </div>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(20px, 3vw, 27px)',
          fontStyle: 'italic',
          color: 'var(--text)',
          marginTop: 28, marginBottom: 16,
          lineHeight: 1.45,
        }}>
          "Where verified truth diverges from popular opinion."
        </p>

        <p style={{
          fontSize: 14, color: 'var(--text-muted)',
          maxWidth: 520, margin: '0 auto 44px',
          lineHeight: 1.75,
        }}>
          The first platform that shows you the gap between what people say — and what
          identity-verified humans actually believe.
        </p>

        {/* Live vote counter */}
        <div style={{ marginBottom: 44 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 7vw, 64px)',
            fontWeight: 700,
            color: 'var(--gold)',
            lineHeight: 1,
          }}>
            {animVotes.toLocaleString()}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            marginTop: 6, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            votes cast and counting
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={user ? '/feed' : '/splash'}><Button size="xl">Enter Pulse →</Button></Link>
          <Link to="/feed">
            <Button variant="secondary" size="xl">Browse</Button>
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        animation: 'fade-in 2s ease forwards',
        opacity: 0.6,
      }}>
        <span style={{
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          Scroll to explore
        </span>
        <div style={{
          width: 1,
          height: 40,
          background: 'linear-gradient(to bottom, var(--gold), transparent)',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
      </div>
    </section>
  )
}

/* ─── Three Types ───────────────────────────────────────────────────── */
function StatementDemo({ data }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</p>
  const { question, results } = data
  return (
    <>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>
        "{question.text.length > 90 ? question.text.slice(0, 90) + '…' : question.text}"
      </p>
      {results.total > 0 ? (
        <>
          <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${results.Disagree}%`, background: 'var(--red)' }} />
            <div style={{ width: `${results.Neutral}%`, background: 'var(--gold)' }} />
            <div style={{ width: `${results.Agree}%`, background: 'var(--teal)' }} />
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>{results.Disagree}%</span>
            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{results.Neutral}%</span>
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{results.Agree}% Agree</span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>No votes yet</div>
      )}
    </>
  )
}

function ChoiceDemo({ data }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</p>
  const { question, results } = data
  const top2 = [...(results.options || [])].sort((a, b) => b.pct - a.pct).slice(0, 2)
  return (
    <>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
        {question.text.length > 80 ? question.text.slice(0, 80) + '…' : question.text}
      </p>
      {results.total > 0 ? top2.map(opt => (
        <div key={opt.label} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: 'var(--text-muted)' }}>{opt.label.length > 32 ? opt.label.slice(0, 32) + '…' : opt.label}</span>
            <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{opt.pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ width: `${opt.pct}%`, height: '100%', background: 'var(--teal)', borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )) : <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>No votes yet</div>}
    </>
  )
}

function RankedDemo({ data }) {
  if (!data) return <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</p>
  const { question, results } = data
  const top3 = (results.options || []).slice(0, 3)
  const rankColors = ['var(--gold)', 'var(--text-muted)', 'var(--violet)']
  return (
    <>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
        {question.text.length > 80 ? question.text.slice(0, 80) + '…' : question.text}
      </p>
      {results.total > 0 ? top3.map((opt, i) => (
        <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: rankColors[i] + '1A', border: `1px solid ${rankColors[i]}55`,
            color: rankColors[i], fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{i + 1}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {opt.label.length > 40 ? opt.label.slice(0, 40) + '…' : opt.label}
          </span>
        </div>
      )) : <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>No votes yet</div>}
    </>
  )
}

function TypeCard({ icon, iconColor, title, description, demo, ctaText, ctaLink }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 260px', maxWidth: 340,
        background: 'rgba(10,12,26,0.88)',
        border: `1px solid ${hovered ? iconColor + '55' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '32px 28px',
        backdropFilter: 'blur(16px)',
        transition: 'all var(--transition)',
        transform: hovered ? 'translateY(-5px)' : 'none',
        boxShadow: hovered ? `0 16px 48px ${iconColor}18` : 'none',
      }}
    >
      <div style={{ fontSize: 26, color: iconColor, marginBottom: 10 }}>{icon}</div>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 8,
      }}>{title}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20 }}>
        {description}
      </p>
      <div style={{
        background: 'rgba(5,6,15,0.6)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius)', padding: 14, marginBottom: 20, minHeight: 90,
      }}>
        {demo}
      </div>
      <Link to={ctaLink} style={{ color: iconColor, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>
        {ctaText}
      </Link>
    </div>
  )
}

function ThreeTypesSection({ demos }) {
  const [ref, visible] = useFadeIn()
  return (
    <section ref={ref} style={{
      position: 'relative', zIndex: 1,
      padding: '80px 24px',
      borderTop: '1px solid rgba(201,168,76,0.08)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 50px)',
            fontWeight: 600, color: 'var(--text)', marginBottom: 12,
          }}>
            Three Ways to Find the Truth
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 440, margin: '0 auto' }}>
            Every format reveals a different layer of human sentiment.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          <TypeCard
            icon="◈" iconColor="var(--gold)"
            title="Signal"
            description="Your position on the spectrum."
            demo={<StatementDemo data={demos.statement} />}
            ctaText="View Signals →"
            ctaLink="/feed"
          />
          <TypeCard
            icon="◉" iconColor="var(--teal)"
            title="Decide"
            description="One choice. No middle ground."
            demo={<ChoiceDemo data={demos.choice} />}
            ctaText="View Decisions →"
            ctaLink="/feed"
          />
          <TypeCard
            icon="◆" iconColor="var(--violet)"
            title="Rank"
            description="Your order. Your truth."
            demo={<RankedDemo data={demos.ranked} />}
            ctaText="View Rankings →"
            ctaLink="/feed"
          />
        </div>
      </div>
    </section>
  )
}

/* ─── Truth Gap Explainer ───────────────────────────────────────────── */
function HowItWorksSection() {
  const [ref, visible] = useFadeIn()
  return (
    <section ref={ref} style={{
      padding: '80px 20px',
      maxWidth: 700,
      margin: '0 auto',
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
    }}>
      <div style={{
        fontSize: 13,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        marginBottom: 48,
      }}>
        How it works
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          { step: '01', verb: 'See',     desc: 'One question. No noise.'  },
          { step: '02', verb: 'Decide',  desc: 'Your truth. Uninfluenced.' },
          { step: '03', verb: 'Reveal',  desc: 'The signal emerges.'       },
          { step: '04', verb: 'Reflect', desc: 'Where do you stand?'       },
          { step: '05', verb: 'Return',  desc: 'The signal shifts daily.'  },
        ].map(({ step, verb, desc }, index) => (
          <div
            key={step}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '28px 0',
              borderBottom: index < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              textAlign: 'left',
            }}
          >
            <div style={{
              fontSize: 16,
              letterSpacing: '0.15em',
              color: 'var(--text-dim)',
              fontWeight: 600,
              minWidth: 28,
              flexShrink: 0,
            }}>
              {step}
            </div>
            <div style={{
              width: 1,
              height: 40,
              background: 'linear-gradient(to bottom, var(--gold), transparent)',
              flexShrink: 0,
              opacity: 0.4,
            }} />
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 600,
              color: '#FFFFFF',
              minWidth: 160,
              flexShrink: 0,
              lineHeight: 1,
            }}>
              {verb}
            </div>
            <div style={{
              fontSize: 18,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              fontStyle: 'italic',
              fontFamily: 'var(--font-display)',
            }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 48,
        fontSize: 18,
        color: 'var(--text-dim)',
        letterSpacing: '0.05em',
      }}>
        Ready?{' '}
        <Link
          to="/splash"
          style={{
            color: 'var(--gold)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Enter Pulse →
        </Link>
      </div>
    </section>
  )
}

function TruthGapSection() {
  const [ref, visible] = useFadeIn()
  return (
    <section ref={ref} style={{
      position: 'relative', zIndex: 1,
      background: 'rgba(5,6,15,0.92)',
      borderTop: '1px solid rgba(201,168,76,0.1)',
      borderBottom: '1px solid rgba(201,168,76,0.1)',
      padding: '80px 24px',
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
    }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(52px, 10vw, 96px)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--gold) 40%, var(--teal))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1, marginBottom: 18,
        }}>
          The Truth Gap™
        </div>
        <p style={{
          color: 'var(--text-muted)', fontSize: 15,
          maxWidth: 460, margin: '0 auto 64px', lineHeight: 1.75,
        }}>
          The % divergence between what everyone says and what verified humans actually believe.
        </p>

        <div style={{
          display: 'flex', gap: 24, justifyContent: 'center',
          alignItems: 'center', flexWrap: 'wrap', marginBottom: 60,
        }}>
          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 19,
              color: 'var(--gold)', marginBottom: 5,
            }}>What people say</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unverified public opinion</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 24 }}>⟷</div>
            <div style={{
              padding: '6px 14px',
              background: 'linear-gradient(135deg, var(--gold-dim), var(--teal-dim))',
              border: '1px solid var(--gold-border)',
              borderRadius: 20,
              fontFamily: 'var(--font-ui)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--gold)',
            }}>GAP</div>
          </div>

          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 19,
              color: 'var(--teal)', marginBottom: 5,
            }}>What verified humans believe</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Identity-verified sentiment</div>
          </div>
        </div>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(20px, 3vw, 26px)',
          fontStyle: 'italic',
          color: 'var(--text)',
          lineHeight: 1.5,
        }}>
          "Most platforms show you the crowd. Pulse shows you the truth."
        </p>
      </div>
    </section>
  )
}

/* ─── Vision / Upcoming ─────────────────────────────────────────────── */
function VisionSection() {
  const [ref, visible] = useFadeIn()
  return (
    <section ref={ref} style={{
      position: 'relative', zIndex: 1,
      padding: '80px 24px',
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 5vw, 50px)',
          fontWeight: 600, color: 'var(--gold)', marginBottom: 44,
        }}>
          Where We're Going
        </h2>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(19px, 2.6vw, 25px)',
          fontStyle: 'italic',
          color: 'var(--text)',
          maxWidth: 600, margin: '0 auto 52px',
          lineHeight: 1.75,
        }}>
          "We have a lot planned. Our mission is to connect the dots — to provide a living image
          of a connected world, built entirely on sovereign, verifiable human data. What you share
          here matters. It is real. It is yours."
        </p>
        <Link to="/upcoming">
          <Button variant="secondary" size="lg">See What's Coming →</Button>
        </Link>
      </div>
    </section>
  )
}

/* ─── Community Suggestions Teaser ─────────────────────────────────── */
function SuggestionsTeaser({ suggestions, user, tier, suggestionText, setSuggestionText, onSubmit, submitLoading, submitSuccess }) {
  const [ref, visible] = useFadeIn()
  const canSuggest = tier === 'registered' || tier === 'verified'

  return (
    <section ref={ref} style={{
      position: 'relative', zIndex: 1,
      padding: '80px 24px',
      borderTop: '1px solid rgba(76,201,168,0.1)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 600, color: 'var(--text)', marginBottom: 12,
          }}>
            Shape the Future of Pulse
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Have an idea? Members and Verified users can submit suggestions.
            Everyone can see what the community wants.
          </p>
        </div>

        {/* Inline form / locked */}
        {canSuggest ? (
          submitSuccess ? (
            <div style={{
              textAlign: 'center', color: 'var(--teal)',
              marginBottom: 36, fontSize: 14, padding: '14px 20px',
              background: 'var(--teal-dim)', border: '1px solid var(--teal-border)',
              borderRadius: 'var(--radius)',
            }}>
              ✓ Suggestion submitted! <Link to="/suggestions" style={{ color: 'var(--teal)', fontWeight: 700 }}>View all →</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ marginBottom: 44 }}>
              <textarea
                value={suggestionText}
                onChange={e => setSuggestionText(e.target.value)}
                placeholder="Share your idea for Pulse… (10–500 characters)"
                maxLength={500}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(10,12,26,0.8)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)', padding: '12px 16px',
                  fontFamily: 'var(--font-ui)', fontSize: 14,
                  resize: 'vertical', minHeight: 80, marginBottom: 10,
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {suggestionText.length}/500
                </span>
                <Button
                  size="sm"
                  disabled={suggestionText.trim().length < 10}
                  loading={submitLoading}
                  onClick={onSubmit}
                >
                  Submit Idea
                </Button>
              </div>
            </form>
          )
        ) : (
          <div style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold-border)',
            borderRadius: 'var(--radius)', padding: '14px 20px',
            marginBottom: 44, textAlign: 'center', fontSize: 13, color: 'var(--gold)',
          }}>
            <Link to="/splash" style={{ color: 'var(--gold)', fontWeight: 700 }}>Sign in as Member →</Link>
            {' '}to submit ideas and upvote
          </div>
        )}

        {/* Top suggestions */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {suggestions.map(s => (
              <div key={s.id} style={{
                background: 'rgba(10,12,26,0.75)',
                border: '1px solid rgba(201,168,76,0.1)',
                borderRadius: 'var(--radius)',
                padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>{s.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {s.users?.nickname || 'Anonymous'}
                    </span>
                    {s.users?.tier && <TierBadge tier={s.users.tier} />}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, color: 'var(--gold)', fontWeight: 700,
                  flexShrink: 0, paddingTop: 2,
                }}>
                  ▲ {s.upvotes}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link to="/suggestions" style={{
            color: 'var(--teal)', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em',
          }}>
            View all suggestions →
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─── Divider ───────────────────────────────────────────────────────── */
function Divider() {
  return (
    <div style={{
      position: 'relative', zIndex: 1,
      width: '100%', height: 1,
      background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.15), transparent)',
    }} />
  )
}

/* ─── Footer ────────────────────────────────────────────────────────── */
function Footer() {
  const footerLinks = [
    { to: '/splash', label: 'Enter Pulse' },
    { to: '/feed', label: 'Browse' },
    { to: '/upcoming', label: 'Upcoming' },
    { to: '/suggestions', label: 'Suggestions' },
  ]
  return (
    <footer style={{
      position: 'relative', zIndex: 1,
      background: 'rgba(5,6,15,0.97)',
      borderTop: '1px solid rgba(201,168,76,0.1)',
      padding: '40px 24px 32px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flexWrap: 'wrap', gap: 24,
          marginBottom: 28,
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24, fontWeight: 600, color: 'var(--gold)',
            }}>Pulse</span>
            <span style={{
              fontSize: 11, color: 'var(--text-muted)',
              display: 'block', marginTop: 3, letterSpacing: '0.12em',
            }}>by Matrixter</span>
          </div>

          <p style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic', fontSize: 14,
            color: 'var(--text-muted)', alignSelf: 'center',
          }}>
            Sovereign data. Verified truth.
          </p>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {footerLinks.map(({ to, label }) => (
              <Link key={to} to={to} style={{
                color: 'var(--text-muted)', fontSize: 13,
                transition: 'color var(--transition)',
              }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingTop: 20, textAlign: 'center',
          fontSize: 12, color: 'var(--text-dim)',
        }}>
          © 2025 Matrixter. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function Landing() {
  const { user, tier } = useAuth()
  const [totalVotes, setTotalVotes] = useState(0)
  const [animVotes, setAnimVotes] = useState(0)
  const [demos, setDemos] = useState({ statement: null, choice: null, ranked: null })
  const [suggestions, setSuggestions] = useState([])
  const [suggestionText, setSuggestionText] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const [count, stQ, chQ, rkQ, sug] = await Promise.all([
        fetchTotalVoteCount(),
        fetchFirstQuestionByType('statement'),
        fetchFirstQuestionByType('choice'),
        fetchFirstQuestionByType('ranked'),
        fetchSuggestions({ limit: 5 }),
      ])
      setTotalVotes(count)
      setSuggestions(sug)

      const demoData = {}
      const voteFetches = []
      if (stQ) voteFetches.push(fetchVotesForQuestion(stQ.id).then(v => {
        demoData.statement = { question: stQ, results: calcResults(v) }
      }))
      if (chQ) voteFetches.push(fetchVotesForQuestion(chQ.id).then(v => {
        const opts = parseOptions(chQ.options)
        demoData.choice = { question: chQ, results: calcChoiceResults(v, opts) }
      }))
      if (rkQ) voteFetches.push(fetchVotesForQuestion(rkQ.id).then(v => {
        const opts = parseOptions(rkQ.options)
        demoData.ranked = { question: rkQ, results: calcRankedResults(v, opts) }
      }))
      await Promise.all(voteFetches)
      setDemos(demoData)
    }
    load()
  }, [])

  // Animate vote counter
  useEffect(() => {
    if (totalVotes === 0) return
    let current = 0
    const increment = totalVotes / 80
    const timer = setInterval(() => {
      current += increment
      if (current >= totalVotes) { setAnimVotes(totalVotes); clearInterval(timer) }
      else setAnimVotes(Math.floor(current))
    }, 16)
    return () => clearInterval(timer)
  }, [totalVotes])

  async function handleSuggestionSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()
    if (suggestionText.trim().length < 10 || !user) return
    setSubmitLoading(true)
    try {
      await submitSuggestion(suggestionText.trim(), user.id)
      setSubmitSuccess(true)
      setSuggestionText('')
      const sug = await fetchSuggestions({ limit: 5 })
      setSuggestions(sug)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', position: 'relative' }}>
      <StarField />
      <div style={{ position: 'relative', zIndex: 100 }}>
        <NavBar />
      </div>
      <HeroSection animVotes={animVotes} user={user} />
      <Divider />
      <ThreeTypesSection demos={demos} />
      <Divider />
      <HowItWorksSection />
      <Divider />
      <TruthGapSection />
      <Divider />
      <VisionSection />
      <Divider />
      <SuggestionsTeaser
        suggestions={suggestions}
        user={user}
        tier={tier}
        suggestionText={suggestionText}
        setSuggestionText={setSuggestionText}
        onSubmit={handleSuggestionSubmit}
        submitLoading={submitLoading}
        submitSuccess={submitSuccess}
      />
      <Footer />
    </div>
  )
}
