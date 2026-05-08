import { supabase } from './supabase'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUDINARY_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || 'pulse/questions'

export function isCloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET)
}

export async function uploadQuestionMedia(file) {
  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(file)
  }

  return uploadToSupabase(file)
}

export async function uploadRemoteQuestionMedia(url) {
  const safeUrl = String(url || '').trim()
  if (!safeUrl) throw new Error('Missing remote media URL.')
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured for this deployment.')

  return uploadToCloudinary(safeUrl)
}

async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', CLOUDINARY_FOLDER)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    const body = await safeReadJson(response)
    throw new Error(body?.error?.message || `Cloudinary upload failed with ${response.status}`)
  }

  const data = await response.json()
  const resourceType = data.resource_type === 'video' ? 'video' : 'image'

  return {
    imageUrl: buildCloudinaryDeliveryUrl(data, resourceType, 'full') || data.secure_url,
    thumbnailUrl: buildCloudinaryDeliveryUrl(data, resourceType, 'thumbnail') || data.secure_url,
    provider: 'cloudinary',
  }
}

async function uploadToSupabase(file) {
  const ext = file.name.split('.').pop()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error: uploadErr } = await supabase.storage
    .from('question-images')
    .upload(name, file, { contentType: file.type, upsert: false })

  if (uploadErr) throw new Error(`Media upload failed: ${uploadErr.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('question-images')
    .getPublicUrl(name)

  return {
    imageUrl: publicUrl,
    thumbnailUrl: null,
    provider: 'supabase',
  }
}

function buildCloudinaryDeliveryUrl(data, resourceType, variant) {
  if (!CLOUDINARY_CLOUD_NAME || !data?.public_id) return ''

  if (resourceType === 'video') {
    const transform = variant === 'thumbnail'
      ? 'so_0,w_900,c_limit,q_auto:eco,f_jpg'
      : 'q_auto:eco'
    const extension = variant === 'thumbnail' ? 'jpg' : data.format || 'mp4'
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${transform}/${data.public_id}.${extension}`
  }

  const transform = variant === 'thumbnail'
    ? 'w_900,c_limit,q_auto:eco,f_auto'
    : 'w_1800,c_limit,q_auto:good,f_auto'
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transform}/${data.public_id}`
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
