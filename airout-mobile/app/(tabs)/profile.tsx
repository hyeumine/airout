import React, { useState } from 'react'
import { router } from 'expo-router'
import { Alert, Platform, Text, View } from 'react-native'
import { Banner, Button, Card, Chip, ErrorNote, Field, Muted, Screen, Title } from '../../src/components/ui'
import { api, ApiError } from '../../src/services/api'
import { tokenStorageKind } from '../../src/services/secure'
import { useAuthStore } from '../../src/store/authStore'
import { useGuestStore } from '../../src/store/guestStore'
import { queryClient } from '../../src/lib/queryClient'
import type { ThemeChoice } from '../../src/types'
import { useTheme } from '../../src/theme/ThemeProvider'

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'Match device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export default function ProfileScreen() {
  const { colors } = useTheme()
  const user = useAuthStore((state) => state.user)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const signOut = useAuthStore((state) => state.signOut)
  const guest = useGuestStore()
  const [name, setName] = useState(user?.profile.displayName ?? guest.alias)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const authed = Boolean(user)

  async function saveName() {
    setError('')
    try {
      if (authed) {
        await api('/api/users/me', { method: 'PATCH', body: JSON.stringify({ displayName: name.trim() }) })
        await refreshUser()
      } else {
        guest.setAlias(name.trim() || 'Kind Stranger')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The name could not be saved.')
    }
  }

  async function chooseTheme(theme: ThemeChoice) {
    guest.setTheme(theme)
    if (!authed) return
    await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ theme }) })
    await refreshUser()
  }

  function clearDevice() {
    const run = () => guest.clearDevice()
    if (Platform.OS === 'web') {
      if (window.confirm('Remove on-device demo content?')) run()
      return
    }
    Alert.alert('Clear on-device data?', 'This removes the local journal, wall, and chats on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: run },
    ])
  }

  async function deleteAccount() {
    setError('')
    try {
      await api('/api/auth/account', { method: 'DELETE', body: JSON.stringify({ password, deleteCommunityContent: true }) })
      await signOut()
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The account could not be deleted.')
    }
  }

  return (
    <Screen safe>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800' }}>{(name || 'A').slice(0, 1).toUpperCase()}</Text>
      </View>
      <Title subtitle="Your account and your nickname are separate.">Your space</Title>
      {user?.status === 'suspended' ? <Banner>Community posting is paused on this account. You can appeal, and your journal and listener remain available.</Banner> : null}
      <Banner>
        {tokenStorageKind === 'secure-store'
          ? 'Sign-in tokens on this phone use the device secure store.'
          : 'This browser keeps sign-in tokens in local storage, which is less protected than a phone secure store.'}
      </Banner>
      {error ? <ErrorNote message={error} /> : null}
      <Card>
        <Field label="Community nickname" value={name} onChangeText={setName} maxLength={28} />
        <Muted>Use a nickname, not your real name. Changing it does not rewrite old posts.</Muted>
        <Button label="Save nickname" onPress={saveName} />
        {authed ? <Muted>{`Signed in as ${user?.email}. This email is only visible to you.`}</Muted> : <Muted>You are using this device without an account.</Muted>}
      </Card>
      <Card>
        <Muted>Appearance</Muted>
        {THEMES.map((theme) => (
          <Chip key={theme.id} label={theme.label} selected={(user?.preferences.theme ?? guest.theme) === theme.id} onPress={() => chooseTheme(theme.id)} />
        ))}
      </Card>
      <Button label="Privacy and data" variant="outline" onPress={() => router.push('/settings/privacy')} />
      <Button label="Notifications" variant="outline" onPress={() => router.push('/settings/notifications')} />
      <Button label="Crisis resources" variant="outline" onPress={() => router.push('/settings/privacy')} />
      <Button label="Community guidelines" variant="outline" onPress={() => router.push('/guidelines')} />
      <Button label="In-app notices" variant="outline" onPress={() => router.push('/notifications')} />
      {user && user.role !== 'user' ? <Button label="Moderation" onPress={() => router.push('/moderation')} /> : null}
      {user?.status === 'suspended' ? <Button label="Appeal a decision" variant="outline" onPress={() => router.push('/moderation')} /> : null}
      {authed ? (
        <Button label="Sign out" variant="outline" onPress={async () => { await signOut(); queryClient.clear() }} />
      ) : (
        <>
          <Button label="Sign in" onPress={() => router.push('/login')} />
          <Button label="Create account" variant="outline" onPress={() => router.push('/register')} />
        </>
      )}
      <Card>
        <Muted>This app is not a substitute for professional mental health care. A practice listener is not a live model. Community support is not therapy.</Muted>
      </Card>
      {authed ? (
        <Card>
          <Field label="Password to delete account" value={password} onChangeText={setPassword} secureTextEntry />
          <Muted>Deleting removes your journal, mood check-ins, and AI conversations. Community posts you wrote are also removed with this button.</Muted>
          <Button label="Delete account" variant="outline" onPress={deleteAccount} />
        </Card>
      ) : (
        <Button label="Clear on-device data" variant="outline" onPress={clearDevice} />
      )}
    </Screen>
  )
}
