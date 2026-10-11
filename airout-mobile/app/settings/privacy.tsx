import React from 'react'
import { Linking } from 'react-native'
import { Button, Card, Chip, Muted, Screen, Title } from '../../src/components/ui'
import { REGION_OPTIONS, resourcesForRegion } from '../../src/content/copy'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'

export default function PrivacyScreen() {
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const region = user?.preferences.crisisRegion ?? useGuestStore((state) => state.crisisRegion)
  const setRegion = useGuestStore((state) => state.setCrisisRegion)

  async function choose(next: string) {
    setRegion(next)
    if (!user) return
    await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ crisisRegion: next }) })
    await refreshUser()
  }

  return (
    <Screen>
      <Title subtitle="Private writing stays private unless you deliberately post in the community.">Privacy and data</Title>
      <Card>
        <Muted>Journal entries, mood check-ins, and AI conversations are not shown to other members. Moderators do not get a browser for those private records.</Muted>
        <Muted>Account deletion removes journal entries, mood check-ins, and conversations. You can also remove community posts.</Muted>
        <Muted>Temporary chats on the server expire after 24 hours. On-device temporary chats are left out of saved device storage when the app writes its local copy.</Muted>
        <Muted>Journal text in the database is protected by account access rules. This project does not enable MySQL disk encryption by itself. On-device guest journals use AsyncStorage and are not encrypted.</Muted>
        <Muted>Nothing in the journal is sent for model training. There is no training pipeline in this build.</Muted>
      </Card>
      <Title>Crisis resources</Title>
      <Muted>Pick a region so the listener can show a relevant published line, plus the international directory. Confirm details locally before relying on them.</Muted>
      {REGION_OPTIONS.map((item) => (
        <Chip key={item.id} label={item.label} selected={region === item.id} onPress={() => choose(item.id)} />
      ))}
      {resourcesForRegion(region).map((item) => (
        <Card key={item.id}>
          <Muted>{`${item.region}: ${item.name}`}</Muted>
          <Muted>{item.detail}</Muted>
          <Button label={item.contact} variant="outline" onPress={() => Linking.openURL(item.url)} />
        </Card>
      ))}
    </Screen>
  )
}
