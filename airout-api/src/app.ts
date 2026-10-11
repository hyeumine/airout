import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { sequelize } from './db/sequelize'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/logger'
import { ok } from './lib/http'
import { adminRouter, appealsRouter, moderationRouter } from './routes/moderation'
import { aiRouter } from './routes/ai'
import { authRouter } from './routes/auth'
import { communityRouter, reportsRouter } from './routes/community'
import { settingsRouter } from './routes/users'
import { journalRouter } from './routes/journal'
import { moodsRouter } from './routes/moods'
import { notificationsRouter } from './routes/notifications'
import { usersRouter } from './routes/users'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)

  app.get('/api/health', async (_req, res, next) => {
    try {
      await sequelize.authenticate()
      return ok(res, { service: 'airout-api', database: 'up', time: new Date().toISOString() })
    } catch (error) {
      return next(error)
    }
  })

  app.use('/api/auth', authRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/ai', aiRouter)
  app.use('/api/moods', moodsRouter)
  app.use('/api/journal', journalRouter)
  app.use('/api/community', communityRouter)
  app.use('/api/reports', reportsRouter)
  app.use('/api/appeals', appealsRouter)
  app.use('/api/moderation', moderationRouter)
  app.use('/api/notifications', notificationsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/settings', settingsRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'That API route does not exist.' } })
  })
  app.use(errorHandler)
  return app
}
