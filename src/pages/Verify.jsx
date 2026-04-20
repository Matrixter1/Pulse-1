import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { useAuth } from '../lib/auth'

const DOC_OPTIONS = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
]

const CAPTURE_OPTIONS = [
  { value: 'camera', label: 'Take photo', detail: 'Use your device camera for a live capture.' },
  { value: 'library', label: 'Upload from library', detail: 'Use an existing clean image from your device.' },
]

export default function Verify() {
  const navigate = useNavigate()
  const { user, tier, completeVerification } = useAuth()
  const [step, setStep] = useState(0)
  const [docType, setDocType] = useState('')
  const [captureMethod, setCaptureMethod] = useState('')
  const [startedLiveness, setStartedLiveness] = useState(false)
  const [confirmedLiveness, setConfirmedLiveness] = useState(false)
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canFinish = useMemo(() => (
    street.trim() &&
    city.trim() &&
    region.trim() &&
    postalCode.trim() &&
    country.trim()
  ), [street, city, region, postalCode, country])

  async function handleComplete() {
    if (!canFinish || submitting) return

    setSubmitting(true)
    setError('')

    try {
      await completeVerification()
      setStep(3)
    } catch (err) {
      setError(err.message || 'Unable to complete verification right now.')
      setSubmitting(false)
    }
  }

  if (!user || tier === 'guest') {
    return (
      <div className="page">
        <NavBar />
        <div style={shellStyle}>
          <BackButton onClick={() => navigate(-1)} />
          <Panel>
            <Eyebrow color="var(--gold)">Identity Verification</Eyebrow>
            <HeroTitle>Sign in before you verify.</HeroTitle>
            <BodyCopy>
              Verification belongs to your Pulse member account, not to a guest browsing session.
            </BodyCopy>
            <ActionRow>
              <PrimaryButton onClick={() => navigate('/splash')}>
                Sign in
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/feed')}>
                Maybe later
              </SecondaryButton>
            </ActionRow>
          </Panel>
        </div>
      </div>
    )
  }

  if (tier === 'verified' || step === 3) {
    return (
      <div className="page">
        <NavBar />
        <div style={shellStyle}>
          <Panel centered>
            <VerifiedOrb />
            <Eyebrow color="var(--teal)">Truth Layer Active</Eyebrow>
            <HeroTitle>You are now part of the Truth Layer.</HeroTitle>
            <BodyCopy>
              Your future votes now carry verified weight across Pulse web and Pulse mobile.
            </BodyCopy>
            <InsightCard
              title="Verified Insight"
              body="This is still a mock verification flow, but it updates the same shared account tier that the mobile app and results pages already read."
              accent="var(--teal)"
            />
            <ActionRow>
              <PrimaryButton onClick={() => navigate('/feed')}>
                Enter the Pulse
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/results/1')}>
                View results
              </SecondaryButton>
            </ActionRow>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <NavBar />

      <div style={shellStyle}>
        <BackButton onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} />
        <Progress current={step + 1} total={3} />

        <div style={{ marginBottom: 28 }}>
          <Eyebrow color={step === 1 ? 'var(--teal)' : 'var(--gold)'}>
            Step {step + 1} of 3
          </Eyebrow>
          <HeroTitle>
            {step === 0 && 'Show us your credential.'}
            {step === 1 && 'Breathe life into the signal.'}
            {step === 2 && 'Anchor your location.'}
          </HeroTitle>
          <BodyCopy>
            {step === 0 && 'Choose which identity document you want to use, then tell Pulse how you want to provide it.'}
            {step === 1 && 'Center your face, steady your gaze, and confirm the capture when you are ready.'}
            {step === 2 && 'Complete the final address step, then Pulse will mark your shared account as verified.'}
          </BodyCopy>
        </div>

        {step === 0 && (
          <>
            <Panel>
              <DocumentPreview />
              <small style={mutedSmall}>
                Encrypted via Celestial Ledger. Pulse stores only your verification status, never your raw document.
              </small>
            </Panel>

            <SectionLabel>Accepted Documents</SectionLabel>
            <Stack>
              {DOC_OPTIONS.map(option => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  selected={docType === option.value}
                  onClick={() => setDocType(option.value)}
                />
              ))}
            </Stack>

            <SectionLabel>Capture Method</SectionLabel>
            <Stack>
              {CAPTURE_OPTIONS.map(option => (
                <SelectableCard
                  key={option.value}
                  label={option.label}
                  detail={option.detail}
                  accent="var(--teal)"
                  selected={captureMethod === option.value}
                  onClick={() => setCaptureMethod(option.value)}
                />
              ))}
            </Stack>

            <ActionRow>
              <PrimaryButton disabled={!docType || !captureMethod} onClick={() => setStep(1)}>
                Continue to Liveness
              </PrimaryButton>
              <SecondaryButton onClick={() => navigate('/feed')}>
                Maybe later
              </SecondaryButton>
            </ActionRow>
          </>
        )}

        {step === 1 && (
          <>
            <Panel centered>
              <Viewfinder started={startedLiveness} confirmed={confirmedLiveness} />
              <BodyCopy style={{ marginBottom: 0 }}>
                {confirmedLiveness
                  ? 'Presence confirmed. Pulse can now move to your address verification.'
                  : startedLiveness
                  ? 'Center your face. Blink once. Hold steady for a moment, then confirm.'
                  : 'This simulates the live presence check while the production camera provider is still pending.'}
              </BodyCopy>
            </Panel>

            <Stack>
              <StatusCard
                label={startedLiveness ? 'Camera alignment complete' : 'Camera alignment pending'}
                detail="Use balanced lighting and keep your face inside the ring."
                accent={startedLiveness ? 'var(--teal)' : 'var(--gold)'}
              />
              <StatusCard
                label={confirmedLiveness ? 'Liveness confirmed' : 'Blink prompt pending'}
                detail="Confirm once you are comfortable that the capture represents a live human."
                accent={confirmedLiveness ? 'var(--teal)' : 'var(--gold)'}
              />
            </Stack>

            <ActionRow>
              {!startedLiveness && (
                <PrimaryButton onClick={() => setStartedLiveness(true)}>
                  Start liveness check
                </PrimaryButton>
              )}
              {startedLiveness && !confirmedLiveness && (
                <PrimaryButton onClick={() => setConfirmedLiveness(true)}>
                  Confirm presence
                </PrimaryButton>
              )}
              {confirmedLiveness && (
                <PrimaryButton onClick={() => setStep(2)}>
                  Continue to Address
                </PrimaryButton>
              )}
              <SecondaryButton onClick={() => setStep(0)}>
                Back
              </SecondaryButton>
            </ActionRow>
          </>
        )}

        {step === 2 && (
          <>
            <Panel>
              <Field label="Street address">
                <input value={street} onChange={e => setStreet(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="City">
                <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Region / state">
                <input value={region} onChange={e => setRegion(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Postal code">
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Country">
                <input value={country} onChange={e => setCountry(e.target.value)} style={inputStyle} />
              </Field>
            </Panel>

            <InsightCard
              title="Shared Account State"
              body="Completing this mock flow updates users.tier to verified, which the live Pulse website and the mobile app both read for Truth Layer access."
              accent="var(--gold)"
            />

            {error && <ErrorBanner message={error} />}

            <ActionRow>
              <PrimaryButton disabled={!canFinish || submitting} onClick={handleComplete}>
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </PrimaryButton>
              <SecondaryButton onClick={() => setStep(1)}>
                Back
              </SecondaryButton>
            </ActionRow>
          </>
        )}
      </div>
    </div>
  )
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={backButtonStyle}>
      ← Back
    </button>
  )
}

function Progress({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 999,
            background: index < current ? 'rgba(76,201,168,0.92)' : 'rgba(76,201,168,0.16)',
          }}
        />
      ))}
    </div>
  )
}

