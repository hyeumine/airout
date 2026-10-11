import type { NextFunction, Request, Response } from 'express'
import { UniqueConstraintError, ValidationError } from 'sequelize'
import { AppError } from '../lib/errors'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    })
  }
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      ok: false,
      error: { code: 'CONFLICT', message: 'That value is already in use.' },
    })
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION', message: 'Some fields could not be saved.' },
    })
  }
  console.log(JSON.stringify({ error: 'unhandled', name: err instanceof Error ? err.name : 'unknown' }))
  return res.status(500).json({
    ok: false,
    error: { code: 'SERVER', message: 'Something went wrong on our side. Please try again.' },
  })
}
