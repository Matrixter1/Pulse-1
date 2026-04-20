const DEFAULT_ADMIN_EMAILS = ['wolff@matrixter.com']

function normalizeAdminEmailList(value) {
  if (!value) return []

  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function getAdminEmails() {
  const envEmails = normalizeAdminEmailList(import.meta.env.VITE_ADMIN_EMAIL)
  const merged = [...envEmails, ...DEFAULT_ADMIN_EMAILS]
  return [...new Set(merged)]
}

export function isAdminUser(user) {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  return getAdminEmails().includes(email)
}
