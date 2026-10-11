import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { View } from 'react-native'
import { Banner, Button, Card, Chip, ErrorNote, Field, Muted, Screen, Title } from '../../src/components/ui'
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
  const guestHistory = useGuestStore((state) => state.moodHistory)
  const saveGuest = useGuestStore((state) => state.saveMood)
  const [mood, setMood] = useState<Mood | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
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
      <Title subtitle="A space to be heard. A community that cares.">AIrOut</Title>
      <Muted>I Will Listen!</Muted>
      <Banner>
        {authed
          ? 'You are signed in. Journal, mood, and chats you consent to save stay with your account.'
          : 'You are on this device only. Nothing here is shared until you create an account and choose to post.'}
      </Banner>
      <Banner>
        {health.data
          ? 'The shared server is reachable.'
          : 'The shared server is not connected. Listening, journaling, and the on-device wall still work here.'}
      </Banner>
      <Title subtitle="Choose what feels closest.">How are you feeling today?</Title>
      {error ? <ErrorNote message={error} /> : null}
      {message ? <Muted>{message}</Muted> : null}
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {MOODS.map((item) => (
            <Chip key={item.id} label={item.label} selected={mood === item.id} onPress={() => setMood(item.id)} />
          ))}
        </View>
        <Field label="Optional note" value={note} onChangeText={setNote} placeholder="A sentence is enough." />
        <Button label="Save check-in" onPress={save} />
      </Card>
      {latest ? (
        <Card>
          <Muted>{`Latest check-in: ${latest.mood}${latest.note ? ` — ${latest.note}` : ''}`}</Muted>
          <Button label="See mood history" variant="outline" onPress={() => router.push('/mood')} />
        </Card>
      ) : null}
      <Card>
        <Title>You deserve to be heard</Title>
        <Muted>Share privately with AIrOut, or connect with people who want to listen.</Muted>
        <Button label="Talk to AIrOut" onPress={() => router.push('/ai')} />
        <Button label="Visit community" variant="outline" onPress={() => router.push('/community')} />
      </Card>
      <Card>
        <Muted>It is okay to take things one moment at a time.</Muted>
        <Muted>AIrOut is a listening companion, not a therapist and not emergency help.</Muted>
      </Card>
      {!user?.emailVerified && authed ? (
        <Button label="Verify email" variant="quiet" onPress={() => router.push('/verify-email')} />
      ) : null}
      <View style={{ height: 8, backgroundColor: colors.bg }} />
    </Screen>
  )
}
