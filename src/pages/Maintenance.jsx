const REOPEN_DATE_LABEL = '10 May 2026';

export const PULSE_MAINTENANCE_UNTIL = new Date('2026-05-10T00:00:00+02:00').getTime();

export function isPulseMaintenanceActive(now = Date.now()) {
  return now < PULSE_MAINTENANCE_UNTIL;
}

export default function Maintenance() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '32px',
      color: '#f7f1dc',
      background:
        'radial-gradient(circle at 50% 0%, rgba(76, 201, 168, 0.16), transparent 32%), radial-gradient(circle at 25% 90%, rgba(201, 168, 76, 0.14), transparent 34%), #050710',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <section style={{
        width: 'min(720px, 100%)',
        border: '1px solid rgba(201, 168, 76, 0.32)',
        borderRadius: '32px',
        padding: 'clamp(32px, 7vw, 72px)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(18, 22, 42, 0.92), rgba(8, 10, 22, 0.96))',
        boxShadow: '0 32px 90px rgba(0, 0, 0, 0.48)',
      }}>
        <div style={{
          margin: '0 auto 24px',
          width: 78,
          height: 78,
          borderRadius: 24,
          display: 'grid',
          placeItems: 'center',
          color: '#4cc9a8',
          background: 'rgba(76, 201, 168, 0.1)',
          border: '1px solid rgba(76, 201, 168, 0.36)',
          fontSize: 34,
          letterSpacing: 2,
        }}>
          M
        </div>

        <p style={{
          margin: '0 0 18px',
          color: '#c9a84c',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
        }}>
          Pulse by Matrixter
        </p>

        <h1 style={{
          margin: 0,
          fontFamily: 'Newsreader, Georgia, serif',
          fontSize: 'clamp(44px, 8vw, 86px)',
          fontWeight: 500,
          lineHeight: 0.95,
        }}>
          Under construction
        </h1>

        <p style={{
          margin: '28px auto 0',
          maxWidth: 560,
          color: '#b7aecf',
          fontSize: 'clamp(18px, 2.6vw, 23px)',
          lineHeight: 1.55,
        }}>
          Pulse is taking a short maintenance pause while we tune the experience and reduce media load.
          We plan to reopen on {REOPEN_DATE_LABEL}.
        </p>

        <div style={{
          margin: '36px auto 0',
          width: 'min(360px, 100%)',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.7), transparent)',
        }} />

        <p style={{
          margin: '28px 0 0',
          color: '#4cc9a8',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
        }}>
          Thank you for helping shape the signal
        </p>
      </section>
    </main>
  );
}
