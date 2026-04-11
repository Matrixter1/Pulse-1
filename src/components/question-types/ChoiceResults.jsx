export default function ChoiceResults({ allResults, verifiedResults, canSeeSplit }) {
  if (!allResults || !allResults.options || allResults.total === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>No votes yet — be the first to vote.</div>
  }
  const maxPct = Math.max(...allResults.options.map(o => o.pct), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ChoicePanel title="All Responses" subtitle={`${allResults.total} votes`} results={allResults} accent="var(--gold)" maxPct={maxPct} />
      {canSeeSplit && verifiedResults && verifiedResults.total > 0
        ? <ChoicePanel title="◈ Verified Only" subtitle={`${verifiedResults.total} verified votes`} results={verifiedResults} accent="var(--teal)" maxPct={maxPct} verified />
        : canSeeSplit && (
          <div style={{ padding: '24px', borderRadius: 'var(--radius)', border: '1px dashed var(--teal-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No verified votes yet
          </div>
        )
      }
    </div>
  )
}

function ChoicePanel({ title, subtitle, results, accent, maxPct, verified }) {
  return (
    <div style={{
      background: 'rgba(10,12,26,0.8)',
      border: `1px solid ${verified ? 'var(--teal-border)' : 'var(--gold-border)'}`,
      borderRadius: 'var(--radius-lg)', padding: '28px',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {results.options.slice().sort((a, b) => b.pct - a.pct).map(opt => {
          const isWinner = opt.label === results.winner
          return (
            <div key={opt.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <span style={{ fontSize: 13, color: isWinner ? accent : 'var(--text-muted)', fontWeight: isWinner ? 700 : 400 }}>
                  {isWinner && '★ '}{opt.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isWinner ? accent : 'var(--text-muted)', flexShrink: 0 }}>
                  {opt.pct}%
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(opt.pct / maxPct) * 100}%`,
                  background: isWinner ? accent : `${accent}55`,
                  borderRadius: 4,
                  transition: 'width 0.7s ease',
                  boxShadow: isWinner ? `0 0 8px ${accent}44` : 'none',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
