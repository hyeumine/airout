import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from './errors'

export function ok(res: Response, data: unknown, meta?: unknown, status = 200) {
  return res.status(status).json(meta ? { ok: true, data, meta } : { ok: true, data })
}

export function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function parseBody<T>(schema: ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION',
      'Please check the form and try again.',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    )
  }
  return result.data
}

export function pageParams(query: Request['query']) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize }
}
