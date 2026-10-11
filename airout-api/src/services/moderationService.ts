import { Op } from 'sequelize'
import { AppError } from '../lib/errors'
import { Appeal, CommunityComment, CommunityPost, ModerationAction, Report, User, UserProfile } from '../models'
import { notifyUser } from './notify'

async function moderatorName(userId: string): Promise<string> {
  const profile = await UserProfile.findOne({ where: { userId } })
  return profile?.displayName ?? 'Moderator'
}

export async function listReports(status = 'open') {
  const reports = await Report.findAll({
    where: status === 'all' ? {} : { status },
    order: [['createdAt', 'ASC']],
    limit: 100,
  })
  const items = []
  for (const report of reports) {
    let excerpt: string | null = null
    let displayName: string | null = null
    if (report.targetType === 'post') {
      const post = await CommunityPost.findByPk(report.targetId, { paranoid: false })
      excerpt = post?.body.slice(0, 280) ?? null
      displayName = post ? (post.identity === 'anonymous' ? 'Anonymous' : post.displayName) : null
    } else {
      const comment = await CommunityComment.findByPk(report.targetId, { paranoid: false })
      excerpt = comment?.body.slice(0, 280) ?? null
      displayName = comment ? (comment.identity === 'anonymous' ? 'Anonymous' : comment.displayName) : null
    }
    items.push({
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt,
      safetyReview: report.reason === 'self_harm_concern',
      excerpt,
      displayName,
    })
  }
  return items
}

export async function resolveReport(
  moderatorId: string,
  reportId: string,
  action: 'dismiss' | 'hide' | 'remove' | 'suspend',
  notes?: string | null,
) {
  const report = await Report.findByPk(reportId)
  if (!report) throw new AppError(404, 'NOT_FOUND', 'That report was not found.')
  if (report.status === 'resolved' || report.status === 'dismissed') {
    throw new AppError(409, 'CONFLICT', 'That report is already closed.')
  }
  if (action === 'dismiss') {
    report.status = 'dismissed'
  } else if (action === 'hide' || action === 'remove') {
    const status = action === 'hide' ? 'hidden' : 'removed'
    if (report.targetType === 'post') {
      await CommunityPost.update({ status }, { where: { id: report.targetId } })
    } else {
      await CommunityComment.update({ status: action === 'hide' ? 'hidden' : 'removed' }, { where: { id: report.targetId } })
    }
    report.status = 'resolved'
  } else if (action === 'suspend') {
    if (!report.targetUserId) throw new AppError(400, 'VALIDATION', 'This report is not tied to an account.')
    if (report.targetUserId === moderatorId) throw new AppError(400, 'VALIDATION', 'You cannot suspend your own account.')
    await User.update({ status: 'suspended' }, { where: { id: report.targetUserId } })
    await notifyUser(report.targetUserId, {
      type: 'moderation_decision',
      title: 'Account update',
      body: 'A moderator limited community posting on your account. You can appeal from your profile.',
      transactional: true,
      payload: { reportId: report.id },
    })
    report.status = 'resolved'
  }
  report.resolution = notes ?? action
  report.resolvedBy = moderatorId
  await report.save()
  await ModerationAction.create({
    moderatorId,
    action,
    targetType: report.targetType,
    targetId: report.targetId,
    notes: notes ?? null,
  })
  if (action !== 'suspend' && report.targetUserId && action !== 'dismiss') {
    await notifyUser(report.targetUserId, {
      type: 'moderation_decision',
      title: 'Moderation decision',
      body: 'A moderator reviewed a report about something you shared.',
      transactional: true,
      payload: { reportId: report.id },
    })
  }
  return { id: report.id, status: report.status }
}

export async function createAppeal(userId: string, statement: string) {
  const open = await Appeal.findOne({ where: { userId, status: 'open' } })
  if (open) throw new AppError(409, 'CONFLICT', 'You already have an appeal waiting for review.')
  const appeal = await Appeal.create({ userId, statement })
  return { id: appeal.id, status: appeal.status, createdAt: appeal.createdAt }
}

export async function listAppeals() {
  const appeals = await Appeal.findAll({ where: { status: 'open' }, order: [['createdAt', 'ASC']], limit: 100 })
  return appeals.map((appeal) => ({
    id: appeal.id,
    statement: appeal.statement,
    status: appeal.status,
    createdAt: appeal.createdAt,
  }))
}

export async function resolveAppeal(moderatorId: string, appealId: string, decision: 'accepted' | 'denied', notes?: string | null) {
  const appeal = await Appeal.findByPk(appealId)
  if (!appeal || appeal.status !== 'open') throw new AppError(404, 'NOT_FOUND', 'That appeal is not open.')
  appeal.status = decision
  appeal.reviewedBy = moderatorId
  appeal.resolution = notes ?? null
  await appeal.save()
  if (decision === 'accepted') {
    await User.update({ status: 'active' }, { where: { id: appeal.userId } })
  }
  await ModerationAction.create({
    moderatorId,
    action: `appeal_${decision}`,
    targetType: 'appeal',
    targetId: appeal.id,
    notes: notes ?? null,
  })
  await notifyUser(appeal.userId, {
    type: 'moderation_decision',
    title: 'Appeal update',
    body: decision === 'accepted' ? 'Your appeal was accepted and community access was restored.' : 'Your appeal was reviewed and the decision stands.',
    transactional: true,
    payload: { appealId: appeal.id },
  })
  return { id: appeal.id, status: appeal.status }
}

export async function auditLog() {
  const rows = await ModerationAction.findAll({ order: [['createdAt', 'DESC']], limit: 100 })
  const items = []
  for (const row of rows) {
    items.push({
      id: row.id,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      notes: row.notes,
      createdAt: row.createdAt,
      moderator: await moderatorName(row.moderatorId),
    })
  }
  return items
}

export async function communitySummary() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [users, posts, openReports, postsLast7Days] = await Promise.all([
    User.count(),
    CommunityPost.count(),
    Report.count({ where: { status: 'open' } }),
    CommunityPost.count({ where: { createdAt: { [Op.gte]: since } } }),
  ])
  return {
    users,
    posts,
    openReports,
    postsLast7Days,
    note: 'Counts only. Private journals and AI conversations are not included.',
  }
}
