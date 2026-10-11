import { Notification, User, UserPreference } from '../models'

export async function notifyUser(
  userId: string,
  input: { type: string; title: string; body: string; payload?: Record<string, string>; transactional?: boolean },
): Promise<void> {
  if (!input.transactional) {
    const prefs = await UserPreference.findOne({ where: { userId } })
    const allowed =
      (input.type === 'reply' && prefs?.notifyReplies) ||
      (input.type === 'reaction' && prefs?.notifyReactions) ||
      (input.type === 'circle' && prefs?.notifyCircles) ||
      (input.type === 'moderation_queue' && prefs?.notifyModeration)
    if (!allowed) return
  }
  await Notification.create({
    userId,
    type: input.type,
    title: input.title,
    body: input.body.slice(0, 180),
    payload: input.payload ?? null,
  })
}

export async function notifyModerators(input: { title: string; body: string; payload?: Record<string, string> }): Promise<void> {
  const moderators = await User.findAll({ where: { role: ['moderator', 'admin'], status: 'active' } })
  await Promise.all(
    moderators.map((moderator) =>
      notifyUser(moderator.id, { type: 'moderation_queue', title: input.title, body: input.body, payload: input.payload }),
    ),
  )
}
