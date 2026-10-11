import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, EmptyState, Muted, Screen, Title } from '../src/components/ui'
import { formatWhen } from '../src/lib/format'
import { queryClient } from '../src/lib/queryClient'
import { api } from '../src/services/api'
import { useAuthStore } from '../src/store/authStore'

interface Notice {
  id: string
  title: string
  body: string
  createdAt: string
  readAt: string | null
}

export default function NotificationsScreen() {
  const authed = Boolean(useAuthStore((state) => state.user))
  const query = useQuery({
    queryKey: ['notifications'],
    enabled: authed,
    queryFn: async () => (await api<Notice[]>('/api/notifications')).data,
  })

  async function markRead() {
    await api('/api/notifications/read', { method: 'POST', body: JSON.stringify({}) })
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <Screen>
      <Title subtitle="Short and general on purpose.">Notices</Title>
      {!authed ? <Muted>Sign in to see account notices. On-device mode does not send any.</Muted> : null}
      {authed ? <Button label="Mark all read" variant="outline" onPress={markRead} /> : null}
      {authed && query.data && !query.data.length ? <EmptyState title="No notices" body="Replies and reactions appear here only if you opted in." /> : null}
      {query.data?.map((notice) => (
        <Card key={notice.id}>
          <Muted>{notice.title}</Muted>
          <Muted>{notice.body}</Muted>
          <Muted>{formatWhen(notice.createdAt)}</Muted>
        </Card>
      ))}
    </Screen>
  )
}
