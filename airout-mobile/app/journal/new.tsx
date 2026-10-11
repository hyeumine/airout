import React, { useState } from 'react'
import { router } from 'expo-router'
import { View } from 'react-native'
import { Button, Chip, ErrorNote, Field, Screen, Title } from '../../src/components/ui'
import { JOURNAL_PROMPTS, MOODS } from '../../src/content/copy'
import { todayKey } from '../../src/lib/format'
import { queryClient } from '../../src/lib/queryClient'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import type { Mood } from '../../src/types'

export default function NewJournalScreen() {
  const authed = Boolean(useAuthStore((state) => state.user))
  const saveJournal = useGuestStore((state) => state.saveJournal)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')

  async function save() {
    if (!body.trim()) {
      setError('Write a little before saving. It can be one sentence.')
      return
    }
    const payload = {
      title: title.trim(),
      body: body.trim(),
      mood,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
      entryDate: todayKey(),
    }
    try {
      if (authed) {
        await api('/api/journal', { method: 'POST', body: JSON.stringify(payload) })
        await queryClient.invalidateQueries({ queryKey: ['journal'] })
      } else {
        saveJournal(payload)
      }
      router.back()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The entry could not be saved.')
    }
  }

  return (
    <Screen>
      <Title subtitle="Only you can read this.">New reflection</Title>
      {error ? <ErrorNote message={error} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {JOURNAL_PROMPTS.map((prompt) => (
          <Chip key={prompt} label={prompt} onPress={() => setBody(prompt)} />
        ))}
      </View>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Entry" value={body} onChangeText={setBody} multiline style={{ minHeight: 140 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {MOODS.map((item) => (
          <Chip key={item.id} label={item.label} selected={mood === item.id} onPress={() => setMood(item.id)} />
        ))}
      </View>
      <Field label="Tags" value={tags} onChangeText={setTags} placeholder="school, rest" />
      <Button label="Save reflection" onPress={save} />
    </Screen>
  )
}
