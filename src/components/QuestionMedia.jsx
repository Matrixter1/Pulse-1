function hasQuestionMedia(src) {
  return typeof src === 'string' && src.trim().length > 0
}

function inferMediaKind(src) {
  if (!hasQuestionMedia(src)) return null

  const value = src.split('?')[0].split('#')[0].toLowerCase()
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

  return { ...base, maxHeight: 320, ...style }
}

export { hasQuestionMedia }

export default function QuestionMedia({
  src,
  alt = '',
  variant = 'detail',
  controls = false,
  style,
}) {
  if (!hasQuestionMedia(src)) return null

  const kind = inferMediaKind(src)
  const mediaStyle = getMediaStyles(variant, style)

  if (kind === 'video') {
    const isDetail = variant === 'detail'

    return (
      <video
        src={src}
        style={mediaStyle}
        muted={!isDetail}
        loop={!isDetail}
        autoPlay={!isDetail}
        playsInline
        controls={controls || isDetail}
        preload="metadata"
      />
    )
  }

  return <img src={src} alt={alt} style={mediaStyle} />
}
