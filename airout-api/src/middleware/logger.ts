import type { NextFunction, Request, Response } from 'express'

/** Path only. Query strings can contain journal search text, so they are left out. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now()
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ms: Date.now() - started,
        userId: req.userId ?? null,
      }),
    )
  })
  next()
}
