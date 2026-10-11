import { Op } from 'sequelize'
import { REACTIONS } from '../config/constants'
import { AppError } from '../lib/errors'
import {
  CircleMember,
  CommunityComment,
  CommunityPost,
  PostReaction,
  Report,
  SavedPost,
  SupportCircle,
  User,
  UserBlock,
  UserPreference,
} from '../models'
import { assessSafety } from './safety'
import { notifyModerators, notifyUser } from './notify'

const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

export interface PostDto {
  id: string
  category: string
  body: string
  displayName: string
  contentWarning: string | null
  commentPermission: 'open' | 'closed'
  createdAt: string
  mine: boolean
  status: string
  commentCount: number
  reactionCounts: Record<(typeof REACTIONS)[number], number>
  myReaction: string | null
  saved: boolean
  circle: { id: string; name: string } | null
  safetyNotice?: { message: string; resources: { name: string; contact: string; url: string }[] }
}

function emptyCounts(): Record<(typeof REACTIONS)[number], number> {
  return { hear: 0, support: 0, not_alone: 0, thanks: 0 }
}

export async function blockedUserIds(userId: string): Promise<Set<string>> {
  const rows = await UserBlock.findAll({
    where: { [Op.or]: [{ blockerId: userId }, { blockedId: userId }] },
  })
  const ids = new Set<string>()
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId)
  }
  return ids
}

async function loadWriter(userId: string, requireGuidelines: boolean) {
  const user = await User.findByPk(userId, { include: ['profile', 'preferences'] })
  if (!user || !user.profile) throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.')
  if (user.status === 'suspended') {
    throw new AppError(403, 'SUSPENDED', 'This account cannot contribute in the community right now. You can appeal from your profile.')
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_UNVERIFIED', 'Verify your email before contributing. Your journal and private listener remain available.')
  }
  if (requireGuidelines && !user.preferences?.guidelinesAcceptedAt) {
    throw new AppError(403, 'GUIDELINES', 'Please accept the community guidelines before your first contribution.')
  }
  return user
}

function assertNoContactDetails(body: string) {
  if (EMAIL_IN_TEXT.test(body)) {
    throw new AppError(400, 'PRIVACY', 'Please remove email addresses. Community names stay separate from contact details.')
  }
}

async function decorate(posts: CommunityPost[], viewerId: string, isModerator: boolean): Promise<PostDto[]> {
  if (!posts.length) return []
  const ids = posts.map((post) => post.id)
  const [comments, reactions, saved] = await Promise.all([
    CommunityComment.findAll({ where: { postId: ids, status: 'visible' }, attributes: ['postId'] }),
    PostReaction.findAll({ where: { postId: ids } }),
    SavedPost.findAll({ where: { postId: ids, userId: viewerId } }),
  ])
  const commentCount = new Map<string, number>()
  for (const comment of comments) commentCount.set(comment.postId, (commentCount.get(comment.postId) ?? 0) + 1)
  const savedIds = new Set(saved.map((row) => row.postId))
  return posts.map((post) => {
    const counts = emptyCounts()
    let myReaction: string | null = null
    for (const reaction of reactions.filter((item) => item.postId === post.id)) {
      counts[reaction.type] += 1
      if (reaction.userId === viewerId) myReaction = reaction.type
    }
    const removed = post.status === 'removed'
    return {
      id: post.id,
      category: post.category,
      body: removed && post.authorId !== viewerId && !isModerator ? 'This post was removed.' : post.body,
      displayName: post.identity === 'anonymous' ? 'Anonymous' : post.displayName,
      contentWarning: post.contentWarning,
      commentPermission: post.commentPermission,
      createdAt: post.createdAt.toISOString(),
      mine: post.authorId === viewerId,
      status: post.authorId === viewerId || isModerator ? post.status : 'published',
      commentCount: commentCount.get(post.id) ?? 0,
      reactionCounts: counts,
      myReaction,
      saved: savedIds.has(post.id),
      circle: post.circle ? { id: post.circle.id, name: post.circle.name } : null,
    }
  })
}

