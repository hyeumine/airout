import React, { useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Button, ErrorNote, Field, Muted, Screen, Title } from '../src/components/ui'
import { api, ApiError } from '../src/services/api'
import { useAuthStore } from '../src/store/authStore'

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string; delivery?: string }>()
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const authed = Boolean(useAuthStore((state) => state.user))
  const [token, setToken] = useState(typeof params.token === 'string' ? params.token : '')
  const [notice, setNotice] = useState(params.delivery === 'not_configured' ? 'Email delivery is not configured. Use the development token if one is shown.' : '')
  const [error, setError] = useState('')

  async function verify() {
    setError('')
    try {
      await api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
      if (authed) await refreshUser()
      setNotice('Email verified. You can take part in the community.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That token could not be verified.')
    }
  }

  async function resend() {
    setError('')
    try {
      const result = await api<{ message: string; devVerificationToken?: string }>('/api/auth/resend-verification', { method: 'POST' })
      setNotice(result.data.message)
      if (result.data.devVerificationToken) setToken(result.data.devVerificationToken)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'A new token could not be created.')
    }
  }

  return (
    <Screen>
      <Title subtitle="Community posting waits until this step. Your journal does not.">Verify your email</Title>
      {error ? <ErrorNote message={error} /> : null}
      {notice ? <Muted>{notice}</Muted> : null}
      <Field label="Verification token" value={token} onChangeText={setToken} autoCapitalize="none" />
      <Button label="Verify" onPress={verify} />
      {authed ? <Button label="Create another token" variant="outline" onPress={resend} /> : null}
    </Screen>
  )
}
