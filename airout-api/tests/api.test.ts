import assert from 'node:assert/strict'
import { before, test } from 'node:test'
import type { Express } from 'express'
import type { SuperTest, Test } from 'supertest'

process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = ':memory:'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-characters-min'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters-min'
process.env.LLM_BASE_URL = ''
process.env.LLM_API_KEY = ''

let request: (app: Express) => SuperTest<Test>
let app: Express

function expectStatus(res: { status: number; body: unknown }, status: number) {
  assert.equal(res.status, status, JSON.stringify(res.body))
}

before(async () => {
  const supertest = await import('supertest')
  const db = await import('../src/db/sequelize')
  await import('../src/models')
  await db.enableForeignKeys()
  await db.sequelize.sync({ force: true })
  const seed = await import('../src/db/seed')
  await seed.seed()
  const application = await import('../src/app')
  app = application.createApp()
  request = supertest.default as unknown as (instance: Express) => SuperTest<Test>
})

test('authentication, privacy, community, journal, mood, moderation, and deletion', async () => {
  const health = await request(app).get('/api/health')
  expectStatus(health, 200)
  assert.equal(health.body.data.database, 'up')

  const missing = await request(app).get('/api/journal')
  expectStatus(missing, 401)

  const invalid = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: 'short', displayName: 'A' })
  expectStatus(invalid, 400)
  assert.equal(invalid.body.ok, false)

  const wrong = await request(app).post('/api/auth/login').send({ email: 'missing@airout.local', password: 'Listen-please-1' })
  expectStatus(wrong, 401)

  async function account(email: string, displayName: string) {
    const registered = await request(app).post('/api/auth/register').send({
      email,
      password: 'Listen-please-1',
      displayName,
    })
    expectStatus(registered, 201)
    assert.equal(registered.body.data.user.email, email)
    assert.equal(registered.body.data.emailDelivery, 'not_configured')
    assert.ok(registered.body.data.devVerificationToken)
    assert.equal(JSON.stringify(registered.body).includes('passwordHash'), false)
    const verified = await request(app).post('/api/auth/verify-email').send({ token: registered.body.data.devVerificationToken })
    expectStatus(verified, 200)
    const token = registered.body.data.accessToken as string
    const guidelines = await request(app).post('/api/users/me/guidelines').set('Authorization', `Bearer ${token}`)
    expectStatus(guidelines, 200)
    return { token, refresh: registered.body.data.refreshToken as string, id: registered.body.data.user.id as string }
  }

  const ada = await account('ada@example.com', 'Ada Listener')
  const bo = await account('bo@example.com', 'Bo Harbor')

  const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken: ada.refresh })
  expectStatus(refreshed, 200)
  const reused = await request(app).post('/api/auth/refresh').send({ refreshToken: ada.refresh })
  expectStatus(reused, 401)
  ada.token = refreshed.body.data.accessToken
  ada.refresh = refreshed.body.data.refreshToken

  const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(me, 200)
  assert.equal(me.body.data.profile.displayName, 'Ada Listener')
  assert.equal(JSON.stringify(me.body).includes('password'), false)

  const emptyJournal = await request(app).get('/api/journal').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(emptyJournal, 200)
  assert.deepEqual(emptyJournal.body.data, [])

  const createdJournal = await request(app).post('/api/journal').set('Authorization', `Bearer ${ada.token}`).send({
    title: 'After class',
    body: 'I felt overlooked and I want to remember that the feeling passed a little.',
    mood: 'sad',
    tags: ['school'],
  })
  expectStatus(createdJournal, 201)
  const journalId = createdJournal.body.data.id as string

  const stolen = await request(app).get(`/api/journal/${journalId}`).set('Authorization', `Bearer ${bo.token}`)
  expectStatus(stolen, 404)

  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'moderator@airout.local',
    password: 'DevOnly-Listen-2026!',
  })
  expectStatus(adminLogin, 200)
  const adminToken = adminLogin.body.data.accessToken as string
  const adminRead = await request(app).get(`/api/journal/${journalId}`).set('Authorization', `Bearer ${adminToken}`)
  expectStatus(adminRead, 404)

  const searched = await request(app).get('/api/journal?q=overlooked').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(searched, 200)
  assert.equal(searched.body.data.length, 1)

  const badMood = await request(app).post('/api/moods').set('Authorization', `Bearer ${ada.token}`).send({ mood: 'diagnosed' })
  expectStatus(badMood, 400)
  const mood = await request(app).post('/api/moods').set('Authorization', `Bearer ${ada.token}`).send({
    mood: 'exhausted',
    note: 'Long day, still here.',
  })
  expectStatus(mood, 201)
  const summary = await request(app).get('/api/moods/summary').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(summary, 200)
  assert.match(summary.body.data.disclaimer, /not a diagnosis/i)
  assert.equal(summary.body.data.week.exhausted, 1)

  const unverified = await request(app).post('/api/auth/register').send({
    email: 'new@example.com',
    password: 'Listen-please-1',
    displayName: 'New Cedar',
  })
  expectStatus(unverified, 201)
  const blockedPost = await request(app).post('/api/community/posts').set('Authorization', `Bearer ${unverified.body.data.accessToken}`).send({
    body: 'I wanted to share before verifying.',
    category: 'reflection',
  })
  expectStatus(blockedPost, 403)
  assert.equal(blockedPost.body.error.code, 'EMAIL_UNVERIFIED')

  const adaPost = await request(app).post('/api/community/posts').set('Authorization', `Bearer ${ada.token}`).send({
    body: 'I need someone to hear that today felt heavier than I expected.',
    category: 'listen',
    identity: 'alias',
  })
  expectStatus(adaPost, 201)
  assert.equal(adaPost.body.data.displayName, 'Ada Listener')
  assert.equal(JSON.stringify(adaPost.body).includes('ada@example.com'), false)
  assert.equal(adaPost.body.data.authorId, undefined)
  const postId = adaPost.body.data.id as string

  const boPost = await request(app).post('/api/community/posts').set('Authorization', `Bearer ${bo.token}`).send({
    body: 'Sharing a small win: I asked for help and someone stayed.',
    category: 'victory',
  })
  expectStatus(boPost, 201)
  const boPostId = boPost.body.data.id as string

  const comment = await request(app).post(`/api/community/posts/${postId}/comments`).set('Authorization', `Bearer ${bo.token}`).send({
    body: 'I hear you. Heavy days still count as days you got through.',
    kind: 'encouragement',
  })
  expectStatus(comment, 201)

  const reaction = await request(app).post(`/api/community/posts/${postId}/reactions`).set('Authorization', `Bearer ${bo.token}`).send({ type: 'hear' })
  expectStatus(reaction, 200)
  assert.equal(reaction.body.data.myReaction, 'hear')
  assert.equal(reaction.body.data.reactionCounts.hear, 1)

  const feed = await request(app).get('/api/community/posts').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(feed, 200)
  const ordered = feed.body.data.map((item: { createdAt: string }) => item.createdAt)
  const sorted = [...ordered].sort((a, b) => (a < b ? 1 : -1))
  assert.deepEqual(ordered, sorted)

  const detail = await request(app).get(`/api/community/posts/${postId}`).set('Authorization', `Bearer ${ada.token}`)
  expectStatus(detail, 200)
  assert.equal(detail.body.data.comments.length, 1)

  const circles = await request(app).get('/api/community/circles').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(circles, 200)
  assert.ok(circles.body.data.length >= 6)
  const circleId = circles.body.data[0].id as string
  const joined = await request(app).post(`/api/community/circles/${circleId}/join`).set('Authorization', `Bearer ${ada.token}`)
  expectStatus(joined, 200)

  const report = await request(app).post('/api/reports').set('Authorization', `Bearer ${ada.token}`).send({
    targetType: 'post',
    postId: boPostId,
    reason: 'spam',
  })
  expectStatus(report, 201)

  const forbiddenQueue = await request(app).get('/api/moderation/reports').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(forbiddenQueue, 403)
  const queue = await request(app).get('/api/moderation/reports').set('Authorization', `Bearer ${adminToken}`)
  expectStatus(queue, 200)
  assert.ok(queue.body.data.some((item: { id: string }) => item.id === report.body.data.id))
  const hidden = await request(app).post(`/api/moderation/reports/${report.body.data.id}/resolve`).set('Authorization', `Bearer ${adminToken}`).send({ action: 'hide', notes: 'Review complete' })
  expectStatus(hidden, 200)
  const afterHide = await request(app).get('/api/community/posts').set('Authorization', `Bearer ${ada.token}`)
  assert.equal(afterHide.body.data.some((item: { id: string }) => item.id === boPostId), false)

  const adminSummary = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${adminToken}`)
  expectStatus(adminSummary, 200)
  assert.match(adminSummary.body.data.note, /journals/i)
  assert.equal(JSON.stringify(adminSummary.body).includes('overlooked'), false)

  const block = await request(app).post('/api/users/blocks').set('Authorization', `Bearer ${ada.token}`).send({ postId: boPostId })
  expectStatus(block, 201)
  const boView = await request(app).get('/api/community/posts').set('Authorization', `Bearer ${bo.token}`)
  assert.equal(boView.body.data.some((item: { id: string }) => item.id === postId), false)

  const notMine = await request(app).delete(`/api/community/posts/${postId}`).set('Authorization', `Bearer ${bo.token}`)
  expectStatus(notMine, 404)
  const removed = await request(app).delete(`/api/community/posts/${postId}`).set('Authorization', `Bearer ${ada.token}`)
  expectStatus(removed, 200)

  const conversation = await request(app).post('/api/ai/conversations').set('Authorization', `Bearer ${ada.token}`).send({
    mode: 'listen',
    temporary: false,
    consentToSave: true,
  })
  expectStatus(conversation, 201)
  const conversationId = conversation.body.data.id as string
  const withoutConsent = await request(app).post('/api/ai/conversations').set('Authorization', `Bearer ${ada.token}`).send({
    mode: 'listen',
    temporary: false,
    consentToSave: false,
  })
  expectStatus(withoutConsent, 400)

  const message = await request(app).post(`/api/ai/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${ada.token}`).send({
    content: "I'm exhausted. Nobody seems to appreciate what I do.",
  })
  expectStatus(message, 201)
  assert.equal(message.body.data.simulated, true)
  assert.equal(message.body.data.provider, 'mock')
  assert.match(message.body.data.assistantMessage.content, /listen/i)

  const crisis = await request(app).post(`/api/ai/conversations/${conversationId}/messages`).set('Authorization', `Bearer ${ada.token}`).send({
    content: 'I want to die',
  })
  expectStatus(crisis, 201)
  assert.equal(crisis.body.data.safety.escalated, true)
  assert.match(JSON.stringify(crisis.body.data.safety.resources), /findahelpline\.com/)

  const otherChat = await request(app).get(`/api/ai/conversations/${conversationId}`).set('Authorization', `Bearer ${bo.token}`)
  expectStatus(otherChat, 404)
  const adminChat = await request(app).get(`/api/ai/conversations/${conversationId}`).set('Authorization', `Bearer ${adminToken}`)
  expectStatus(adminChat, 404)

  const mode = await request(app).patch(`/api/ai/conversations/${conversationId}`).set('Authorization', `Bearer ${ada.token}`).send({ mode: 'encourage' })
  expectStatus(mode, 200)

  const prefs = await request(app).patch('/api/settings').set('Authorization', `Bearer ${ada.token}`).send({
    notifyReplies: true,
    theme: 'dark',
    crisisRegion: 'us',
  })
  expectStatus(prefs, 200)
  assert.equal(prefs.body.data.theme, 'dark')

  const appealForbidden = await request(app).get('/api/moderation/appeals').set('Authorization', `Bearer ${ada.token}`)
  expectStatus(appealForbidden, 403)

  const deleted = await request(app).delete('/api/auth/account').set('Authorization', `Bearer ${ada.token}`).send({
    password: 'Listen-please-1',
    deleteCommunityContent: true,
  })
  expectStatus(deleted, 200)
  const loginAfter = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'Listen-please-1' })
  expectStatus(loginAfter, 401)
  const { JournalEntry } = await import('../src/models')
  const remaining = await JournalEntry.findAll({ where: { id: journalId } })
  assert.equal(remaining.length, 0)
})
