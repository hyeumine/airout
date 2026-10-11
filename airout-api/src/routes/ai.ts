import { Router } from 'express'
import { Op } from 'sequelize'
import { AppError } from '../lib/errors'
import { ok, parseBody, wrap } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import { writeLimiter } from '../middleware/rateLimit'
import { ChatMessage, Conversation, UserPreference } from '../models'
import { completeChat } from '../services/aiProvider'

import { conversationSchema, messageSchema, modeSchema } from '../validation/schemas'

export const aiRouter = Router()
aiRouter.use(requireAuth)

function visibleWhere(userId: string) {
  return {
    userId,
    [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
  }
}

aiRouter.get('/conversations', wrap(async (req, res) => {
  const rows = await Conversation.findAll({
    where: visibleWhere(req.userId!),
    order: [['updatedAt', 'DESC']],
  })
  return ok(res, rows.map((row) => ({
    id: row.id,
    title: row.title,
    mode: row.mode,
    temporary: row.temporary,
    consentToSave: row.consentToSave,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
  })))
}))

aiRouter.post('/conversations', wrap(async (req, res) => {
  const body = parseBody(conversationSchema, req.body)
  if (!body.temporary && !body.consentToSave) {
    throw new AppError(400, 'CONSENT', 'Choose a temporary chat, or consent to keep this conversation until you delete it.')
  }
  const prefs = await UserPreference.findOne({ where: { userId: req.userId } })
  if (body.consentToSave && prefs && !prefs.aiSaveConsent) {
    prefs.aiSaveConsent = true
    await prefs.save()
  }
  const created = await Conversation.create({
    userId: req.userId,
    mode: body.mode,
    temporary: body.temporary,
    consentToSave: body.consentToSave,
    expiresAt: body.temporary ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
  })
  return ok(res, created, undefined, 201)
}))

aiRouter.get('/conversations/:id', wrap(async (req, res) => {
  const conversation = await Conversation.findOne({ where: { id: req.params.id, ...visibleWhere(req.userId!) } })
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'That conversation is not available.')
  const messages = await ChatMessage.findAll({ where: { conversationId: conversation.id }, order: [['createdAt', 'ASC']] })
  return ok(res, {
    id: conversation.id,
    title: conversation.title,
    mode: conversation.mode,
    temporary: conversation.temporary,
    consentToSave: conversation.consentToSave,
    expiresAt: conversation.expiresAt,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  })
}))

aiRouter.patch('/conversations/:id', wrap(async (req, res) => {
  const body = parseBody(modeSchema, req.body)
  const conversation = await Conversation.findOne({ where: { id: req.params.id, ...visibleWhere(req.userId!) } })
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'That conversation is not available.')
  conversation.mode = body.mode
  await conversation.save()
  return ok(res, { id: conversation.id, mode: conversation.mode })
}))

aiRouter.delete('/conversations/:id', wrap(async (req, res) => {
  const conversation = await Conversation.findOne({ where: { id: req.params.id, userId: req.userId } })
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'That conversation is not available.')
  await ChatMessage.destroy({ where: { conversationId: conversation.id } })
  await conversation.destroy({ force: true })
  return ok(res, { deleted: true })
}))

aiRouter.delete('/conversations/:id/messages', wrap(async (req, res) => {
  const conversation = await Conversation.findOne({ where: { id: req.params.id, ...visibleWhere(req.userId!) } })
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'That conversation is not available.')
  await ChatMessage.destroy({ where: { conversationId: conversation.id } })
  return ok(res, { cleared: true })
}))

aiRouter.post('/conversations/:id/messages', writeLimiter, wrap(async (req, res) => {
  const body = parseBody(messageSchema, req.body)
  const conversation = await Conversation.findOne({ where: { id: req.params.id, ...visibleWhere(req.userId!) } })
  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'That conversation is not available.')
  const prefs = await UserPreference.findOne({ where: { userId: req.userId } })
  const history = await ChatMessage.findAll({ where: { conversationId: conversation.id }, order: [['createdAt', 'ASC']] })
  const userMessage = await ChatMessage.create({ conversationId: conversation.id, role: 'user', content: body.content })
  if (conversation.title === 'New conversation') {
    conversation.title = body.content.slice(0, 80)
  }
  const result = await completeChat({
    mode: conversation.mode,
    region: prefs?.crisisRegion,
    messages: [...history.map((message) => ({ role: message.role, content: message.content })), { role: 'user', content: body.content }],
  })
  const assistantMessage = await ChatMessage.create({
    conversationId: conversation.id,
    role: 'assistant',
    content: result.content,
  })
  await conversation.save()
  return ok(res, {
    userMessage: { id: userMessage.id, role: 'user', content: userMessage.content, createdAt: userMessage.createdAt },
    assistantMessage: { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content, createdAt: assistantMessage.createdAt },
    provider: result.provider,
    simulated: result.simulated,
    safety: result.safety,
  }, undefined, 201)
}))