function Panel({ children, centered = false }) {
  return (
    <div
      className="glass"
      style={{
        padding: 28,
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        textAlign: centered ? 'center' : 'left',
        alignItems: centered ? 'center' : 'stretch',
      }}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children, color }) {
  return (
    <div style={{
      fontSize: 12,
      color,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

function HeroTitle({ children }) {
  return (
    <h1 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(30px, 5vw, 42px)',
      fontWeight: 600,
      lineHeight: 1.15,
      marginBottom: 12,
    }}>
      {children}
    </h1>
  )
}

function BodyCopy({ children, style }) {
  return (
    <p style={{
      color: 'var(--text-muted)',
      fontSize: 15,
      lineHeight: 1.7,
      maxWidth: 560,
      marginBottom: 0,
      ...style,
    }}>
      {children}
    </p>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12,
      color: 'var(--text-muted)',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: 12,
      marginTop: 8,
    }}>
      {children}
    </div>
  )
}

function Stack({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
      {children}
    </div>
  )
}

function SelectableCard({ label, detail, selected, onClick, accent = 'var(--gold)' }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(10,12,26,0.82)',
        border: `1px solid ${selected ? `${accent}88` : 'rgba(201,168,76,0.14)'}`,
        borderRadius: 12,
        padding: '18px 20px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color var(--transition), background var(--transition)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: selected ? accent : 'var(--text)', marginBottom: detail ? 6 : 0 }}>
        {label}
      </div>
      {detail && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {detail}
        </div>
      )}
    </button>
  )
}

