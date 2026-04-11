import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import StarField from '../components/StarField'
import { Button } from '../components/ui'

export default function Upcoming() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', position: 'relative' }}>
      <StarField />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <NavBar />
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 60px)',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 680, textAlign: 'center', animation: 'fade-in 0.8s ease forwards' }}>
          {/* Overline */}
          <div style={{
            fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold-border)', display: 'inline-block' }} />
            The Road Ahead
            <span style={{ width: 32, height: 1, background: 'var(--gold-border)', display: 'inline-block' }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.1,
            marginBottom: 56,
          }}>
            The Road Ahead
          </h1>

          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(20px, 2.8vw, 28px)',
            fontStyle: 'italic',
            color: 'var(--text)',
            lineHeight: 1.75,
            marginBottom: 48,
            opacity: 0.9,
          }}>
            "We have a lot planned for Pulse. Our mission is simple but profound — to connect
            the dots, and to provide a living, breathing image of a connected world. One built
            not on algorithms or advertising, but on sovereign, verifiable human data. Every vote
            you cast here is real. Every verified voice carries weight. What we are building
            together is something the world has not seen before."
          </p>

          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
            marginBottom: 56,
          }}>
            Stay tuned. The best is coming.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/"><Button size="lg">← Back to Pulse</Button></Link>
            <Link to="/suggestions">
              <Button variant="secondary" size="lg">Share an Idea →</Button>
            </Link>
          </div>

          {/* Decorative divider */}
          <div style={{
            marginTop: 80,
            display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center',
          }}>
            <span style={{ width: 60, height: 1, background: 'var(--gold-border)', display: 'inline-block' }} />
            <span style={{ color: 'var(--gold)', fontSize: 18 }}>◈</span>
            <span style={{ width: 60, height: 1, background: 'var(--gold-border)', display: 'inline-block' }} />
          </div>

          <p style={{
            marginTop: 24,
            fontSize: 12, color: 'var(--text-dim)',
            letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            Sovereign data. Verified truth.
          </p>
        </div>
      </div>
    </div>
  )
}
