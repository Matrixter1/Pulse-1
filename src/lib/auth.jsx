import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    // Row missing (trigger may not have fired yet, or backfill needed).
    // Upsert a fallback row so the app never runs profileless.
    if (error?.code === 'PGRST116' || !data) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: upserted } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            email: user?.email ?? '',
            display_name: readAuthMeta(user, 'display_name') ?? readAuthMeta(user, 'nickname'),
            nickname: readAuthMeta(user, 'display_name') ?? readAuthMeta(user, 'nickname'),
            first_name: readAuthMeta(user, 'first_name'),
            last_name: readAuthMeta(user, 'last_name'),
            country: readAuthMeta(user, 'country'),
            tier: 'registered',
          },
          { onConflict: 'id' },
        )
        .select()
        .single()
      data = upserted
    }

    setProfile(data)
    setLoading(false)
    return data
  }

  const tier = profile?.tier ?? 'guest'

  async function signInAnonymously() {
    // Store guest session in localStorage
    localStorage.setItem('pulse_tier', 'guest')
    setProfile({ tier: 'guest' })
  }

  async function signUp(email, password, profileInput = {}) {
    const payload = normalizeProfileInput(profileInput)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: payload.display_name,
          nickname: payload.nickname,
          first_name: payload.first_name,
          last_name: payload.last_name,
          country: payload.country,
        },
      },
    })
    if (error) throw error

    // Optimistic client-side insert so the row exists immediately,
    // even if the DB trigger fires a moment later or email
    // confirmation is enabled (no active session yet).
    // Uses upsert + service-role-safe ON CONFLICT so it never
    // throws a duplicate-key error if the trigger already ran.
    if (data.user) {
      const { error: insertError } = await supabase
        .from('users')
        .upsert(
          {
            id: data.user.id,
            email,
            tier: 'registered',
            ...payload,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      // Log but don't throw — the DB trigger is the source of truth.
      // A failure here (e.g. RLS blocks it pre-session) is non-fatal.
      if (insertError) {
        console.warn('[Pulse] signUp profile upsert blocked (trigger will handle it):', insertError.message)
      }
    }

    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function updateNickname(nickname) {
    return updateProfile({ displayName: nickname })
  }

  async function updateProfile(profileInput) {
    if (!user) throw new Error('Sign in before updating your profile.')

    const payload = normalizeProfileInput(profileInput)
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error

    await supabase.auth.updateUser({
      data: {
        display_name: payload.display_name,
        nickname: payload.nickname,
        first_name: payload.first_name,
        last_name: payload.last_name,
        country: payload.country,
      },
    })

    setProfile(data)
    return data
  }

  async function completeVerification() {
    if (!user) throw new Error('Sign in before starting verification.')

    let existing = profile

    if (!existing) {
      existing = await fetchProfile(user.id)
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        email: user.email ?? existing?.email ?? '',
        tier: 'verified',
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, profile, tier, loading, signUp, signIn, signOut, signInAnonymously, updateNickname, updateProfile, completeVerification }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function normalizeProfileInput(profileInput = {}) {
  const displayName = normalizeOptional(profileInput.displayName ?? profileInput.display_name ?? profileInput.nickname)

  return {
    display_name: displayName,
    nickname: displayName,
    first_name: normalizeOptional(profileInput.firstName ?? profileInput.first_name),
    last_name: normalizeOptional(profileInput.lastName ?? profileInput.last_name),
    country: normalizeOptional(profileInput.country),
    avatar_url: normalizeOptional(profileInput.avatarUrl ?? profileInput.avatar_url),
    bio: normalizeOptional(profileInput.bio),
  }
}

function normalizeOptional(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readAuthMeta(user, key) {
  const value = user?.user_metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
