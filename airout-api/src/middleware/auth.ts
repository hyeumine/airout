import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from '../lib/errors'
import { User } from '../models'

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return next(new AppError(401, 'UNAUTHORIZED', 'Sign in required.'))
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as jwt.JwtPayload
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      return next(new AppError(401, 'UNAUTHORIZED', 'Sign in required.'))
    }
    const user = await User.findByPk(payload.sub)
    if (!user) return next(new AppError(401, 'UNAUTHORIZED', 'Please sign in again.'))
    req.userId = user.id
    req.userRole = user.role
    req.userStatus = user.status
    return next()
  } catch {
    return next(new AppError(401, 'UNAUTHORIZED', 'Your session expired. Please sign in again.'))
  }
}

export function requireRole(...roles: Array<'user' | 'moderator' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this action.'))
    }
    return next()
  }
}

export function requireCommunityWriter(req: Request, _res: Response, next: NextFunction) {
  if (req.userStatus === 'suspended') {
    return next(new AppError(403, 'SUSPENDED', 'This account cannot post in the community right now. You can appeal from your profile.'))
  }
  return next()
}
