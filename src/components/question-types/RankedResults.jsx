const RANK_COLORS = ['#C9A84C', '#9B6FD8', '#4C8EC9', '#4CC9A8', '#7A7896']

export default function RankedResults({ allResults, verifiedResults, canSeeSplit }) {
  if (!allResults || !allResults.options || allResults.total === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>No votes yet — be the first to rank.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <RankedPanel title="All Responses" subtitle={`${allResults.total} votes`} results={allResults} accent="var(--gold)" />
      {canSeeSplit && verifiedResults && verifiedResults.total > 0
        ? <RankedPanel title="◈ Verified Only" subtitle={`${verifiedResults.total} verified votes`} results={verifiedResults} accent="var(--teal)" verified />
        : canSeeSplit && (
          <div style={{ padding: '24px', borderRadius: 'var(--radius)', border: '1px dashed var(--teal-border)', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
            No verified votes yet
          </div>
        )
      }
    </div>
  )
}

function RankedPanel({ title, subtitle, results, accent, verified }) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.options.map((opt, index) => (
          <div key={opt.label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 'var(--radius)',
            background: index === 0 ? `${RANK_COLORS[0]}10` : 'rgba(255,255,255,0.02)',
            border: index === 0 ? `1px solid ${RANK_COLORS[0]}33` : '1px solid transparent',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `${RANK_COLORS[index] || 'var(--text-dim)'}22`,
              border: `2px solid ${RANK_COLORS[index] || 'var(--text-dim)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800,
              color: RANK_COLORS[index] || 'var(--text-dim)',
              flexShrink: 0,
            }}>
              {index + 1}
            </div>
            <span style={{ flex: 1, fontSize: 13, color: index === 0 ? 'var(--text)' : 'var(--text-muted)', fontWeight: index === 0 ? 600 : 400 }}>
              {opt.label}
            </span>
            <div style={{ width: 80 }}>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${opt.score}%`, background: RANK_COLORS[index] || 'var(--text-dim)', borderRadius: 2, transition: 'width 0.6s ease' }} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 50, textAlign: 'right' }}>
              avg #{opt.avgRank.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
