import { Router } from 'express'
import { Op } from 'sequelize'
import { ok, parseBody, wrap } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { Notification } from '../models'
import { readNotificationsSchema } from '../validation/schemas'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', wrap(async (req, res) => {
  const rows = await Notification.findAll({
    where: { userId: req.userId },
    order: [['createdAt', 'DESC']],
    limit: 50,
  })
  return ok(res, rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.readAt,
    createdAt: row.createdAt,
  })))
}))

notificationsRouter.post('/read', wrap(async (req, res) => {
  const body = parseBody(readNotificationsSchema, req.body ?? {})
  const where: Record<string, unknown> = { userId: req.userId, readAt: null }
  if (body.ids?.length) where.id = { [Op.in]: body.ids }
  await Notification.update({ readAt: new Date() }, { where })
  return ok(res, { read: true })
}))
