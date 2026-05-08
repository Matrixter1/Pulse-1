export function getOptimizedFeedMediaUrl(question) {
  if (!question) return ''

  const thumbnailUrl = question.thumbnail_url || ''
  if (thumbnailUrl && !isCloudinaryVideoUrl(thumbnailUrl)) {
    return thumbnailUrl
  }

  return (
    deriveCloudinaryThumbnailUrl(thumbnailUrl || question.image_url) ||
    question.image_url ||
    ''
  )
}

export function deriveCloudinaryThumbnailUrl(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return ''
  }

  const [prefix, rest] = url.split('/upload/')
  if (!prefix || !rest) return ''

  const segments = rest.split('/').filter(Boolean)
  const publicStart = segments.findIndex((segment) => !isCloudinaryTransformSegment(segment))
  const publicPath = (publicStart >= 0 ? segments.slice(publicStart) : segments).join('/')

  if (!publicPath) return ''

  const isVideoDelivery = prefix.includes('/video') || isVideoFilePath(publicPath)
  const transform = isVideoDelivery
    ? 'so_0,w_900,c_limit,q_auto:eco,f_jpg'
    : 'w_900,c_limit,q_auto:eco,f_auto'
  const derivedPath = isVideoDelivery ? stripMediaExtension(publicPath) : publicPath

  return `${prefix}/upload/${transform}/${derivedPath}${isVideoDelivery ? '.jpg' : ''}`
}

function isCloudinaryVideoUrl(url) {
  return Boolean(url && url.includes('res.cloudinary.com') && url.includes('/video/upload/'))
}

function isCloudinaryTransformSegment(segment) {
  return (
    segment.includes(',') ||
    /^v\d+$/.test(segment) ||
    /^(a_|ac_|ar_|b_|br_|c_|co_|cs_|d_|dl_|dn_|dpr_|du_|e_|eo_|f_|fl_|fn_|g_|h_|l_|o_|pg_|q_|r_|so_|sp_|t_|u_|vc_|vs_|w_|x_|y_|z_)/.test(segment)
  )
}

function isVideoFilePath(path) {
  return /\.(mp4|mov|m4v|webm)$/i.test(path)
}

function stripMediaExtension(path) {
  return path.replace(/\.(mp4|mov|m4v|webm|jpg|jpeg|png|webp|gif)$/i, '')
}