function DocumentPreview() {
  return (
    <div style={{
      width: '100%',
      minHeight: 140,
      borderRadius: 24,
      border: '1px solid rgba(201,168,76,0.32)',
      background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(76,201,168,0.05))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 52,
      color: 'var(--gold)',
    }}>
      ▣
    </div>
  )
}

function Viewfinder({ started, confirmed }) {
  return (
    <div style={{
      width: 220,
      height: 220,
      borderRadius: '50%',
      border: `1px solid ${started ? 'rgba(76,201,168,0.5)' : 'rgba(76,201,168,0.22)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    }}>
      <div style={{
        width: 156,
        height: 156,
        borderRadius: '50%',
        border: `1px solid ${started ? 'rgba(201,168,76,0.55)' : 'rgba(201,168,76,0.2)'}`,
        background: confirmed ? 'rgba(76,201,168,0.16)' : 'rgba(76,201,168,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 50,
        color: confirmed ? 'var(--teal)' : 'var(--gold)',
      }}>
        {confirmed ? '✓' : '◌'}
      </div>
    </div>
  )
}

function StatusCard({ label, detail, accent }) {
  return (
    <div style={{
      background: 'rgba(10,12,26,0.82)',
      border: `1px solid ${accent === 'var(--teal)' ? 'rgba(76,201,168,0.2)' : 'rgba(201,168,76,0.16)'}`,
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{ color: accent, fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
        {detail}
      </div>
    </div>
  )
}

function InsightCard({ title, body, accent }) {
  return (
    <div style={{
      background: 'rgba(10,12,26,0.62)',
      border: `1px solid ${accent === 'var(--teal)' ? 'rgba(76,201,168,0.2)' : 'rgba(201,168,76,0.16)'}`,
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 24,
    }}>
      <div style={{
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: accent,
        marginBottom: 8,
        fontWeight: 700,
      }}>
        {title}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  )
}

function VerifiedOrb() {
  return (
    <div style={{
      width: 220,
      height: 220,
      borderRadius: '50%',
      border: '1px solid rgba(76,201,168,0.34)',
      background: 'rgba(76,201,168,0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    }}>
      <div style={{
        width: 148,
        height: 148,
        borderRadius: '50%',
        border: '1px solid rgba(201,168,76,0.36)',
        background: 'rgba(201,168,76,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 58,
        color: 'var(--teal)',
      }}>
        ◈
      </div>
    </div>
  )
}

function ActionRow({ children }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {children}
    </div>
  )
}

function PrimaryButton({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 2,
        minWidth: 200,
        padding: '14px 20px',
        borderRadius: 10,
        border: '1px solid rgba(76,201,168,0.4)',
        background: disabled
          ? 'linear-gradient(135deg, rgba(76,201,168,0.15), rgba(76,201,168,0.1))'
          : 'linear-gradient(135deg, rgba(76,201,168,0.34), rgba(76,201,168,0.2))',
        color: disabled ? 'rgba(76,201,168,0.55)' : 'var(--teal)',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.03em',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 140,
        padding: '14px 20px',
        borderRadius: 10,
        border: '1px solid rgba(201,168,76,0.25)',
        background: 'none',
        color: 'var(--text-muted)',
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  )
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      color: '#C94C4C',
      fontSize: 13,
      background: 'rgba(201,76,76,0.1)',
      padding: '8px 12px',
      borderRadius: 8,
      marginBottom: 20,
    }}>
      {message}
    </div>
  )
}

const shellStyle = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '40px 20px 80px',
}

const backButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 13,
  marginBottom: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const mutedSmall = {
  color: 'var(--text-muted)',
  fontSize: 12,
  lineHeight: 1.6,
  textAlign: 'center',
}

const labelStyle = {
  fontSize: 12,
  color: 'var(--text-muted)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(76,201,168,0.18)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 15,
  outline: 'none',
}
