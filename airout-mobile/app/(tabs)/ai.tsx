import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Speech from 'expo-speech'
import { ScrollView, Text, View } from 'react-native'
import { Banner, Button, Chip, ErrorNote, Field, Muted, Screen, Title } from '../../src/components/ui'
import { MODES } from '../../src/content/copy'
import { formatWhen, localId } from '../../src/lib/format'
import { api, ApiError } from '../../src/services/api'
import { replyWithFallback } from '../../src/services/ai/LLMProvider'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore, type GuestConversation } from '../../src/store/guestStore'
import { useTheme } from '../../src/theme/ThemeProvider'
import type { ChatMessage, ConversationItem, Mode } from '../../src/types'

export default function AiScreen() {
  const { colors } = useTheme()
  const client = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const authed = Boolean(user)
  const guest = useGuestStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [temporary, setTemporary] = useState(false)
  const [consent, setConsent] = useState(Boolean(user?.preferences.aiSaveConsent))
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const [safetyResources, setSafetyResources] = useState<{ name: string; contact: string; url: string }[]>([])

  const remoteList = useQuery({
    queryKey: ['conversations'],
    enabled: authed,
    queryFn: async () => (await api<ConversationItem[]>('/api/ai/conversations')).data,
  })
  const chosenId = activeId ?? (authed ? remoteList.data?.[0]?.id ?? null : guest.activeConversationId)
  const remoteChat = useQuery({
    queryKey: ['conversation', chosenId],
    enabled: authed && Boolean(chosenId),
    queryFn: async () => (await api<ConversationItem & { messages: ChatMessage[] }>(`/api/ai/conversations/${chosenId}`)).data,
  })
  const localChat = guest.conversations.find((item) => item.id === chosenId) ?? guest.conversations[0]
  const mode: Mode = authed ? ((remoteChat.data?.mode as Mode) ?? 'listen') : (localChat?.mode ?? 'listen')
  const messages = authed ? remoteChat.data?.messages ?? [] : localChat?.messages ?? []

  async function ensureConversation() {
    if (authed) {
      if (chosenId) return chosenId
      if (!temporary && !consent) {
        setError('Choose a temporary chat, or agree to keep this conversation until you delete it.')
        return null
      }
      const created = await api<ConversationItem>('/api/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({ mode, temporary, consentToSave: consent }),
      })
      setActiveId(created.data.id)
      await client.invalidateQueries({ queryKey: ['conversations'] })
      return created.data.id
    }
    if (localChat) return localChat.id
    return guest.startConversation('listen', temporary)
  }

  async function send() {
    const content = draft.trim()
    if (!content) return
    setError('')
    setSafetyResources([])
    setTyping(true)
    setDraft('')
    try {
      const id = await ensureConversation()
      if (!id) return
      if (authed) {
        const result = await api<{
          assistantMessage: ChatMessage
          simulated: boolean
          safety: { escalated: boolean; resources: { name: string; contact: string; url: string }[] }
        }>(`/api/ai/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) })
        if (result.data.safety.escalated) setSafetyResources(result.data.safety.resources)
        if (guest.readAloud) Speech.speak(result.data.assistantMessage.content)
        await client.invalidateQueries({ queryKey: ['conversation', id] })
      } else {
        const result = await replyWithFallback({
          mode: localChat?.mode ?? 'listen',
          region: guest.crisisRegion,
          messages: [...(localChat?.messages ?? []).map((item) => ({ role: item.role, content: item.content })), { role: 'user', content }],
        })
        const now = new Date().toISOString()
        guest.appendChat(id, [
          { id: localId(), role: 'user', content, createdAt: now, simulated: false },
          { id: localId(), role: 'assistant', content: result.content, createdAt: now, simulated: result.simulated },
        ])
        if (result.safety.escalated) setSafetyResources(result.safety.resources)
        if (guest.readAloud) Speech.speak(result.content)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The message could not be sent.')
    } finally {
      setTyping(false)
    }
  }

  async function changeMode(next: Mode) {
    if (authed && chosenId) {
      await api(`/api/ai/conversations/${chosenId}`, { method: 'PATCH', body: JSON.stringify({ mode: next }) })
      await client.invalidateQueries({ queryKey: ['conversation', chosenId] })
    } else if (localChat) {
      guest.setMode(localChat.id, next)
    }
  }

  async function startNew() {
    setError('')
    if (authed) {
      if (!temporary && !consent) {
        setError('Choose a temporary chat, or agree to keep this conversation until you delete it.')
        return
      }
      const created = await api<ConversationItem>('/api/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({ mode, temporary, consentToSave: consent }),
      })
      setActiveId(created.data.id)
      await client.invalidateQueries({ queryKey: ['conversations'] })
      return
    }
    const id = guest.startConversation(mode, temporary)
    setActiveId(id)
  }

  const history: { id: string; title: string }[] = authed
    ? (remoteList.data ?? []).map((item) => ({ id: item.id, title: item.title }))
    : guest.conversations.map((item: GuestConversation) => ({ id: item.id, title: item.title }))

  return (
    <Screen
      safe
      scroll={false}
      footer={
        <View style={{ padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Field label="Message" value={draft} onChangeText={setDraft} placeholder="Tell me what’s on your mind..." multiline style={{ minHeight: 72 }} />
          <Button label="Send privately" onPress={send} />
        </View>
      }
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 24 }}>
        <Title subtitle="A listening companion, not a therapist or an emergency service.">Your private listening space</Title>
        <Banner>
          {authed
            ? 'Signed-in replies come from the server. Until a model is configured there, they are a practice listener and are marked as simulated.'
            : 'These replies stay on this device and come from a practice listener, not a live language model.'}
        </Banner>
        {error ? <ErrorNote message={error} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {MODES.map((item) => (
            <Chip key={item.id} label={item.label} selected={mode === item.id} onPress={() => changeMode(item.id)} />
          ))}
        </View>
        <Muted>{MODES.find((item) => item.id === mode)?.hint ?? ''}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <Chip label="Temporary chat" selected={temporary} onPress={() => setTemporary((value) => !value)} />
          {authed ? <Chip label="Keep until I delete it" selected={consent} onPress={() => setConsent((value) => !value)} /> : null}
          <Chip label={guest.readAloud ? 'Voice replies on' : 'Read replies aloud'} selected={guest.readAloud} onPress={() => guest.setReadAloud(!guest.readAloud)} />
        </View>
        <Button label="Voice input is not connected" variant="outline" onPress={() => setError('Speech to text is not connected in this build.')} />
        <Button label="New conversation" variant="outline" onPress={startNew} />
        {chosenId ? (
          <Button
            label="Clear conversation"
            variant="quiet"
            onPress={async () => {
              if (authed) {
                await api(`/api/ai/conversations/${chosenId}/messages`, { method: 'DELETE' })
                await client.invalidateQueries({ queryKey: ['conversation', chosenId] })
              } else guest.clearChat(chosenId)
            }}
          />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {history.map((item) => (
            <Chip key={item.id} label={item.title.slice(0, 28)} selected={item.id === chosenId} onPress={() => { setActiveId(item.id); if (!authed) guest.setActive(item.id) }} />
          ))}
        </ScrollView>
        {messages.map((message) => (
          <View key={message.id} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: message.role === 'user' ? colors.primary : colors.primarySoft, borderRadius: 16, padding: 12, marginBottom: 8, maxWidth: '90%' }}>
            <Text style={{ color: message.role === 'user' ? colors.onPrimary : colors.ink, lineHeight: 21 }}>{message.content}</Text>
            <Text style={{ color: message.role === 'user' ? colors.onPrimary : colors.muted, fontSize: 11, marginTop: 6 }}>{formatWhen(message.createdAt)}</Text>
          </View>
        ))}
        {typing ? <Muted>AIrOut is listening…</Muted> : null}
        {safetyResources.map((item) => (
          <Muted key={item.url}>{`${item.name}: ${item.contact}`}</Muted>
        ))}
        {messages.some((message) => message.role === 'assistant' && 'simulated' in message && message.simulated) || !authed ? (
          <Muted>Practice listener replies are simulated. They are not a clinical assessment.</Muted>
        ) : null}
      </ScrollView>
    </Screen>
  )
}
