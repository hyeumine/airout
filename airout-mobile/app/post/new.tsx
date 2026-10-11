import React, { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { Banner, Button, Chip, ErrorNote, Field, Screen, Title } from '../../src/components/ui'
import { CATEGORIES } from '../../src/content/copy'
import { queryClient } from '../../src/lib/queryClient'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import type { Category } from '../../src/types'

export default function NewPostScreen() {
  const params = useLocalSearchParams<{ circleId?: string }>()
  const authed = Boolean(useAuthStore((state) => state.user))
  const guest = useGuestStore()
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<Category>('listen')
  const [anonymous, setAnonymous] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(true)
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  async function publish() {
    const text = body.trim()
    if (text.length < 10) {
      setError('Share at least a sentence or two, without an email address.')
      return
    }
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
      setError('Please remove email addresses before posting.')
      return
    }
    if (authed && !useAuthStore.getState().user?.preferences.guidelinesAcceptedAt) {
      router.push('/guidelines')
      return
    }
    if (!authed && !guest.guidelinesAccepted) {
      router.push('/guidelines')
      return
    }
    setError('')
    try {
      if (authed) {
        await api('/api/community/posts', {
          method: 'POST',
          body: JSON.stringify({
            body: text,
            category,
            identity: anonymous ? 'anonymous' : 'alias',
            commentPermission: commentsOpen ? 'open' : 'closed',
            contentWarning: warning.trim() || null,
            circleId: params.circleId || null,
          }),
        })
        await queryClient.invalidateQueries({ queryKey: ['posts'] })
      } else {
        guest.publishPost({
          body: text,
          category,
          displayName: anonymous ? 'Anonymous' : guest.alias || 'Kind Stranger',
          contentWarning: warning.trim() || null,
          commentPermission: commentsOpen ? 'open' : 'closed',
          circleId: typeof params.circleId === 'string' ? params.circleId : null,
        })
      }
      router.back()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GUIDELINES') {
        router.push('/guidelines')
        return
      }
      setError(err instanceof ApiError ? err.message : 'The post could not be shared.')
    }
  }

  return (
    <Screen>
      <Title subtitle="Say what you need. Leave out names, emails, and places that identify you.">Share something</Title>
      <Banner>Posts are sorted by time. Reactions are support, not a ranking.</Banner>
      {error ? <ErrorNote message={error} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CATEGORIES.map((item) => (
          <Chip key={item.id} label={item.label} selected={category === item.id} onPress={() => setCategory(item.id)} />
        ))}
      </View>
      <Field label="Post" value={body} onChangeText={setBody} multiline style={{ minHeight: 120 }} />
      <Field label="Optional content note" value={warning} onChangeText={setWarning} maxLength={80} placeholder="Shown before the post" />
      <Chip label={anonymous ? 'Posting as Anonymous' : 'Posting with nickname'} selected={anonymous} onPress={() => setAnonymous((value) => !value)} />
      <Chip label={commentsOpen ? 'Replies open' : 'Replies closed'} selected={commentsOpen} onPress={() => setCommentsOpen((value) => !value)} />
      <Button label="Share" onPress={publish} />
    </Screen>
  )
}
