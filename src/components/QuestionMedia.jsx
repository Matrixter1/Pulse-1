import { useEffect, useState } from 'react'

function hasQuestionMedia(src) {
  return typeof src === 'string' && src.trim().length > 0
}

function inferMediaKind(src) {
  if (!hasQuestionMedia(src)) return null

  const value = src.split('?')[0].split('#')[0].toLowerCase()
  if (value.includes('res.cloudinary.com') && value.includes('/video/upload/')) return 'video'
  if (/\.(mp4|mov|m4v|webm)$/.test(value)) return 'video'
  return 'image'
}

function getMediaStyles(variant, style) {
  const base = {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    background: 'rgba(0,0,0,0.2)',
  }

  if (variant === 'hero') {
    return { ...base, height: 200, ...style }
  }

  if (variant === 'card') {
    return { ...base, height: 220, ...style }
  }

  if (variant === 'reference') {
    return {
      ...base,
      height: '100%',
      objectFit: 'contain',
      background: 'rgba(5,7,16,0.72)',
      ...style,
    }
  }

  return { ...base, maxHeight: 520, objectFit: 'contain', ...style }
}

export { hasQuestionMedia }

function MediaFallback({ mediaStyle }) {
  return (
    <div
      style={{
        ...mediaStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 24,
        boxSizing: 'border-box',
        border: '1px solid rgba(201,168,76,0.18)',
        background:
          'radial-gradient(circle at center, rgba(201,168,76,0.11), rgba(5,7,16,0.94) 64%)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.42)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--gold)',
          fontFamily: 'var(--font-ui, inherit)',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: 'rgba(201,168,76,0.08)',
        }}
      >
        Pulse
      </div>
      <div
        style={{
          color: 'var(--gold)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Media unavailable
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
        The signal is still live. The media can be refreshed or replaced from Admin.
      </div>
    </div>
  )
}

function VideoPreview({ mediaStyle }) {
  return (
    <div
      style={{
        ...mediaStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 24,
        boxSizing: 'border-box',
        border: '1px solid rgba(76,201,168,0.18)',
        background:
          'radial-gradient(circle at center, rgba(76,201,168,0.14), rgba(5,7,16,0.94) 62%)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: '1px solid rgba(76,201,168,0.46)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--teal)',
          fontFamily: 'var(--font-ui, inherit)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'rgba(76,201,168,0.08)',
        }}
      >
        Play
      </div>
      <div
        style={{
          color: 'var(--gold)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Video signal
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
        Open the question to load and play the full media.
      </div>
    </div>
  )
}

export default function QuestionMedia({
  src,
  alt = '',
  variant = 'detail',
  controls = false,
  style,
}) {
  const [hasLoadError, setHasLoadError] = useState(false)

  useEffect(() => {
    setHasLoadError(false)
  }, [src])

  if (!hasQuestionMedia(src)) return null

  const kind = inferMediaKind(src)
  const mediaStyle = getMediaStyles(variant, style)

  if (hasLoadError) {
    return <MediaFallback mediaStyle={mediaStyle} />
  }

  if (kind === 'video') {
    const shouldLoadVideo = variant === 'detail' || variant === 'reference'
    if (!shouldLoadVideo) {
      return <VideoPreview mediaStyle={mediaStyle} />
    }

    const enforceMute = (event) => {
      if (!shouldLoadVideo) {
        event.currentTarget.muted = true
        event.currentTarget.defaultMuted = true
        event.currentTarget.volume = 0
      }
    }

    return (
      <video
        src={src}
        style={mediaStyle}
        muted={false}
        defaultMuted={false}
        loop={false}
        autoPlay={false}
        playsInline
        controls={controls || shouldLoadVideo}
        preload="metadata"
        onLoadedMetadata={enforceMute}
        onPlay={enforceMute}
        onError={() => setHasLoadError(true)}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      style={mediaStyle}
      loading="lazy"
      decoding="async"
      onError={() => setHasLoadError(true)}
    />
  )
}
