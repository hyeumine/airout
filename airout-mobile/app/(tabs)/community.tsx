import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Text, View } from 'react-native'
import { Banner, Button, Card, Chip, EmptyState, ErrorNote, LoadingState, Muted, Screen, Title } from '../../src/components/ui'
import { CATEGORIES, REACTIONS, labelFor } from '../../src/content/copy'
import { formatWhen } from '../../src/lib/format'
import { api, ApiError } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore, visibleGuestPosts } from '../../src/store/guestStore'
import { useTheme } from '../../src/theme/ThemeProvider'
import type { Category, FeedPost, Reaction } from '../../src/types'

export default function CommunityScreen() {
  const { colors } = useTheme()
  const user = useAuthStore((state) => state.user)
  const authed = Boolean(user)
  const guest = useGuestStore()
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [savedOnly, setSavedOnly] = useState(false)
  const [error, setError] = useState('')
  const [openWarnings, setOpenWarnings] = useState<Record<string, boolean>>({})
  const query = useQuery({
    queryKey: ['posts', category, savedOnly],
    enabled: authed,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (savedOnly) params.set('saved', 'true')
      return (await api<FeedPost[]>(`/api/community/posts?${params.toString()}`)).data
    },
  })

  const local = visibleGuestPosts(guest).filter((post) => (category === 'all' || post.category === category) && (!savedOnly || post.saved))
  const posts: FeedPost[] = authed
    ? query.data ?? []
    : local.map((post) => ({
        id: post.id,
        category: post.category,
        body: post.body,
        displayName: post.displayName,
        contentWarning: post.contentWarning,
        commentPermission: post.commentPermission,
        createdAt: post.createdAt,
        mine: post.owned,
        commentCount: post.comments.length,
        reactionCounts: post.reactionCounts,
        myReaction: post.myReaction,
        saved: post.saved,
        circle: null,
      }))

  async function react(post: FeedPost, reaction: Reaction) {
    setError('')
    try {
      if (!authed) {
        guest.reactTo(post.id, reaction)
        return
      }
      await api(`/api/community/posts/${post.id}/reactions`, { method: 'POST', body: JSON.stringify({ type: reaction }) })
      await query.refetch()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That reaction could not be saved.')
    }
  }

  return (
    <Screen safe>
      <Title subtitle="Newest posts first. Support is not a score, and posts are not ranked by reactions.">Community wall</Title>
      <Banner>
        {authed
          ? 'You are in the shared community. Names here are nicknames, not accounts.'
          : 'This wall is on this device, including the sample posts. Sign in when the server is running to join the shared community.'}
      </Banner>
      <Muted>Listen with kindness. Share experiences, not diagnoses. Do not post identifying details.</Muted>
      {error ? <ErrorNote message={error} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
        {CATEGORIES.map((item) => (
          <Chip key={item.id} label={item.label} selected={category === item.id} onPress={() => setCategory(item.id)} />
        ))}
        <Chip label="Saved" selected={savedOnly} onPress={() => setSavedOnly((value) => !value)} />
      </View>
      <Button label="Share something" onPress={() => router.push('/post/new')} />
      <Button label="Support circles" variant="outline" onPress={() => router.push('/circles')} />
      {authed && query.isLoading ? <LoadingState /> : null}
      {authed && query.isError ? <ErrorNote message="The community could not be loaded. Pull in again when you have a connection." /> : null}
      {!posts.length && !(authed && query.isLoading) ? (
        <EmptyState title="Nothing here yet" body="When you are ready, share a few sentences. You can also read a circle’s rules first." />
      ) : null}
      {posts.map((post) => {
        const hidden = Boolean(post.contentWarning) && !openWarnings[post.id]
        return (
          <Card key={post.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.ink, fontWeight: '800' }}>{post.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: '800' }}>{post.displayName}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{formatWhen(post.createdAt)}</Text>
              </View>
            </View>
            <View style={{ alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{labelFor(CATEGORIES, post.category)}</Text>
            </View>
            {hidden ? (
              <Button label={`Content note: ${post.contentWarning}. Show post`} variant="outline" onPress={() => setOpenWarnings((value) => ({ ...value, [post.id]: true }))} />
            ) : (
              <Text style={{ color: colors.ink, lineHeight: 22, marginVertical: 8 }}>{post.body}</Text>
            )}
            <Muted>{`${post.commentCount} ${post.commentCount === 1 ? 'reply' : 'replies'}`}</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {REACTIONS.map((reaction) => (
                <Chip
                  key={reaction.id}
                  label={`${reaction.label} ${post.reactionCounts[reaction.id] ?? 0}`}
                  selected={post.myReaction === reaction.id}
                  onPress={() => react(post, reaction.id)}
                />
              ))}
            </View>
            <Button label="Open" variant="outline" onPress={() => router.push(`/post/${post.id}`)} />
          </Card>
        )
      })}
    </Screen>
  )
}
