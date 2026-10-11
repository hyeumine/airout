import { Router } from 'express'
import { Op } from 'sequelize'
import { MOODS } from '../config/constants'
import { AppError } from '../lib/errors'
import { ok, parseBody, wrap } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { MoodEntry } from '../models'
import { moodSchema } from '../validation/schemas'

export const moodsRouter = Router()
moodsRouter.use(requireAuth)

const disclaimer = 'These counts are a personal record of check-ins. They are not a diagnosis or a prediction.'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

moodsRouter.get('/', wrap(async (req, res) => {
  const where: Record<string, unknown> = { userId: req.userId }
  if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
    where.recordedOn = {
      ...(typeof req.query.from === 'string' ? { [Op.gte]: req.query.from } : {}),
      ...(typeof req.query.to === 'string' ? { [Op.lte]: req.query.to } : {}),
    }
  }
  const rows = await MoodEntry.findAll({ where, order: [['recordedOn', 'DESC']] })
  return ok(res, rows.map((row) => ({ id: row.id, mood: row.mood, note: row.note, recordedOn: row.recordedOn })))
}))

moodsRouter.get('/summary', wrap(async (req, res) => {
  const rows = await MoodEntry.findAll({ where: { userId: req.userId }, order: [['recordedOn', 'DESC']] })
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const count = (from: string) => {
    const totals = Object.fromEntries(MOODS.map((mood) => [mood, 0])) as Record<(typeof MOODS)[number], number>
    for (const row of rows) {
      const day = String(row.recordedOn).slice(0, 10)
      if (day >= from && row.mood in totals) totals[row.mood as (typeof MOODS)[number]] += 1
    }
    return totals
  }
  return ok(res, { disclaimer, week: count(weekAgo), month: count(monthAgo), recent: rows.slice(0, 14) })
}))

moodsRouter.post('/', wrap(async (req, res) => {
  const body = parseBody(moodSchema, req.body)
  const recordedOn = body.recordedOn ?? today()
  const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  if (recordedOn > latest) throw new AppError(400, 'VALIDATION', 'Choose today or an earlier day.')
  const existing = await MoodEntry.findOne({ where: { userId: req.userId, recordedOn } })
  if (existing) {
    existing.mood = body.mood
    existing.note = body.note ?? null
    await existing.save()
    return ok(res, existing)
  }
  const created = await MoodEntry.create({ userId: req.userId, mood: body.mood, note: body.note ?? null, recordedOn })
  return ok(res, created, undefined, 201)
}))

moodsRouter.delete('/:id', wrap(async (req, res) => {
  const row = await MoodEntry.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'That check-in is not available.')
  await row.destroy()
  return ok(res, { deleted: true })
}))
