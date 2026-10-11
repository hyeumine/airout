import { createHash, randomBytes, randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { env, isProduction } from '../config/env'

export function newId(): string {
  return randomUUID()
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function randomToken(): string {
  return randomBytes(32).toString('base64url')
}

export function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl as jwt.SignOptions['expiresIn'],
  })
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: `${env.jwt.refreshTtlDays}d`,
  })
}

export function devOnlySecret(token: string | null): string | undefined {
  if (!token || isProduction()) return undefined
  return token
}
