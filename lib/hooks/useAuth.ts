'use client'

import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
  })
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const profile = await fetchProfile(user.id)
        setState({
          user,
          profile,
          loading: false,
          isAdmin: profile?.rol === 'admin',
        })
      } else {
        setState({ user: null, profile: null, loading: false, isAdmin: false })
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            loading: false,
            isAdmin: profile?.rol === 'admin',
          })
        } else {
          setState({ user: null, profile: null, loading: false, isAdmin: false })
        }
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { ...state, signOut }
}
