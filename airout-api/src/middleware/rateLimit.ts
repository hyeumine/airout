import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

const skip = () => env.nodeEnv === 'test'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { ok: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts. Please wait a few minutes and try again.' } },
})

export const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  keyGenerator: (req) => req.userId ?? req.ip ?? 'unknown',
  message: { ok: false, error: { code: 'RATE_LIMIT', message: 'You are sending a lot at once. Pause for a few minutes, then try again.' } },
})