export async function listPosts(
  viewerId: string,
  role: string,
  query: { category?: string; circleId?: string; mine?: boolean; saved?: boolean; q?: string; limit: number; offset: number },
) {
  const hidden = await blockedUserIds(viewerId)
  const where: Record<string, unknown> = {}
  if (query.mine) where.authorId = viewerId
  else where.status = 'published'
  if (query.category) where.category = query.category
  if (query.circleId) where.circleId = query.circleId
  if (query.q) where.body = { [Op.like]: `%${query.q.replace(/[\\%_]/g, '\\$&')}%` }
  if (hidden.size) where.authorId = query.mine ? viewerId : { [Op.notIn]: [...hidden] }
  if (query.saved) {
    const rows = await SavedPost.findAll({ where: { userId: viewerId } })
    const idFilter = rows.map((row) => row.postId)
    if (!idFilter.length) return { data: [], total: 0 }
    where.id = idFilter
  }
  const { rows, count } = await CommunityPost.findAndCountAll({
    where,
    include: [{ model: SupportCircle, as: 'circle', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: query.limit,
    offset: query.offset,
  })
  const data = await decorate(rows, viewerId, role === 'moderator' || role === 'admin')
  return { data, total: count }
}

export async function getPost(viewerId: string, role: string, postId: string) {
  const post = await CommunityPost.findByPk(postId, { include: [{ model: SupportCircle, as: 'circle', attributes: ['id', 'name'] }] })
  if (!post) throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  const hidden = await blockedUserIds(viewerId)
  const isModerator = role === 'moderator' || role === 'admin'
  if (hidden.has(post.authorId)) throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  if (post.status !== 'published' && post.authorId !== viewerId && !isModerator) {
    throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  }
  const [dto] = await decorate([post], viewerId, isModerator)
  const comments = await CommunityComment.findAll({
    where: { postId, status: 'visible', ...(hidden.size ? { authorId: { [Op.notIn]: [...hidden] } } : {}) },
    order: [['createdAt', 'ASC']],
  })
  return {
    ...dto,
    comments: comments.map((comment) => ({
      id: comment.id,
      kind: comment.kind,
      body: comment.body,
      displayName: comment.identity === 'anonymous' ? 'Anonymous' : comment.displayName,
      createdAt: comment.createdAt.toISOString(),
      mine: comment.authorId === viewerId,
    })),
  }
}

export async function createPost(
  userId: string,
  input: {
    body: string
    category: string
    identity?: 'alias' | 'anonymous'
    commentPermission?: 'open' | 'closed'
    contentWarning?: string | null
    circleId?: string | null
  },
) {
  const user = await loadWriter(userId, true)
  assertNoContactDetails(input.body)
  const recent = await CommunityPost.findOne({
    where: { authorId: userId, body: input.body, createdAt: { [Op.gt]: new Date(Date.now() - 10 * 60 * 1000) } },
  })
  if (recent) throw new AppError(429, 'RATE_LIMIT', 'That looks the same as a post you just shared. Wait a little while before repeating it.')
  let status: CommunityPost['status'] = 'published'
  if (input.circleId) {
    const circle = await SupportCircle.findByPk(input.circleId)
    if (!circle) throw new AppError(404, 'NOT_FOUND', 'That circle was not found.')
    const member = await CircleMember.findOne({ where: { circleId: circle.id, userId } })
    if (!member) throw new AppError(403, 'FORBIDDEN', 'Join the circle before posting there.')
    if (circle.requiresApproval) status = 'pending'
  }
  const safety = assessSafety(input.body, user.preferences?.crisisRegion)
  const post = await CommunityPost.create({
    authorId: userId,
    circleId: input.circleId ?? null,
    category: input.category,
    body: input.body,
    identity: input.identity ?? 'alias',
    displayName: user.profile!.displayName,
    commentPermission: input.commentPermission ?? 'open',
    contentWarning: input.contentWarning?.trim() || null,
    status,
    safetyReview: Boolean(safety.escalated),
  })
  if (safety.escalated) {
    await notifyModerators({
      title: 'Safety review',
      body: 'A community post was flagged for human review. Open the moderation queue.',
      payload: { postId: post.id },
    })
  }
  if (input.circleId) {
    const members = await CircleMember.findAll({ where: { circleId: input.circleId } })
    await Promise.all(
      members
        .filter((member) => member.userId !== userId)
        .map((member) =>
          notifyUser(member.userId, {
            type: 'circle',
            title: 'Circle update',
            body: 'A new post was shared in a circle you joined.',
            payload: { circleId: input.circleId as string },
          }),
        ),
    )
  }
  const full = await CommunityPost.findByPk(post.id, { include: [{ model: SupportCircle, as: 'circle', attributes: ['id', 'name'] }] })
  const [dto] = await decorate([full!], userId, false)
  if (safety.message) {
    dto.safetyNotice = {
      message: safety.message,
      resources: safety.resources.map((item) => ({ name: item.name, contact: item.contact, url: item.url })),
    }
  }
  return dto
}

export async function deleteOwnPost(userId: string, postId: string): Promise<void> {
  const post = await CommunityPost.findOne({ where: { id: postId, authorId: userId } })
  if (!post) throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  await post.destroy()
}

export async function addComment(
  userId: string,
  postId: string,
  input: { body: string; kind: string; identity?: 'alias' | 'anonymous' },
) {
  const user = await loadWriter(userId, true)
  assertNoContactDetails(input.body)
  const post = await CommunityPost.findByPk(postId)
  if (!post || post.status === 'removed' || post.status === 'hidden') {
    throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  }
  const hidden = await blockedUserIds(userId)
  if (hidden.has(post.authorId)) throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  if (post.commentPermission === 'closed') {
    throw new AppError(403, 'FORBIDDEN', 'The author has closed comments on this post.')
  }
  const comment = await CommunityComment.create({
    postId,
    authorId: userId,
    kind: input.kind,
    body: input.body,
    identity: input.identity ?? 'alias',
    displayName: user.profile!.displayName,
  })
  if (post.authorId !== userId) {
    await notifyUser(post.authorId, {
      type: 'reply',
      title: 'Someone replied',
      body: 'Someone left a supportive reply on your post.',
      payload: { postId },
    })
  }
  return {
    id: comment.id,
    kind: comment.kind,
    body: comment.body,
    displayName: (input.identity ?? 'alias') === 'anonymous' ? 'Anonymous' : user.profile!.displayName,
    createdAt: comment.createdAt.toISOString(),
    mine: true,
  }
}

export async function deleteOwnComment(userId: string, commentId: string): Promise<void> {
  const comment = await CommunityComment.findOne({ where: { id: commentId, authorId: userId } })
  if (!comment) throw new AppError(404, 'NOT_FOUND', 'That comment is not available.')
  await comment.destroy()
}

export async function setReaction(userId: string, postId: string, type: (typeof REACTIONS)[number]) {
  await loadWriter(userId, false)
  const post = await CommunityPost.findByPk(postId)
  if (!post || post.status !== 'published') throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  const existing = await PostReaction.findOne({ where: { postId, userId } })
  let myReaction: string | null = type
  if (existing && existing.type === type) {
    await existing.destroy()
    myReaction = null
  } else if (existing) {
    existing.type = type
    await existing.save()
  } else {
    await PostReaction.create({ postId, userId, type })
    if (post.authorId !== userId) {
      await notifyUser(post.authorId, {
        type: 'reaction',
        title: 'Someone is with you',
        body: 'Someone sent a supportive reaction to your post.',
        payload: { postId },
      })
    }
  }
  const rows = await PostReaction.findAll({ where: { postId } })
  const reactionCounts = emptyCounts()
  for (const row of rows) reactionCounts[row.type] += 1
  return { myReaction, reactionCounts }
}

export async function savePost(userId: string, postId: string, saved: boolean): Promise<void> {
  const post = await CommunityPost.findByPk(postId)
  if (!post || post.status !== 'published') throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
  const existing = await SavedPost.findOne({ where: { userId, postId } })
  if (saved && !existing) await SavedPost.create({ userId, postId })
  if (!saved && existing) await existing.destroy()
}

export async function listCircles(userId: string) {
  const circles = await SupportCircle.findAll({ order: [['name', 'ASC']] })
  const memberships = await CircleMember.findAll({ where: { userId } })
  const joined = new Set(memberships.map((item) => item.circleId))
  return circles.map((circle) => ({
    id: circle.id,
    name: circle.name,
    slug: circle.slug,
    description: circle.description,
    rules: circle.rules,
    requiresApproval: circle.requiresApproval,
    joined: joined.has(circle.id),
  }))
}

export async function joinCircle(userId: string, circleId: string): Promise<void> {
  const circle = await SupportCircle.findByPk(circleId)
  if (!circle) throw new AppError(404, 'NOT_FOUND', 'That circle was not found.')
  const existing = await CircleMember.findOne({ where: { circleId, userId } })
  if (!existing) await CircleMember.create({ circleId, userId, role: 'member' })
}

export async function leaveCircle(userId: string, circleId: string): Promise<void> {
  await CircleMember.destroy({ where: { circleId, userId, role: 'member' } })
}

export async function acceptGuidelines(userId: string): Promise<void> {
  const prefs = await UserPreference.findOne({ where: { userId } })
  if (!prefs) throw new AppError(404, 'NOT_FOUND', 'Preferences were not found.')
  if (!prefs.guidelinesAcceptedAt) {
    prefs.guidelinesAcceptedAt = new Date()
    await prefs.save()
  }
}

export async function blockFromTarget(userId: string, input: { postId?: string; commentId?: string }) {
  let blockedId: string | undefined
  let displayName = 'Community member'
  if (input.postId) {
    const post = await CommunityPost.findByPk(input.postId)
    if (!post) throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
    blockedId = post.authorId
    displayName = post.identity === 'anonymous' ? 'Anonymous' : post.displayName
  } else if (input.commentId) {
    const comment = await CommunityComment.findByPk(input.commentId)
    if (!comment) throw new AppError(404, 'NOT_FOUND', 'That comment is not available.')
    blockedId = comment.authorId
    displayName = comment.identity === 'anonymous' ? 'Anonymous' : comment.displayName
  }
  if (!blockedId) throw new AppError(400, 'VALIDATION', 'Choose a post or comment to block.')
  if (blockedId === userId) throw new AppError(400, 'VALIDATION', 'You cannot block your own account.')
  const existing = await UserBlock.findOne({ where: { blockerId: userId, blockedId } })
  if (existing) return { id: existing.id, displayName: existing.displayName }
  const row = await UserBlock.create({ blockerId: userId, blockedId, displayName })
  return { id: row.id, displayName: row.displayName }
}

export async function listBlocks(userId: string) {
  const rows = await UserBlock.findAll({ where: { blockerId: userId }, order: [['createdAt', 'DESC']] })
  return rows.map((row) => ({ id: row.id, displayName: row.displayName, createdAt: row.createdAt }))
}

export async function createReport(
  userId: string,
  input: { targetType: 'post' | 'comment'; postId?: string; commentId?: string; reason: string; details?: string | null },
) {
  const targetId = input.targetType === 'post' ? input.postId : input.commentId
  if (!targetId) throw new AppError(400, 'VALIDATION', 'Choose the post or comment you want to report.')
  let targetUserId: string | null = null
  if (input.targetType === 'post') {
    const post = await CommunityPost.findByPk(targetId)
    if (!post) throw new AppError(404, 'NOT_FOUND', 'That post is not available.')
    targetUserId = post.authorId
  } else {
    const comment = await CommunityComment.findByPk(targetId)
    if (!comment) throw new AppError(404, 'NOT_FOUND', 'That comment is not available.')
    targetUserId = comment.authorId
  }
  if (targetUserId === userId) throw new AppError(400, 'VALIDATION', 'You cannot report your own contribution.')
  const existing = await Report.findOne({ where: { reporterId: userId, targetType: input.targetType, targetId, status: 'open' } })
  if (existing) throw new AppError(409, 'CONFLICT', 'You already reported this. A moderator will review it.')
  const report = await Report.create({
    reporterId: userId,
    targetType: input.targetType,
    targetId,
    targetUserId,
    reason: input.reason,
    details: input.details ?? null,
  })
  await notifyModerators({
    title: 'New report',
    body: 'A community report is waiting in the moderation queue.',
    payload: { reportId: report.id },
  })
  return { id: report.id, status: report.status }
}

export async function unblock(userId: string, blockId: string): Promise<void> {
  const row = await UserBlock.findOne({ where: { id: blockId, blockerId: userId } })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'That block was not found.')
  await row.destroy()
}
