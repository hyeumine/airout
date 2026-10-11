import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Banner, Button, Card, EmptyState, ErrorNote, Field, LoadingState, Muted, Screen, Title } from '../../src/components/ui'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import { useTheme } from '../../src/theme/ThemeProvider'
import type { JournalItem } from '../../src/types'

export default function JournalScreen() {
  const { colors } = useTheme()
  const authed = Boolean(useAuthStore((state) => state.user))
  const local = useGuestStore((state) => state.journal)
  const [q, setQ] = useState('')
  const query = useQuery({
    queryKey: ['journal', q],
    enabled: authed,
    queryFn: async () => (await api<JournalItem[]>(`/api/journal?q=${encodeURIComponent(q)}`)).data,
  })
  const entries = authed ? query.data ?? [] : local.filter((item) => `${item.title} ${item.body} ${item.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const marked = useMemo(() => new Set(entries.map((item) => item.entryDate)), [entries])
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  return (
    <Screen safe>
      <Title subtitle="Private by default. Entries are not posted to the community and are not used to train a model.">Personal journal</Title>
      <Banner>{authed ? 'Saved to your account. Other members and moderators cannot read this.' : 'Stored on this device only. This storage is not encrypted.'}</Banner>
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Search your words" />
      <Button label="New entry" onPress={() => router.push('/journal/new')} />
      <Card>
        <Muted>{now.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {Array.from({ length: first }).map((_, index) => <View key={`pad-${index}`} style={{ width: '14.2%', height: 32 }} />)}
          {Array.from({ length: days }).map((_, index) => {
            const day = index + 1
            const key = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
            const has = marked.has(key)
            return (
              <View key={key} style={{ width: '14.2%', height: 32, alignItems: 'center' }}>
                <Text style={{ color: has ? colors.primary : colors.muted, fontWeight: has ? '800' : '400' }}>{day}</Text>
              </View>
            )
          })}
        </View>
        <Muted>Days with an entry are highlighted. This calendar is a memory aid, not a mood diagnosis.</Muted>
      </Card>
      {authed && query.isLoading ? <LoadingState /> : null}
      {authed && query.isError ? <ErrorNote message="The journal could not be loaded from your account." /> : null}
      {!entries.length ? <EmptyState title="Your journal is quiet" body="A few honest sentences are enough. Nothing here is published for you." /> : null}
      {entries.map((entry) => (
        <Pressable key={entry.id} accessibilityRole="button" onPress={() => router.push(`/journal/${entry.id}`)}>
          <Card>
            <Muted>{entry.entryDate}</Muted>
            {entry.title ? <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 4 }}>{entry.title}</Text> : null}
            <Text style={{ color: colors.ink, lineHeight: 21 }}>{entry.body.slice(0, 180)}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}
