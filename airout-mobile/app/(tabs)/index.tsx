import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Banner, Button, Card, ErrorNote, Field, Muted, Screen } from '../../src/components/ui'
import { MOODS } from '../../src/content/copy'
import { API_URL } from '../../src/config/api'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import type { Mood, MoodItem } from '../../src/types'
import { useTheme } from '../../src/theme/ThemeProvider'

export default function HomeScreen() {
  const { colors } = useTheme()
  const user = useAuthStore((state) => state.user)
  const authed = Boolean(user)
  const alias = useGuestStore((state) => state.alias)
  const guestHistory = useGuestStore((state) => state.moodHistory)
  const saveGuest = useGuestStore((state) => state.saveMood)
  const [mood, setMood] = useState<Mood | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const name = user?.profile.displayName || alias || 'friend'
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/health`)
      if (!response.ok) throw new Error('down')
      return true
    },
    retry: false,
  })
  const moods = useQuery({
    queryKey: ['moods'],
    enabled: authed,
    queryFn: async () => (await api<MoodItem[]>('/api/moods')).data,
  })
  const latest = authed ? moods.data?.[0] : guestHistory[0]
  const recent = (authed ? moods.data ?? [] : guestHistory).slice(0, 7)

  async function save() {
    if (!mood) {
      setError('Choose the feeling that is closest. There is no wrong answer.')
      return
    }
    setError('')
    try {
      if (authed) {
        await api('/api/moods', { method: 'POST', body: JSON.stringify({ mood, note }) })
        await moods.refetch()
      } else {
        saveGuest(mood, note)
      }
      setMessage('Saved for today. This is a personal note, not an assessment.')
      setNote('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The check-in could not be saved.')
    }
  }

  return (
    <Screen safe>
      <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 }}>AIrOut</Text>
      <View style={{ width: 72, height: 3, borderRadius: 99, backgroundColor: colors.primary, marginTop: 4, marginBottom: 18 }} />
      <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>Hi, {name}</Text>
      <Text style={{ color: colors.muted, fontSize: 18, marginTop: 4, marginBottom: 16 }}>How are you feeling today?</Text>
      <Banner>
        {authed
          ? 'Signed in. Your journal and chats stay with your account.'
          : health.data
            ? 'On this device for now. The shared server is reachable when you want to sign in.'
            : 'On this device for now. Listening and journaling still work without the server.'}
      </Banner>
      {error ? <ErrorNote message={error} /> : null}
      {message ? <Muted>{message}</Muted> : null}
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 12 }}>Today</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MOODS.map((item) => {
            const selected = mood === item.id
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                onPress={() => setMood(item.id)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: item.tint,
                  borderWidth: selected ? 2 : 0,
                  borderColor: colors.primary,
                }}
              >
                <Text style={{ fontSize: 26 }}>{item.face}</Text>
              </Pressable>
            )
          })}
        </View>
        <Text style={{ color: colors.muted, marginTop: 10, marginBottom: 4 }}>
          {mood ? MOODS.find((item) => item.id === mood)?.label : 'Choose what feels closest.'}
        </Text>
        <Field label="A short note" value={note} onChangeText={setNote} placeholder="A sentence is enough." />
        <Button label="Save check-in" onPress={save} />
      </Card>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/ai')}
          style={{ flex: 1, backgroundColor: colors.blush, borderRadius: 28, padding: 18, minHeight: 140, justifyContent: 'flex-end' }}
        >
          <Text style={{ fontSize: 28, marginBottom: 8 }}>✦</Text>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Listen</Text>
          <Text style={{ color: colors.ink, marginTop: 4, lineHeight: 20 }}>A private space to talk.</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/community')}
          style={{ flex: 1, backgroundColor: colors.sky, borderRadius: 28, padding: 18, minHeight: 140, justifyContent: 'flex-end' }}
        >
          <Text style={{ fontSize: 28, marginBottom: 8 }}>♥</Text>
          <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Community</Text>
          <Text style={{ color: colors.ink, marginTop: 4, lineHeight: 20 }}>People who will hear you.</Text>
        </Pressable>
      </View>
      <Card>
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>Recent check-ins</Text>
        <Muted>A gentle look back. This is a memory, not a diagnosis.</Muted>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 }}>
          {recent.length ? recent.map((item) => {
            const moodItem = MOODS.find((entry) => entry.id === item.mood)
            return (
              <View key={item.id} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: moodItem?.tint ?? colors.lilac, alignItems: 'center', justifyContent: 'center' }}>
                <Text>{moodItem?.face ?? '·'}</Text>
              </View>
            )
          }) : <Muted>Your week is still open.</Muted>}
        </View>
        {latest?.note ? <Muted>{latest.note}</Muted> : null}
        <Button label="See mood history" variant="outline" onPress={() => router.push('/mood')} />
      </Card>
      <Muted>AIrOut is a listening companion, not a therapist and not emergency help.</Muted>
      {!user?.emailVerified && authed ? (
        <Button label="Verify email" variant="quiet" onPress={() => router.push('/verify-email')} />
      ) : null}
    </Screen>
  )
}
