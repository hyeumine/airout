import { Router } from 'express'
import { ok, parseBody, wrap } from '../lib/http'
import { requireAuth, requireRole } from '../middleware/auth'
import { SupportCircle } from '../models'
import { AppError } from '../lib/errors'
import {
  auditLog,
  communitySummary,
  createAppeal,
  listAppeals,
  listReports,
  resolveAppeal,
  resolveReport,
} from '../services/moderationService'
import { appealSchema, circleUpdateSchema, resolveAppealSchema, resolveReportSchema } from '../validation/schemas'

export const moderationRouter = Router()
export const appealsRouter = Router()
export const adminRouter = Router()

appealsRouter.use(requireAuth)
appealsRouter.post('/', wrap(async (req, res) => {
  const body = parseBody(appealSchema, req.body)
  return ok(res, await createAppeal(req.userId!, body.statement), undefined, 201)
}))

moderationRouter.use(requireAuth, requireRole('moderator', 'admin'))
moderationRouter.get('/reports', wrap(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'open'
  return ok(res, await listReports(status))
}))
moderationRouter.post('/reports/:id/resolve', wrap(async (req, res) => {
  const body = parseBody(resolveReportSchema, req.body)
  return ok(res, await resolveReport(req.userId!, req.params.id, body.action, body.notes))
}))
moderationRouter.get('/appeals', wrap(async (_req, res) => ok(res, await listAppeals())))
moderationRouter.post('/appeals/:id/resolve', wrap(async (req, res) => {
  const body = parseBody(resolveAppealSchema, req.body)
  return ok(res, await resolveAppeal(req.userId!, req.params.id, body.decision, body.notes))
}))
moderationRouter.get('/audit', wrap(async (_req, res) => ok(res, await auditLog())))

adminRouter.use(requireAuth, requireRole('moderator', 'admin'))
adminRouter.get('/summary', wrap(async (_req, res) => ok(res, await communitySummary())))
adminRouter.patch('/circles/:id', requireRole('admin'), wrap(async (req, res) => {
  const body = parseBody(circleUpdateSchema, req.body)
  const circle = await SupportCircle.findByPk(req.params.id)
  if (!circle) throw new AppError(404, 'NOT_FOUND', 'That circle was not found.')
  if (body.description !== undefined) circle.description = body.description
  if (body.rules !== undefined) circle.rules = body.rules
  if (body.requiresApproval !== undefined) circle.requiresApproval = body.requiresApproval
  await circle.save()
  return ok(res, { id: circle.id, name: circle.name, rules: circle.rules, requiresApproval: circle.requiresApproval })
}))
