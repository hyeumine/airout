import { Router } from 'express'
import { AppError } from '../lib/errors'
import { ok, parseBody, wrap } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { UserPreference, UserProfile } from '../models'
import { loadUser, toPublicUser } from '../services/authService'
import { acceptGuidelines, blockFromTarget, listBlocks, unblock } from '../services/communityService'
import { assertDisplayName, uniqueDisplayName } from '../services/names'
import { blockSchema, preferenceSchema, profileSchema } from '../validation/schemas'

export const usersRouter = Router()
export const settingsRouter = Router()
usersRouter.use(requireAuth)

usersRouter.get('/me', wrap(async (req, res) => ok(res, toPublicUser(await loadUser(req.userId!)))))

usersRouter.patch('/me', wrap(async (req, res) => {
  const body = parseBody(profileSchema, req.body)
  assertDisplayName(body.displayName)
  const profile = await UserProfile.findOne({ where: { userId: req.userId } })
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Profile was not found.')
  if (profile.displayName !== body.displayName) {
    profile.displayName = await uniqueDisplayName(body.displayName)
    await profile.save()
  }
  return ok(res, toPublicUser(await loadUser(req.userId!)))
}))

usersRouter.get('/me/preferences', wrap(async (req, res) => {
  const user = await loadUser(req.userId!)
  return ok(res, toPublicUser(user).preferences)
}))

usersRouter.patch('/me/preferences', wrap(async (req, res) => {
  const body = parseBody(preferenceSchema, req.body)
  const prefs = await UserPreference.findOne({ where: { userId: req.userId } })
  if (!prefs) throw new AppError(404, 'NOT_FOUND', 'Preferences were not found.')
  Object.assign(prefs, body)
  await prefs.save()
  return ok(res, toPublicUser(await loadUser(req.userId!)).preferences)
}))

usersRouter.post('/me/guidelines', wrap(async (req, res) => {
  await acceptGuidelines(req.userId!)
  return ok(res, { accepted: true })
}))

usersRouter.get('/blocks', wrap(async (req, res) => ok(res, await listBlocks(req.userId!))))

usersRouter.post('/blocks', wrap(async (req, res) => {
  const body = parseBody(blockSchema, req.body)
  return ok(res, await blockFromTarget(req.userId!, body), undefined, 201)
}))

usersRouter.delete('/blocks/:id', wrap(async (req, res) => {
  await unblock(req.userId!, req.params.id)
  return ok(res, { removed: true })
}))

settingsRouter.use(requireAuth)
settingsRouter.get('/', wrap(async (req, res) => ok(res, toPublicUser(await loadUser(req.userId!)).preferences)))
settingsRouter.patch('/', wrap(async (req, res) => {
  const body = parseBody(preferenceSchema, req.body)
  const prefs = await UserPreference.findOne({ where: { userId: req.userId } })
  if (!prefs) throw new AppError(404, 'NOT_FOUND', 'Preferences were not found.')
  Object.assign(prefs, body)
  await prefs.save()
  return ok(res, toPublicUser(await loadUser(req.userId!)).preferences)
}))
