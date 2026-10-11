import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Muted, Screen, Title } from '../../src/components/ui'
import { CIRCLE_SEED } from '../../src/content/copy'
import { queryClient } from '../../src/lib/queryClient'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore, visibleGuestPosts } from '../../src/store/guestStore'

export default function CircleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const circleId = String(id)
  const authed = Boolean(useAuthStore((state) => state.user))
  const guest = useGuestStore()
  const local = CIRCLE_SEED.find((circle) => circle.id === circleId)
  const remote = useQuery({
    queryKey: ['circles'],
    enabled: authed,
    queryFn: async () => (await api<{ id: string; name: string; description: string; rules: string; joined: boolean }[]>('/api/community/circles')).data,
  })
  const circle = authed ? remote.data?.find((item) => item.id === circleId) : local ? { ...local, joined: guest.joinedCircleIds.includes(circleId) } : undefined
  const posts = visibleGuestPosts(guest, circleId)

  async function toggle() {
    if (!circle) return
    if (authed) {
      await api(`/api/community/circles/${circleId}/join`, { method: circle.joined ? 'DELETE' : 'POST' })
      await queryClient.invalidateQueries({ queryKey: ['circles'] })
    } else if (circle.joined) guest.leaveCircle(circleId)
    else guest.joinCircle(circleId)
  }

  if (!circle) return <Screen><Title>That circle is not available</Title></Screen>

  return (
    <Screen>
      <Title subtitle="People here are peers. This is not a professional therapy group.">{circle.name}</Title>
      <Muted>{circle.description}</Muted>
      <Card>
        <Muted>{circle.rules}</Muted>
      </Card>
      <Button label={circle.joined ? 'Leave circle' : 'Join circle'} onPress={toggle} />
      <Button label="Share in this circle" variant="outline" onPress={() => router.push({ pathname: '/post/new', params: { circleId } })} />
      {!authed && posts.length === 0 ? <Muted>No on-device posts in this circle yet.</Muted> : null}
      {!authed ? posts.map((post) => (
        <Card key={post.id}>
          <Muted>{post.displayName}</Muted>
          <Muted>{post.body}</Muted>
        </Card>
      )) : <Muted>Posts you share from this screen are tied to the circle. The main wall still lists the newest posts from every circle, without ranking them by reactions.</Muted>}
      {authed ? <Button label="See community" variant="quiet" onPress={() => router.push('/community')} /> : null}
    </Screen>
  )
}
