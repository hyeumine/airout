import React from 'react'
import { Banner, Chip, Muted, Screen, Title } from '../../src/components/ui'
import { api } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'

const TOGGLES = [
  ['notifyReplies', 'Replies to my posts'],
  ['notifyReactions', 'Supportive reactions'],
  ['notifyCircles', 'Circle updates'],
  ['notifyModeration', 'Moderation queue, for moderators'],
  ['journalReminders', 'Journal reminder preference'],
] as const

export default function NotificationSettingsScreen() {
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  if (!user) {
    return (
      <Screen>
        <Title>Notifications</Title>
        <Muted>Sign in to choose account notices. This build stores the preference and creates in-app notices. It does not send push notifications.</Muted>
      </Screen>
    )
  }

  async function toggle(key: (typeof TOGGLES)[number][0]) {
    if (!user) return
    await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ [key]: !user.preferences[key] }) })
    await refreshUser()
  }

  return (
    <Screen>
      <Title subtitle="All of these are off until you opt in, except operational messages about your own account status.">Notifications</Title>
      <Banner>Notice text stays general, so a locked screen does not show what you wrote. Push delivery is not connected.</Banner>
      <Muted>Journal reminders are saved as a preference only. This build does not schedule nagging reminders.</Muted>
      {TOGGLES.map(([key, label]) => (
        <Chip key={key} label={`${label}: ${user.preferences[key] ? 'on' : 'off'}`} selected={user.preferences[key]} onPress={() => toggle(key)} />
      ))}
    </Screen>
  )
}
