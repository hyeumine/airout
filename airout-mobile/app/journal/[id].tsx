import React, { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Button, ErrorNote, Field, LoadingState, Screen, Title } from '../../src/components/ui'
import { queryClient } from '../../src/lib/queryClient'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import type { JournalItem } from '../../src/types'

export default function EditJournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entryId = String(id)
  const authed = Boolean(useAuthStore((state) => state.user))
  const local = useGuestStore((state) => state.journal.find((item) => item.id === entryId))
  const saveJournal = useGuestStore((state) => state.saveJournal)
  const deleteJournal = useGuestStore((state) => state.deleteJournal)
  const query = useQuery({
    queryKey: ['journal-entry', entryId],
    enabled: authed,
    queryFn: async () => (await api<JournalItem>(`/api/journal/${entryId}`)).data,
  })
  const source = authed ? query.data : local
  const [title, setTitle] = useState(source?.title ?? '')
  const [body, setBody] = useState(source?.body ?? '')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(!authed)

  React.useEffect(() => {
    if (source && !ready) {
      setTitle(source.title)
      setBody(source.body)
      setReady(true)
    }
  }, [source, ready])

  async function save() {
    try {
      if (authed) {
        await api(`/api/journal/${entryId}`, { method: 'PATCH', body: JSON.stringify({ title, body }) })
        await queryClient.invalidateQueries({ queryKey: ['journal'] })
      } else if (local) {
        saveJournal({ ...local, title, body, id: local.id })
      }
      router.back()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The entry could not be updated.')
    }
  }

  async function remove() {
    if (authed) {
      await api(`/api/journal/${entryId}`, { method: 'DELETE' })
      await queryClient.invalidateQueries({ queryKey: ['journal'] })
    } else deleteJournal(entryId)
    router.back()
  }

  if (authed && query.isLoading) return <Screen><LoadingState /></Screen>
  if (!source && !authed) return <Screen><Title>That entry is not on this device</Title></Screen>

  return (
    <Screen>
      <Title subtitle="Still private.">Edit reflection</Title>
      {error ? <ErrorNote message={error} /> : null}
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Entry" value={body} onChangeText={setBody} multiline style={{ minHeight: 160 }} />
      <Button label="Save changes" onPress={save} />
      <Button label="Delete entry" variant="outline" onPress={remove} />
    </Screen>
  )
}
