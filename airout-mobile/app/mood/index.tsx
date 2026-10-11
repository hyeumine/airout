import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { Banner, Card, Muted, Screen, Title } from '../../src/components/ui'
import { MOODS } from '../../src/content/copy'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import { useTheme } from '../../src/theme/ThemeProvider'
import type { MoodItem } from '../../src/types'

export default function MoodScreen() {
  const { colors } = useTheme()
  const authed = Boolean(useAuthStore((state) => state.user))
  const local = useGuestStore((state) => state.moodHistory)
  const summary = useQuery({
    queryKey: ['mood-summary'],
    enabled: authed,
    queryFn: async () => (await api<{ disclaimer: string; week: Record<string, number>; recent: MoodItem[] }>('/api/moods/summary')).data,
  })
  const history = authed ? summary.data?.recent ?? [] : local
  const week = summary.data?.week
  const localWeek = MOODS.map((mood) => ({ ...mood, count: local.filter((item) => item.mood === mood.id).length }))

  return (
    <Screen>
      <Title subtitle="A personal record of check-ins. Not a diagnosis, ranking, or prediction.">Mood history</Title>
      <Banner>{summary.data?.disclaimer ?? 'These notes describe how days felt to you. They do not assess mental health.'}</Banner>
      <Card>
        {(authed && week ? MOODS.map((mood) => ({ ...mood, count: week[mood.id] ?? 0 })) : localWeek).map((mood) => (
          <View key={mood.id} style={{ marginBottom: 8 }}>
            <Muted>{`${mood.label} · ${mood.count}`}</Muted>
            <View style={{ height: 8, borderRadius: 8, backgroundColor: colors.primarySoft }}>
              <View style={{ height: 8, borderRadius: 8, width: `${Math.min(100, mood.count * 20)}%`, backgroundColor: colors.primary }} />
            </View>
          </View>
        ))}
      </Card>
      {history.map((item) => (
        <Card key={item.id}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>{item.mood}</Text>
          <Muted>{item.recordedOn}</Muted>
          {item.note ? <Muted>{item.note}</Muted> : null}
        </Card>
      ))}
    </Screen>
  )
}
