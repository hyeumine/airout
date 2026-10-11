import jwt, { type JwtPayload } from 'jsonwebtoken'
import { Op } from 'sequelize'
import { env } from '../config/env'
import { sequelize } from '../db/sequelize'
import { AppError } from '../lib/errors'
import { hashPassword, verifyPassword } from '../lib/password'
import { devOnlySecret, randomToken, sha256, signAccessToken, signRefreshToken } from '../lib/tokens'
import {
  Appeal,
  AuthSession,
  ChatMessage,
  CommunityComment,
  CommunityPost,
  Conversation,
  JournalEntry,
  MoodEntry,
  Notification,
  SavedPost,
  User,
  UserPreference,
  UserProfile,
  VerificationToken,
} from '../models'
import { uniqueDisplayName } from './names'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000)
}

export interface PublicUser {
  id: string
  email: string
  emailVerified: boolean
  role: 'user' | 'moderator' | 'admin'
  status: 'active' | 'suspended'
  profile: { displayName: string }
  preferences: {
    theme: string
    notifyReplies: boolean
    notifyReactions: boolean
    notifyCircles: boolean
    notifyModeration: boolean
    journalReminders: boolean
    defaultConversationMode: string
    crisisRegion: string
    guidelinesAcceptedAt: string | null
    aiSaveConsent: boolean
  }
}

export function toPublicUser(user: User): PublicUser {
  const profile = user.profile
  const preferences = user.preferences
  if (!profile || !preferences) {
    throw new AppError(500, 'ACCOUNT_INCOMPLETE', 'This account is missing profile details.')
  }
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    role: user.role,
    status: user.status,
    profile: { displayName: profile.displayName },
    preferences: {
      theme: preferences.theme,
      notifyReplies: preferences.notifyReplies,
      notifyReactions: preferences.notifyReactions,
      notifyCircles: preferences.notifyCircles,
      notifyModeration: preferences.notifyModeration,
      journalReminders: preferences.journalReminders,
      defaultConversationMode: preferences.defaultConversationMode,
      crisisRegion: preferences.crisisRegion,
      guidelinesAcceptedAt: preferences.guidelinesAcceptedAt?.toISOString() ?? null,
      aiSaveConsent: preferences.aiSaveConsent,
    },
  }
}

export async function loadUser(userId: string): Promise<User> {
  const user = await User.findByPk(userId, { include: ['profile', 'preferences'] })
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  return user
}

async function issueSession(user: User, userAgent?: string) {
  const session = await AuthSession.create({
    userId: user.id,
    tokenHash: 'pending',
    expiresAt: refreshExpiry(),
    userAgent: userAgent?.slice(0, 180) ?? null,
  })
  const refreshToken = signRefreshToken(user.id, session.id)
  session.tokenHash = sha256(refreshToken)
  await session.save()
  return {
    accessToken: signAccessToken(user.id, user.role),
    refreshToken,
    sessionId: session.id,
  }
}

async function createOneTimeToken(userId: string, purpose: 'verify_email' | 'reset_password', hours: number) {
  const raw = randomToken()
  await VerificationToken.create({
    userId,
    purpose,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
  })
  return raw
}

export async function deliverMail(purpose: string): Promise<'not_configured' | 'sent'> {
  if (!env.mailProvider) {
    console.log(JSON.stringify({ mail: 'skipped', purpose, reason: 'provider_not_configured' }))
    return 'not_configured'
  }
  console.log(JSON.stringify({ mail: 'skipped', purpose, reason: 'provider_not_implemented' }))
  return 'not_configured'
}

