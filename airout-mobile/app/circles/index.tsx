import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button, Card, Muted, Screen, Title } from '../../src/components/ui'
import { CIRCLE_SEED } from '../../src/content/copy'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'

interface CircleDto {
  id: string
  name: string
  description: string
  rules: string
  joined: boolean
}

export default function CirclesScreen() {
  const authed = Boolean(useAuthStore((state) => state.user))
  const joined = useGuestStore((state) => state.joinedCircleIds)
  const query = useQuery({
    queryKey: ['circles'],
    enabled: authed,
    queryFn: async () => (await api<CircleDto[]>('/api/community/circles')).data,
  })
  const circles = authed
    ? query.data ?? []
    : CIRCLE_SEED.map((circle) => ({ ...circle, joined: joined.includes(circle.id) }))

  return (
    <Screen>
      <Title subtitle="Peer spaces, not therapy groups. Each circle has rules and a way to report harm.">Support circles</Title>
      {circles.map((circle) => (
        <Card key={circle.id}>
          <Title>{circle.name}</Title>
          <Muted>{circle.description}</Muted>
          <Muted>{circle.joined ? 'You have joined.' : 'You can read the rules before joining.'}</Muted>
          <Button label="Open circle" variant="outline" onPress={() => router.push(`/circles/${circle.id}`)} />
        </Card>
      ))}
    </Screen>
  )
}
