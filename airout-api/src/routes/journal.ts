import { Router } from 'express'
import { Op, type WhereOptions } from 'sequelize'
import { AppError } from '../lib/errors'
import { ok, pageParams, parseBody, wrap } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { JournalEntry } from '../models'
import { journalSchema } from '../validation/schemas'

export const journalRouter = Router()
journalRouter.use(requireAuth)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function toDto(entry: JournalEntry) {
  return {
    id: entry.id,
    title: entry.title,
    body: entry.body,
    mood: entry.mood,
    tags: entry.tags ?? [],
    entryDate: entry.entryDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

journalRouter.get('/', wrap(async (req, res) => {
  const { page, pageSize, limit, offset } = pageParams(req.query)
  const where: WhereOptions = { userId: req.userId }
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : ''
  if (q) {
    const safe = `%${q.replace(/[\\%_]/g, '\\$&')}%`
    Object.assign(where, { [Op.or]: [{ body: { [Op.like]: safe } }, { title: { [Op.like]: safe } }] })
  }
  const entryDate: Record<symbol, string> = {}
  if (typeof req.query.from === 'string') entryDate[Op.gte] = req.query.from
  if (typeof req.query.to === 'string') entryDate[Op.lte] = req.query.to
  if (Object.getOwnPropertySymbols(entryDate).length) Object.assign(where, { entryDate })
  const { rows, count } = await JournalEntry.findAndCountAll({
    where,
    order: [['entryDate', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset,
  })
  const filtered = tag ? rows.filter((entry) => (entry.tags ?? []).includes(tag)) : rows
  return ok(res, filtered.map(toDto), { page, pageSize, total: tag ? filtered.length : count })
}))

journalRouter.post('/', wrap(async (req, res) => {
  const body = parseBody(journalSchema, req.body)
  const entry = await JournalEntry.create({
    userId: req.userId,
    title: body.title,
    body: body.body,
    mood: body.mood ?? null,
    tags: body.tags,
    entryDate: body.entryDate ?? today(),
  })
  return ok(res, toDto(entry), undefined, 201)
}))

journalRouter.get('/:id', wrap(async (req, res) => {
  const entry = await JournalEntry.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!entry) throw new AppError(404, 'NOT_FOUND', 'That journal entry is not available.')
  return ok(res, toDto(entry))
}))

journalRouter.patch('/:id', wrap(async (req, res) => {
  const body = parseBody(journalSchema.partial(), req.body)
  const entry = await JournalEntry.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!entry) throw new AppError(404, 'NOT_FOUND', 'That journal entry is not available.')
  if (body.title !== undefined) entry.title = body.title
  if (body.body !== undefined) entry.body = body.body
  if (body.mood !== undefined) entry.mood = body.mood
  if (body.tags !== undefined) entry.tags = body.tags
  if (body.entryDate !== undefined) entry.entryDate = body.entryDate
  await entry.save()
  return ok(res, toDto(entry))
}))

journalRouter.delete('/:id', wrap(async (req, res) => {
  const entry = await JournalEntry.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!entry) throw new AppError(404, 'NOT_FOUND', 'That journal entry is not available.')
  await entry.destroy({ force: true })
  return ok(res, { deleted: true })
}))
