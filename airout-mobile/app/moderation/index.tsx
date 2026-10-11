import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, ErrorNote, Field, Muted, Screen, Title } from '../../src/components/ui'
import { queryClient } from '../../src/lib/queryClient'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'

interface ReportItem {
  id: string
  reason: string
  excerpt: string | null
  displayName: string | null
  status: string
}

export default function ModerationScreen() {
  const user = useAuthStore((state) => state.user)
  const staff = user && user.role !== 'user'
  const [statement, setStatement] = useState('')
  const [error, setError] = useState('')
  const reports = useQuery({
    queryKey: ['reports'],
    enabled: Boolean(staff),
    queryFn: async () => (await api<ReportItem[]>('/api/moderation/reports')).data,
  })
  const summary = useQuery({
    queryKey: ['admin-summary'],
    enabled: Boolean(staff),
    queryFn: async () => (await api<{ users: number; posts: number; openReports: number; postsLast7Days: number; note: string }>('/api/admin/summary')).data,
  })

  async function resolve(id: string, action: 'dismiss' | 'hide' | 'remove' | 'suspend') {
    setError('')
    try {
      await api(`/api/moderation/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That action could not be saved.')
    }
  }

  async function appeal() {
    setError('')
    try {
      await api('/api/appeals', { method: 'POST', body: JSON.stringify({ statement }) })
      setStatement('')
      setError('Appeal submitted. A moderator can review it without opening your journal.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The appeal could not be sent.')
    }
  }

  return (
    <Screen>
      <Title subtitle="Private journals and AI chats are not part of this queue.">Moderation</Title>
      {error ? <ErrorNote message={error} /> : null}
      {!staff ? (
        <>
          <Muted>If a community decision affected your account, you can ask for another look. Include what happened, not someone else’s private story.</Muted>
          <Field label="Appeal" value={statement} onChangeText={setStatement} multiline style={{ minHeight: 120 }} />
          <Button label="Send appeal" onPress={appeal} />
        </>
      ) : null}
      {summary.data ? <Muted>{`${summary.data.note} Open reports: ${summary.data.openReports}. Posts in 7 days: ${summary.data.postsLast7Days}.`}</Muted> : null}
      {reports.data?.map((report) => (
        <Card key={report.id}>
          <Muted>{`${report.displayName ?? 'Member'} · ${report.reason}`}</Muted>
          <Muted>{report.excerpt ?? 'No excerpt available.'}</Muted>
          <Button label="Dismiss" variant="outline" onPress={() => resolve(report.id, 'dismiss')} />
          <Button label="Hide" variant="outline" onPress={() => resolve(report.id, 'hide')} />
          <Button label="Remove" variant="outline" onPress={() => resolve(report.id, 'remove')} />
          <Button label="Suspend community access" variant="quiet" onPress={() => resolve(report.id, 'suspend')} />
        </Card>
      ))}
    </Screen>
  )
}