export async function register(input: { email: string; password: string; displayName?: string }, userAgent?: string) {
  const email = normalizeEmail(input.email)
  if (!EMAIL_RE.test(email)) throw new AppError(400, 'VALIDATION', 'Enter a valid email address.')
  const existing = await User.findOne({ where: { email } })
  if (existing) throw new AppError(409, 'CONFLICT', 'An account with that email already exists.')
  const displayName = await uniqueDisplayName(input.displayName?.trim())
  const passwordHash = await hashPassword(input.password)
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create({ email, passwordHash }, { transaction })
    await UserProfile.create({ userId: created.id, displayName }, { transaction })
    await UserPreference.create({ userId: created.id }, { transaction })
    return created
  })
  const token = await createOneTimeToken(user.id, 'verify_email', 24)
  await deliverMail('verify_email')
  const loaded = await loadUser(user.id)
  const session = await issueSession(loaded, userAgent)
  return {
    ...session,
    user: toPublicUser(loaded),
    devVerificationToken: devOnlySecret(token),
    emailDelivery: 'not_configured' as const,
  }
}

export async function login(input: { email: string; password: string }, userAgent?: string) {
  const email = normalizeEmail(input.email)
  const user = await User.findOne({ where: { email }, include: ['profile', 'preferences'] })
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false
  if (!user || !valid) throw new AppError(401, 'UNAUTHORIZED', 'Email or password is incorrect.')
  const session = await issueSession(user, userAgent)
  return { ...session, user: toPublicUser(user) }
}

export async function refresh(rawToken: string, userAgent?: string) {
  let payload: JwtPayload
  try {
    payload = jwt.verify(rawToken, env.jwt.refreshSecret) as JwtPayload
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  }
  if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  }
  const session = await AuthSession.findByPk(payload.sid)
  if (!session || session.userId !== payload.sub || session.revokedAt) {
    throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  }
  if (session.tokenHash !== sha256(rawToken)) {
    await AuthSession.update({ revokedAt: new Date() }, { where: { userId: session.userId, revokedAt: null } })
    throw new AppError(401, 'UNAUTHORIZED', 'That session was already replaced. Please sign in again.')
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Your session expired. Please sign in again.')
  }
  const user = await loadUser(session.userId)
  return sequelize.transaction(async (transaction) => {
    const next = await AuthSession.create(
      {
        userId: user.id,
        tokenHash: 'pending',
        expiresAt: refreshExpiry(),
        userAgent: userAgent?.slice(0, 180) ?? null,
      },
      { transaction },
    )
    const refreshToken = signRefreshToken(user.id, next.id)
    next.tokenHash = sha256(refreshToken)
    await next.save({ transaction })
    session.revokedAt = new Date()
    session.replacedById = next.id
    await session.save({ transaction })
    return {
      accessToken: signAccessToken(user.id, user.role),
      refreshToken,
      sessionId: next.id,
      user: toPublicUser(user),
    }
  })
}

export async function logout(rawToken: string): Promise<void> {
  const hash = sha256(rawToken)
  const session = await AuthSession.findOne({ where: { tokenHash: hash, revokedAt: null } })
  if (session) {
    session.revokedAt = new Date()
    await session.save()
  }
}

export async function logoutAll(userId: string): Promise<void> {
  await AuthSession.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } })
}

export async function listSessions(userId: string, currentHash?: string) {
  const sessions = await AuthSession.findAll({
    where: { userId, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  })
  return sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    userAgent: session.userAgent,
    current: currentHash ? session.tokenHash === currentHash : false,
  }))
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await AuthSession.findOne({ where: { id: sessionId, userId } })
  if (!session) throw new AppError(404, 'NOT_FOUND', 'That session was not found.')
  session.revokedAt = new Date()
  await session.save()
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const token = await VerificationToken.findOne({
    where: { purpose: 'verify_email', tokenHash: sha256(rawToken), usedAt: null },
  })
  if (!token || token.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'TOKEN_INVALID', 'That verification token is invalid or expired.')
  }
  await sequelize.transaction(async (transaction) => {
    token.usedAt = new Date()
    await token.save({ transaction })
    await User.update({ emailVerifiedAt: new Date() }, { where: { id: token.userId }, transaction })
  })
}

