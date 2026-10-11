import React, { useState } from 'react'
import { router } from 'expo-router'
import { Button, ErrorNote, Field, Muted, Screen, Title } from '../src/components/ui'
import { api, ApiError } from '../src/services/api'
import { useAuthStore } from '../src/store/authStore'
import type { PublicUser } from '../src/types'

export default function RegisterScreen() {
  const applySession = useAuthStore((state) => state.applySession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    try {
      const result = await api<{ accessToken: string; refreshToken: string; user: PublicUser; devVerificationToken?: string; emailDelivery: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName: displayName.trim() || undefined }),
      })
      await applySession(result.data)
      router.replace({ pathname: '/verify-email', params: { token: result.data.devVerificationToken ?? '', delivery: result.data.emailDelivery } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The account could not be created.')
    }
  }

  return (
    <Screen>
      <Title subtitle="Use a nickname in the community. Your email is for signing in.">Create your space</Title>
      {error ? <ErrorNote message={error} /> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 10 characters, with a letter and a number" />
      <Field label="Community nickname" value={displayName} onChangeText={setDisplayName} maxLength={28} placeholder="Optional" />
      <Button label="Create account" onPress={submit} />
      <Muted>Email delivery is not connected in this build. A local verification token is shown on the next screen during development.</Muted>
    </Screen>
  )
}
