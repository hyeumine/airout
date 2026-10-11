import { Router } from 'express'
import { sha256 } from '../lib/tokens'
import { ok, parseBody, wrap } from '../lib/http'
import { authLimiter } from '../middleware/rateLimit'
import { requireAuth } from '../middleware/auth'
import {
  changePassword,
  deleteAccount,
  forgotPassword,
  listSessions,
  loadUser,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resendVerification,
  resetPassword,
  revokeSession,
  toPublicUser,
  verifyEmail,
} from '../services/authService'
import {
  deleteAccountSchema,
  forgotSchema,
  loginSchema,
  passwordChangeSchema,
  refreshSchema,
  registerSchema,
  resetSchema,
  tokenSchema,
} from '../validation/schemas'

export const authRouter = Router()

authRouter.post('/register', authLimiter, wrap(async (req, res) => {
  const body = parseBody(registerSchema, req.body)
  const result = await register(body, req.header('user-agent') ?? undefined)
  return ok(res, result, undefined, 201)
}))

authRouter.post('/login', authLimiter, wrap(async (req, res) => {
  const body = parseBody(loginSchema, req.body)
  return ok(res, await login(body, req.header('user-agent') ?? undefined))
}))

authRouter.post('/refresh', wrap(async (req, res) => {
  const body = parseBody(refreshSchema, req.body)
  return ok(res, await refresh(body.refreshToken, req.header('user-agent') ?? undefined))
}))

authRouter.post('/logout', wrap(async (req, res) => {
  const body = parseBody(refreshSchema, req.body)
  await logout(body.refreshToken)
  return ok(res, { loggedOut: true })
}))

authRouter.post('/forgot-password', authLimiter, wrap(async (req, res) => {
  const body = parseBody(forgotSchema, req.body)
  return ok(res, await forgotPassword(body.email))
}))

authRouter.post('/reset-password', authLimiter, wrap(async (req, res) => {
  const body = parseBody(resetSchema, req.body)
  await resetPassword(body.token, body.password)
  return ok(res, { reset: true })
}))

authRouter.post('/verify-email', authLimiter, wrap(async (req, res) => {
  const body = parseBody(tokenSchema, req.body)
  await verifyEmail(body.token)
  return ok(res, { verified: true })
}))

authRouter.post('/resend-verification', requireAuth, wrap(async (req, res) => {
  return ok(res, await resendVerification(req.userId!))
}))

authRouter.get('/sessions', requireAuth, wrap(async (req, res) => {
  const header = req.header('x-refresh-token')
  return ok(res, await listSessions(req.userId!, header ? sha256(header) : undefined))
}))

authRouter.delete('/sessions/:id', requireAuth, wrap(async (req, res) => {
  await revokeSession(req.userId!, req.params.id)
  return ok(res, { revoked: true })
}))

authRouter.post('/logout-all', requireAuth, wrap(async (req, res) => {
  await logoutAll(req.userId!)
  return ok(res, { loggedOut: true })
}))

authRouter.post('/password', requireAuth, wrap(async (req, res) => {
  const body = parseBody(passwordChangeSchema, req.body)
  await changePassword(req.userId!, body.currentPassword, body.newPassword)
  return ok(res, { changed: true })
}))

authRouter.delete('/account', requireAuth, wrap(async (req, res) => {
  const body = parseBody(deleteAccountSchema, req.body)
  await deleteAccount(req.userId!, body.password, body.deleteCommunityContent ?? false)
  return ok(res, { deleted: true })
}))

authRouter.get('/me', requireAuth, wrap(async (req, res) => {
  return ok(res, toPublicUser(await loadUser(req.userId!)))
}))
