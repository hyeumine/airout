import React, { useState } from 'react'
import { router } from 'expo-router'
import { Button, ErrorNote, Field, Muted, Screen, Title } from '../src/components/ui'
import { api, ApiError } from '../src/services/api'
import { useAuthStore } from '../src/store/authStore'
import type { PublicUser } from '../src/types'

export default function LoginScreen() {
  const applySession = useAuthStore((state) => state.applySession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    try {
      const result = await api<{ accessToken: string; refreshToken: string; user: PublicUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      await applySession(result.data)
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.')
    }
  }

  return (
    <Screen>
      <Title subtitle="Your email stays off the community wall.">Welcome back</Title>
      {error ? <ErrorNote message={error} /> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button label="Sign in" onPress={submit} />
      <Button label="Create an account" variant="outline" onPress={() => router.push('/register')} />
      <Button label="I forgot my password" variant="quiet" onPress={() => router.push('/forgot-password')} />
      <Muted>Development seed accounts exist only for local testing. Do not reuse them anywhere public.</Muted>
    </Screen>
  )
}
