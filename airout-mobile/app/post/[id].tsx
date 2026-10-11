import React, { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Chip, ErrorNote, Field, LoadingState, Muted, Screen, Title } from '../../src/components/ui'
import { COMMENT_KINDS, labelFor } from '../../src/content/copy'
import { formatWhen } from '../../src/lib/format'
import { queryClient } from '../../src/lib/queryClient'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import { useTheme } from '../../src/theme/ThemeProvider'
import type { CommentKind, FeedComment, FeedPost } from '../../src/types'

export default function PostDetailScreen() {
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const postId = String(id)
  const authed = Boolean(useAuthStore((state) => state.user))
  const guest = useGuestStore()
  const local = guest.posts.find((post) => post.id === postId)
  const query = useQuery({
    queryKey: ['post', postId],
    enabled: authed,
    queryFn: async () => (await api<FeedPost>(`/api/community/posts/${postId}`)).data,
  })
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<CommentKind>('encouragement')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reason, setReason] = useState('harassment')
  const comments: FeedComment[] = authed
    ? query.data?.comments ?? []
    : (local?.comments ?? []).map((comment) => ({
        id: comment.id,
        kind: comment.kind,
        body: comment.body,
        displayName: comment.author,
        createdAt: comment.createdAt,
        mine: comment.author === guest.alias,
      }))
  const post = authed ? query.data : local

  async function reply() {
    const text = body.trim()
    if (text.length < 2) return
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
        await api(`/api/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body: text, kind, identity: 'alias' }) })
        await query.refetch()
      } else {
        guest.commentOn(postId, text, kind)
      }
      setBody('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The reply could not be posted.')
    }
  }

  async function report() {
    if (!authed) {
      setError('Reporting needs the shared server so a moderator can review it. This on-device wall cannot file a report.')
      return
    }
    try {
      await api('/api/reports', { method: 'POST', body: JSON.stringify({ targetType: 'post', postId, reason }) })
      setError('')
      setBody('')
      setNotice('Report sent. A moderator can review it. This does not publish your private chats.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The report could not be sent.')
    }
  }

  async function block() {
    if (!authed) {
      if (local) guest.blockName(local.displayName)
      router.back()
      return
    }
    await api('/api/users/blocks', { method: 'POST', body: JSON.stringify({ postId }) })
    await queryClient.invalidateQueries({ queryKey: ['posts'] })
    router.back()
  }

  async function remove() {
    if (authed) {
      await api(`/api/community/posts/${postId}`, { method: 'DELETE' })
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
    } else {
      guest.deletePost(postId)
    }
    router.back()
  }

  if (authed && query.isLoading) return <Screen><LoadingState /></Screen>
  if (!post) return <Screen><Title>That post is not available</Title></Screen>

  const displayName = 'displayName' in post ? post.displayName : ''
  const text = 'body' in post ? post.body : ''
  const mine = authed ? Boolean(query.data?.mine) : Boolean(local?.owned)

  return (
    <Screen>
      <Title>{displayName}</Title>
      <Muted>{formatWhen('createdAt' in post ? post.createdAt : '')}</Muted>
      <Text style={{ color: colors.ink, lineHeight: 22, marginVertical: 12 }}>{text}</Text>
      {notice ? <Muted>{notice}</Muted> : null}
      {error ? <ErrorNote message={error} /> : null}
      {comments.map((comment) => (
        <Card key={comment.id}>
          <Muted>{`${comment.displayName} · ${labelFor(COMMENT_KINDS, comment.kind)}`}</Muted>
          <Text style={{ color: colors.ink, lineHeight: 21 }}>{comment.body}</Text>
        </Card>
      ))}
      {(!('commentPermission' in post) || post.commentPermission === 'open') ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {COMMENT_KINDS.map((item) => (
              <Chip key={item.id} label={item.label} selected={kind === item.id} onPress={() => setKind(item.id)} />
            ))}
          </View>
          <Field label="Reply" value={body} onChangeText={setBody} placeholder="Offer kind support" />
          <Button label="Reply" onPress={reply} />
        </>
      ) : <Muted>Replies are closed on this post.</Muted>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['harassment', 'spam', 'privacy', 'self_harm_concern', 'other'].map((item) => (
          <Chip key={item} label={item.replace(/_/g, ' ')} selected={reason === item} onPress={() => setReason(item)} />
        ))}
      </View>
      <Button label="Report" variant="outline" onPress={report} />
      {!mine ? <Button label="Block this nickname" variant="outline" onPress={block} /> : null}
      {mine ? <Button label="Delete post" variant="quiet" onPress={remove} /> : null}
      <Button label="Save" variant="quiet" onPress={async () => {
        if (authed) {
          await api(`/api/community/posts/${postId}/save`, { method: 'POST' })
          await query.refetch()
        } else guest.toggleSave(postId)
      }} />
    </Screen>
  )
}
