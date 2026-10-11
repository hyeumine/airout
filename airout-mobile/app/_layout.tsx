import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { io } from 'socket.io-client'
import { LoadingState } from '../src/components/ui'
import { API_URL } from '../src/config/api'
import { queryClient } from '../src/lib/queryClient'
import { useAuthStore } from '../src/store/authStore'
import { useGuestStore } from '../src/store/guestStore'
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider'

function Gate({ children }: { children: React.ReactNode }) {
  const ready = useAuthStore((state) => state.ready)
  const hydrate = useAuthStore((state) => state.hydrate)
  const hydrated = useGuestStore((state) => state.hydrated)
  const token = useAuthStore((state) => state.accessToken)
  useEffect(() => {
    hydrate()
    const timer = setTimeout(() => useGuestStore.setState({ hydrated: true }), 1600)
    return () => clearTimeout(timer)
  }, [hydrate])
  useEffect(() => {
    if (!token) return undefined
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    }
    socket.on('community:activity', refresh)
    return () => {
      socket.close()
    }
  }, [token])
  if (!ready || !hydrated) return <LoadingState label="Opening your space…" />
  return <>{children}</>
}

function ThemedStack() {
  const { colors, scheme } = useTheme()
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'AIrOut' }} />
        <Stack.Screen name="login" options={{ title: 'Sign in' }} />
        <Stack.Screen name="register" options={{ title: 'Create account' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
        <Stack.Screen name="verify-email" options={{ title: 'Verify email' }} />
        <Stack.Screen name="post/new" options={{ title: 'Share' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
        <Stack.Screen name="journal/new" options={{ title: 'New reflection' }} />
        <Stack.Screen name="journal/[id]" options={{ title: 'Journal entry' }} />
        <Stack.Screen name="circles/index" options={{ title: 'Support circles' }} />
        <Stack.Screen name="circles/[id]" options={{ title: 'Circle' }} />
        <Stack.Screen name="mood/index" options={{ title: 'Mood history' }} />
        <Stack.Screen name="settings/privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="guidelines" options={{ title: 'Guidelines' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notices' }} />
        <Stack.Screen name="moderation/index" options={{ title: 'Moderation' }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Gate>
            <ThemedStack />
          </Gate>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
