import React from 'react'
import { router } from 'expo-router'
import { Button, Card, Muted, Screen, Title } from '../src/components/ui'
import { GUIDELINES } from '../src/content/copy'
import { api } from '../src/services/api'
import { useAuthStore } from '../src/store/authStore'
import { useGuestStore } from '../src/store/guestStore'

export default function GuidelinesScreen() {
  const authed = Boolean(useAuthStore((state) => state.user))
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const acceptLocal = useGuestStore((state) => state.acceptGuidelines)

  async function accept() {
    if (authed) {
      await api('/api/users/me/guidelines', { method: 'POST' })
      await refreshUser()
    } else {
      acceptLocal()
    }
    router.back()
  }

  return (
    <Screen>
      <Title subtitle="Please read this before your first post or reply.">Community guidelines</Title>
      {GUIDELINES.map((line) => (
        <Card key={line}>
          <Muted>{line}</Muted>
        </Card>
      ))}
      <Button label="I understand" onPress={accept} />
    </Screen>
  )
}
