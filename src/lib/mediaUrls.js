export function getOptimizedFeedMediaUrl(question) {
  if (!question) return ''
  return question.thumbnail_url || deriveCloudinaryThumbnailUrl(question.image_url) || question.image_url || ''
}

export function deriveCloudinaryThumbnailUrl(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return ''
  }

  const [prefix, rest] = url.split('/upload/')
  if (!prefix || !rest) return ''

  const segments = rest.split('/')
  const firstSegment = segments[0] || ''
  const hasTransformSegment = firstSegment.includes(',') || firstSegment.startsWith('v')
  const publicPath = hasTransformSegment ? segments.slice(1).join('/') : rest

  if (!publicPath) return ''

  const isVideoDelivery = prefix.includes('/video')
  const transform = isVideoDelivery
    ? 'so_0,w_900,c_limit,q_auto:eco,f_jpg'
    : 'w_900,c_limit,q_auto:eco,f_auto'

  return `${prefix}/upload/${transform}/${publicPath}`
}
