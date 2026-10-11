import React, { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { useGuestStore } from '../store/guestStore'
import { darkColors, lightColors, type Palette } from './colors'
import type { ThemeChoice } from '../types'

interface ThemeValue {
  colors: Palette
  scheme: 'light' | 'dark'
  choice: ThemeChoice
}

const ThemeContext = createContext<ThemeValue>({ colors: lightColors, scheme: 'light', choice: 'system' })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme()
  const guestTheme = useGuestStore((state) => state.theme)
  const accountTheme = useAuthStore((state) => state.user?.preferences.theme)
  const choice = accountTheme ?? guestTheme
  const scheme = choice === 'system' ? (system === 'dark' ? 'dark' : 'light') : choice
  const value = useMemo<ThemeValue>(
    () => ({ colors: scheme === 'dark' ? darkColors : lightColors, scheme, choice }),
    [scheme, choice],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
