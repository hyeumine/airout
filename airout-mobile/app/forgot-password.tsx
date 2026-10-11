import React, { useState } from 'react'
import { Button, ErrorNote, Field, Muted, Screen, Title } from '../src/components/ui'
import { api, ApiError } from '../src/services/api'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function requestToken() {
    setError('')
    try {
      const result = await api<{ message: string; devResetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setNotice(result.data.message)
      if (result.data.devResetToken) setToken(result.data.devResetToken)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The reset could not be started.')
    }
  }

  async function reset() {
    setError('')
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      setNotice('Password updated. You can sign in with the new one.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The password was not changed.')
    }
  }

  return (
    <Screen>
      <Title subtitle="No email is sent until a mail provider is configured.">Reset your password</Title>
      {error ? <ErrorNote message={error} /> : null}
      {notice ? <Muted>{notice}</Muted> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <Button label="Create reset token" onPress={requestToken} />
      <Field label="Reset token" value={token} onChangeText={setToken} autoCapitalize="none" />
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button label="Save new password" variant="outline" onPress={reset} />
    </Screen>
  )
}
