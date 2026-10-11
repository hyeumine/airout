import { create } from 'zustand'
import { api } from '../services/api'
import { deleteSecret, getSecret, setSecret } from '../services/secure'
import { sessionBridge } from '../services/session'
import { queryClient } from '../lib/queryClient'
import type { PublicUser } from '../types'

interface SessionPayload {
  accessToken: string
  refreshToken: string
  user: PublicUser
  devVerificationToken?: string
  devResetToken?: string
  message?: string
  emailDelivery?: string
}

interface AuthState {
  ready: boolean
  accessToken: string | null
  refreshToken: string | null
  user: PublicUser | null
  hydrate: () => Promise<void>
  applySession: (payload: SessionPayload) => Promise<void>
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => {
  sessionBridge.persist = async (access, refresh) => {
    sessionBridge.accessToken = access
    sessionBridge.refreshToken = refresh
    if (access) await setSecret('accessToken', access)
    else await deleteSecret('accessToken')
    if (refresh) await setSecret('refreshToken', refresh)
    else await deleteSecret('refreshToken')
    set({ accessToken: access, refreshToken: refresh })
  }

  return {
    ready: false,
    accessToken: null,
    refreshToken: null,
    user: null,
    hydrate: async () => {
      const accessToken = await getSecret('accessToken')
      const refreshToken = await getSecret('refreshToken')
      sessionBridge.accessToken = accessToken
      sessionBridge.refreshToken = refreshToken
      set({ accessToken, refreshToken })
      if (!accessToken && !refreshToken) {
        set({ ready: true, user: null })
        return
      }
      try {
        const me = await api<PublicUser>('/api/users/me')
        set({ user: me.data, ready: true })
      } catch {
        await sessionBridge.persist(null, null)
        set({ user: null, ready: true })
      }
    },
    applySession: async (payload) => {
      await sessionBridge.persist(payload.accessToken, payload.refreshToken)
      set({ user: payload.user, ready: true })
    },
    refreshUser: async () => {
      if (!get().accessToken) return
      const me = await api<PublicUser>('/api/users/me')
      set({ user: me.data })
    },
    signOut: async () => {
      const refreshToken = get().refreshToken
      try {
        if (refreshToken) await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) })
      } catch {
        // Local sign-out still proceeds when the server is unreachable.
      }
      await sessionBridge.persist(null, null)
      set({ user: null })
      queryClient.clear()
    },
  }
})

export function isSignedIn(state: AuthState = useAuthStore.getState()) {
  return Boolean(state.accessToken && state.user)
}
