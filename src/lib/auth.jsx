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
        .upsert({ id: userId, email: user?.email ?? '', tier: 'registered' }, { onConflict: 'id' })
        .select()
        .single()
      data = upserted
    }

    setProfile(data)
    setLoading(false)
  }

  const tier = profile?.tier ?? 'guest'

  async function signInAnonymously() {
    // Store guest session in localStorage
    localStorage.setItem('pulse_tier', 'guest')
    setProfile({ tier: 'guest' })
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
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
          { id: data.user.id, email, tier: 'registered' },
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

  return (
    <AuthContext.Provider value={{ user, profile, tier, loading, signUp, signIn, signOut, signInAnonymously }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
