import { Router } from 'express'
import { ok, pageParams, parseBody, wrap } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { writeLimiter } from '../middleware/rateLimit'
import { commentSchema, postSchema, reactionSchema, reportSchema } from '../validation/schemas'
import {
  addComment,
  createPost,
  createReport,
  deleteOwnComment,
  deleteOwnPost,
  getPost,
  joinCircle,
  leaveCircle,
  listCircles,
  listPosts,
  savePost,
  setReaction,
} from '../services/communityService'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)
reportsRouter.post('/', writeLimiter, wrap(async (req, res) => {
  const body = parseBody(reportSchema, req.body)
  return ok(res, await createReport(req.userId!, body), undefined, 201)
}))

export const communityRouter = Router()
communityRouter.use(requireAuth)

communityRouter.get('/posts', wrap(async (req, res) => {
  const page = pageParams(req.query)
  const result = await listPosts(req.userId!, req.userRole!, {
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    circleId: typeof req.query.circleId === 'string' ? req.query.circleId : undefined,
    q: typeof req.query.q === 'string' ? req.query.q.trim() : undefined,
    mine: req.query.mine === 'true',
    saved: req.query.saved === 'true',
    limit: page.limit,
    offset: page.offset,
  })
  return ok(res, result.data, { page: page.page, pageSize: page.pageSize, total: result.total })
}))

communityRouter.post('/posts', writeLimiter, wrap(async (req, res) => {
  const body = parseBody(postSchema, req.body)
  const post = await createPost(req.userId!, body)
  req.app.locals.io?.to('feed').emit('community:activity', { kind: 'post' })
  return ok(res, post, undefined, 201)
}))

communityRouter.get('/posts/:id', wrap(async (req, res) => ok(res, await getPost(req.userId!, req.userRole!, req.params.id))))

communityRouter.delete('/posts/:id', wrap(async (req, res) => {
  await deleteOwnPost(req.userId!, req.params.id)
  return ok(res, { deleted: true })
}))

communityRouter.post('/posts/:id/comments', writeLimiter, wrap(async (req, res) => {
  const body = parseBody(commentSchema, req.body)
  const comment = await addComment(req.userId!, req.params.id, body)
  req.app.locals.io?.to('feed').emit('community:activity', { kind: 'comment', postId: req.params.id })
  return ok(res, comment, undefined, 201)
}))

communityRouter.delete('/comments/:id', wrap(async (req, res) => {
  await deleteOwnComment(req.userId!, req.params.id)
  return ok(res, { deleted: true })
}))

communityRouter.post('/posts/:id/reactions', wrap(async (req, res) => {
  const body = parseBody(reactionSchema, req.body)
  return ok(res, await setReaction(req.userId!, req.params.id, body.type))
}))

communityRouter.post('/posts/:id/save', wrap(async (req, res) => {
  await savePost(req.userId!, req.params.id, true)
  return ok(res, { saved: true })
}))

communityRouter.delete('/posts/:id/save', wrap(async (req, res) => {
  await savePost(req.userId!, req.params.id, false)
  return ok(res, { saved: false })
}))

communityRouter.get('/circles', wrap(async (req, res) => ok(res, await listCircles(req.userId!))))

communityRouter.post('/circles/:id/join', wrap(async (req, res) => {
  await joinCircle(req.userId!, req.params.id)
  return ok(res, { joined: true })
}))

communityRouter.delete('/circles/:id/join', wrap(async (req, res) => {
  await leaveCircle(req.userId!, req.params.id)
  return ok(res, { joined: false })
}))

communityRouter.post('/reports', writeLimiter, wrap(async (req, res) => {
  const body = parseBody(reportSchema, req.body)
  return ok(res, await createReport(req.userId!, body), undefined, 201)
}))