export async function resendVerification(userId: string) {
  const user = await User.findByPk(userId)
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  if (user.emailVerifiedAt) {
    return { message: 'This email is already verified.', devVerificationToken: undefined, emailDelivery: 'not_configured' as const }
  }
  const token = await createOneTimeToken(user.id, 'verify_email', 24)
  await deliverMail('verify_email')
  return {
    message: 'A verification token was created. Email delivery is not configured in this build.',
    devVerificationToken: devOnlySecret(token),
    emailDelivery: 'not_configured' as const,
  }
}

export async function forgotPassword(emailInput: string) {
  const email = normalizeEmail(emailInput)
  const user = await User.findOne({ where: { email } })
  let token: string | undefined
  if (user) {
    token = await createOneTimeToken(user.id, 'reset_password', 1)
    await deliverMail('reset_password')
  }
  return {
    message: 'If an account exists, a reset token was created. Email delivery is not configured in this build, so no message was sent.',
    devResetToken: devOnlySecret(token ?? null),
    emailDelivery: 'not_configured' as const,
  }
}

export async function resetPassword(rawToken: string, password: string): Promise<void> {
  const token = await VerificationToken.findOne({
    where: { purpose: 'reset_password', tokenHash: sha256(rawToken), usedAt: null },
  })
  if (!token || token.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'TOKEN_INVALID', 'That reset token is invalid or expired.')
  }
  const passwordHash = await hashPassword(password)
  await sequelize.transaction(async (transaction) => {
    token.usedAt = new Date()
    await token.save({ transaction })
    await User.update({ passwordHash }, { where: { id: token.userId }, transaction })
    await AuthSession.update({ revokedAt: new Date() }, { where: { userId: token.userId, revokedAt: null }, transaction })
  })
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<void> {
  const user = await User.findByPk(userId)
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) throw new AppError(401, 'UNAUTHORIZED', 'The current password is incorrect.')
  user.passwordHash = await hashPassword(nextPassword)
  await user.save()
  await logoutAll(userId)
}

export async function deleteAccount(userId: string, password: string, deleteCommunityContent: boolean): Promise<void> {
  const user = await User.findByPk(userId)
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new AppError(401, 'UNAUTHORIZED', 'The password is incorrect.')
  await sequelize.transaction(async (transaction) => {
    const conversations = await Conversation.findAll({ where: { userId }, transaction, paranoid: false })
    const conversationIds = conversations.map((item) => item.id)
    if (conversationIds.length) {
      await ChatMessage.destroy({ where: { conversationId: conversationIds }, transaction })
    }
    await Conversation.destroy({ where: { userId }, force: true, transaction })
    await JournalEntry.destroy({ where: { userId }, force: true, transaction })
    await MoodEntry.destroy({ where: { userId }, transaction })
    await Notification.destroy({ where: { userId }, transaction })
    await SavedPost.destroy({ where: { userId }, transaction })
    await AuthSession.destroy({ where: { userId }, transaction })
    await VerificationToken.destroy({ where: { userId }, transaction })
    await Appeal.destroy({ where: { userId }, transaction })
    if (deleteCommunityContent) {
      await CommunityComment.destroy({ where: { authorId: userId }, transaction })
      await CommunityPost.destroy({ where: { authorId: userId }, transaction })
    } else {
      await CommunityPost.update(
        { displayName: 'Deleted member', identity: 'anonymous' },
        { where: { authorId: userId }, transaction },
      )
      await CommunityComment.update(
        { displayName: 'Deleted member', identity: 'anonymous' },
        { where: { authorId: userId }, transaction },
      )
    }
    user.email = `deleted+${user.id}@deleted.airout.invalid`
    user.passwordHash = await hashPassword(randomToken())
    user.status = 'suspended'
    await user.save({ transaction })
    await user.destroy({ transaction })
  })
}
