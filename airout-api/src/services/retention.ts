import { Op } from 'sequelize'
import { AuthSession, CommunityPost, Conversation, VerificationToken } from '../models'

/** Removes expired sessions, spent tokens, and temporary chats. Does not read message text into logs. */
export async function runRetention(): Promise<void> {
  const now = new Date()
  await AuthSession.destroy({ where: { expiresAt: { [Op.lt]: now } } })
  await VerificationToken.destroy({
    where: { [Op.or]: [{ expiresAt: { [Op.lt]: now } }, { usedAt: { [Op.ne]: null } }] },
  })
  const expiredChats = await Conversation.findAll({
    where: { temporary: true, expiresAt: { [Op.lt]: now } },
  })
  for (const conversation of expiredChats) {
    await conversation.destroy({ force: true })
  }
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  await CommunityPost.update(
    { body: '[deleted by member]', contentWarning: null },
    { where: { deletedAt: { [Op.lt]: cutoff } }, paranoid: false },
  )
}
