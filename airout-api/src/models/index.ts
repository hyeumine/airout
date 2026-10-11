import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../db/sequelize'

const id = {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
}

function userRef(onDelete: 'CASCADE' | 'RESTRICT' = 'CASCADE') {
  return {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete,
    onUpdate: 'CASCADE',
  }
}

export class User extends Model {
  declare id: string
  declare email: string
  declare passwordHash: string
  declare emailVerifiedAt: Date | null
  declare role: 'user' | 'moderator' | 'admin'
  declare status: 'active' | 'suspended'
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt: Date | null
  declare profile?: UserProfile
  declare preferences?: UserPreference
}

export class UserProfile extends Model {
  declare id: string
  declare userId: string
  declare displayName: string
}

export class UserPreference extends Model {
  declare id: string
  declare userId: string
  declare theme: 'system' | 'light' | 'dark'
  declare notifyReplies: boolean
  declare notifyReactions: boolean
  declare notifyCircles: boolean
  declare notifyModeration: boolean
  declare journalReminders: boolean
  declare defaultConversationMode: 'listen' | 'reflect' | 'encourage'
  declare crisisRegion: string
  declare guidelinesAcceptedAt: Date | null
  declare aiSaveConsent: boolean
}

export class AuthSession extends Model {
  declare id: string
  declare userId: string
  declare tokenHash: string
  declare expiresAt: Date
  declare revokedAt: Date | null
  declare replacedById: string | null
  declare userAgent: string | null
  declare createdAt: Date
}

export class VerificationToken extends Model {
  declare id: string
  declare userId: string
  declare purpose: 'verify_email' | 'reset_password'
  declare tokenHash: string
  declare expiresAt: Date
  declare usedAt: Date | null
}

export class Conversation extends Model {
  declare id: string
  declare userId: string
  declare title: string
  declare mode: 'listen' | 'reflect' | 'encourage'
  declare temporary: boolean
  declare consentToSave: boolean
  declare expiresAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt: Date | null
  declare messages?: ChatMessage[]
}

export class ChatMessage extends Model {
  declare id: string
  declare conversationId: string
  declare role: 'user' | 'assistant'
  declare content: string
  declare createdAt: Date
  declare updatedAt: Date
}

export class MoodEntry extends Model {
  declare id: string
  declare userId: string
  declare mood: string
  declare note: string | null
  declare recordedOn: string
  declare createdAt: Date
  declare updatedAt: Date
}

export class JournalEntry extends Model {
  declare id: string
  declare userId: string
  declare title: string
  declare body: string
  declare mood: string | null
  declare tags: string[]
  declare entryDate: string
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt: Date | null
}

export class SupportCircle extends Model {
  declare id: string
  declare name: string
  declare slug: string
  declare description: string
  declare rules: string
  declare requiresApproval: boolean
}

export class CircleMember extends Model {
  declare id: string
  declare circleId: string
  declare userId: string
  declare role: 'member' | 'moderator'
}

export class CommunityPost extends Model {
  declare id: string
  declare authorId: string
  declare circleId: string | null
  declare category: string
  declare body: string
  declare identity: 'alias' | 'anonymous'
  declare displayName: string
  declare commentPermission: 'open' | 'closed'
  declare contentWarning: string | null
  declare status: 'published' | 'pending' | 'hidden' | 'removed'
  declare safetyReview: boolean
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt: Date | null
  declare circle?: SupportCircle | null
  declare comments?: CommunityComment[]
}

export class CommunityComment extends Model {
  declare id: string
  declare postId: string
  declare authorId: string
  declare kind: string
  declare body: string
  declare identity: 'alias' | 'anonymous'
  declare displayName: string
  declare status: 'visible' | 'hidden' | 'removed'
  declare createdAt: Date
  declare updatedAt: Date
  declare deletedAt: Date | null
}

export class PostReaction extends Model {
  declare id: string
  declare postId: string
  declare userId: string
  declare type: 'hear' | 'support' | 'not_alone' | 'thanks'
}

export class SavedPost extends Model {
  declare id: string
  declare postId: string
  declare userId: string
}

export class Report extends Model {
  declare id: string
  declare reporterId: string
  declare targetType: 'post' | 'comment'
  declare targetId: string
  declare targetUserId: string | null
  declare reason: string
  declare details: string | null
  declare status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  declare resolution: string | null
  declare resolvedBy: string | null
  declare createdAt: Date
  declare updatedAt: Date
}

export class UserBlock extends Model {
  declare id: string
  declare blockerId: string
  declare blockedId: string
  declare displayName: string
  declare createdAt: Date
}

export class ModerationAction extends Model {
  declare id: string
  declare moderatorId: string
  declare action: string
  declare targetType: string
  declare targetId: string
  declare notes: string | null
  declare createdAt: Date
}

export class Appeal extends Model {
  declare id: string
  declare userId: string
  declare statement: string
  declare status: 'open' | 'accepted' | 'denied'
  declare reviewedBy: string | null
  declare resolution: string | null
  declare createdAt: Date
  declare updatedAt: Date
}

export class Notification extends Model {
  declare id: string
  declare userId: string
  declare type: string
  declare title: string
  declare body: string
  declare readAt: Date | null
  declare payload: Record<string, string> | null
  declare createdAt: Date
}

const base = { sequelize, underscored: true, timestamps: true }

User.init(
  {
    id,
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'user' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
  },
  { ...base, tableName: 'users', paranoid: true },
)

UserProfile.init(
  {
    id,
    userId: { ...userRef(), unique: true },
    displayName: { type: DataTypes.STRING(28), allowNull: false, unique: true },
  },
  { ...base, tableName: 'user_profiles', updatedAt: false },
)

UserPreference.init(
  {
    id,
    userId: { ...userRef(), unique: true },
    theme: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'system' },
    notifyReplies: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    notifyReactions: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    notifyCircles: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    notifyModeration: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    journalReminders: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    defaultConversationMode: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'listen' },
    crisisRegion: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'international' },
    guidelinesAcceptedAt: { type: DataTypes.DATE, allowNull: true },
    aiSaveConsent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { ...base, tableName: 'user_preferences' },
)

AuthSession.init(
  {
    id,
    userId: userRef(),
    tokenHash: { type: DataTypes.STRING(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    replacedById: { type: DataTypes.UUID, allowNull: true },
    userAgent: { type: DataTypes.STRING(180), allowNull: true },
  },
  { ...base, tableName: 'auth_sessions', updatedAt: false, indexes: [{ fields: ['user_id'] }] },
)

VerificationToken.init(
  {
    id,
    userId: userRef(),
    purpose: { type: DataTypes.STRING(32), allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { ...base, tableName: 'verification_tokens', updatedAt: false },
)

Conversation.init(
  {
    id,
    userId: userRef(),
    title: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'New conversation' },
    mode: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'listen' },
    temporary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    consentToSave: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  { ...base, tableName: 'conversations', paranoid: true },
)

ChatMessage.init(
  {
    id,
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'conversations', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    role: { type: DataTypes.STRING(16), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
  },
  { ...base, tableName: 'chat_messages', indexes: [{ fields: ['conversation_id'] }] },
)

MoodEntry.init(
  {
    id,
    userId: userRef(),
    mood: { type: DataTypes.STRING(20), allowNull: false },
    note: { type: DataTypes.STRING(500), allowNull: true },
    recordedOn: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    ...base,
    tableName: 'mood_entries',
    indexes: [{ unique: true, fields: ['user_id', 'recorded_on'] }],
  },
)

JournalEntry.init(
  {
    id,
    userId: userRef(),
    title: { type: DataTypes.STRING(120), allowNull: false, defaultValue: '' },
    body: { type: DataTypes.TEXT, allowNull: false },
    mood: { type: DataTypes.STRING(20), allowNull: true },
    tags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    entryDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  { ...base, tableName: 'journal_entries', paranoid: true, indexes: [{ fields: ['user_id'] }] },
)

SupportCircle.init(
  {
    id,
    name: { type: DataTypes.STRING(80), allowNull: false },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    rules: { type: DataTypes.TEXT, allowNull: false },
    requiresApproval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { ...base, tableName: 'support_circles' },
)

CircleMember.init(
  {
    id,
    circleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'support_circles', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    userId: userRef(),
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'member' },
  },
  {
    ...base,
    tableName: 'circle_members',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['circle_id', 'user_id'] }],
  },
)

CommunityPost.init(
  {
    id,
    authorId: userRef('RESTRICT'),
    circleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'support_circles', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    category: { type: DataTypes.STRING(32), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    identity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'alias' },
    displayName: { type: DataTypes.STRING(28), allowNull: false },
    commentPermission: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'open' },
    contentWarning: { type: DataTypes.STRING(80), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'published' },
    safetyReview: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    ...base,
    tableName: 'community_posts',
    paranoid: true,
    indexes: [{ fields: ['created_at'] }, { fields: ['category'] }, { fields: ['author_id'] }, { fields: ['circle_id'] }],
  },
)

CommunityComment.init(
  {
    id,
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_posts', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    authorId: userRef('RESTRICT'),
    kind: { type: DataTypes.STRING(24), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    identity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'alias' },
    displayName: { type: DataTypes.STRING(28), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'visible' },
  },
  { ...base, tableName: 'community_comments', paranoid: true, indexes: [{ fields: ['post_id'] }] },
)

PostReaction.init(
  {
    id,
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_posts', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    userId: userRef(),
    type: { type: DataTypes.STRING(20), allowNull: false },
  },
  {
    ...base,
    tableName: 'post_reactions',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['post_id', 'user_id'] }],
  },
)

SavedPost.init(
  {
    id,
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_posts', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    userId: userRef(),
  },
  {
    ...base,
    tableName: 'saved_posts',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['user_id', 'post_id'] }],
  },
)

Report.init(
  {
    id,
    reporterId: userRef(),
    targetType: { type: DataTypes.STRING(16), allowNull: false },
    targetId: { type: DataTypes.UUID, allowNull: false },
    targetUserId: { type: DataTypes.UUID, allowNull: true },
    reason: { type: DataTypes.STRING(40), allowNull: false },
    details: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'open' },
    resolution: { type: DataTypes.STRING(500), allowNull: true },
    resolvedBy: { type: DataTypes.UUID, allowNull: true },
  },
  { ...base, tableName: 'reports', indexes: [{ fields: ['status'] }] },
)

UserBlock.init(
  {
    id,
    blockerId: userRef(),
    blockedId: userRef(),
    displayName: { type: DataTypes.STRING(28), allowNull: false },
  },
  {
    ...base,
    tableName: 'user_blocks',
    updatedAt: false,
    indexes: [{ unique: true, fields: ['blocker_id', 'blocked_id'] }],
  },
)

ModerationAction.init(
  {
    id,
    moderatorId: userRef(),
    action: { type: DataTypes.STRING(40), allowNull: false },
    targetType: { type: DataTypes.STRING(24), allowNull: false },
    targetId: { type: DataTypes.UUID, allowNull: false },
    notes: { type: DataTypes.STRING(500), allowNull: true },
  },
  { ...base, tableName: 'moderation_actions', updatedAt: false },
)

Appeal.init(
  {
    id,
    userId: userRef(),
    statement: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'open' },
    reviewedBy: { type: DataTypes.UUID, allowNull: true },
    resolution: { type: DataTypes.STRING(500), allowNull: true },
  },
  { ...base, tableName: 'appeals' },
)

Notification.init(
  {
    id,
    userId: userRef(),
    type: { type: DataTypes.STRING(40), allowNull: false },
    title: { type: DataTypes.STRING(80), allowNull: false },
    body: { type: DataTypes.STRING(180), allowNull: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: true },
  },
  { ...base, tableName: 'notifications', updatedAt: false, indexes: [{ fields: ['user_id'] }] },
)

User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile' })
User.hasOne(UserPreference, { foreignKey: 'userId', as: 'preferences' })
UserProfile.belongsTo(User, { foreignKey: 'userId' })
UserPreference.belongsTo(User, { foreignKey: 'userId' })
User.hasMany(AuthSession, { foreignKey: 'userId' })
User.hasMany(Conversation, { foreignKey: 'userId' })
Conversation.belongsTo(User, { foreignKey: 'userId' })
Conversation.hasMany(ChatMessage, { foreignKey: 'conversationId', as: 'messages' })
ChatMessage.belongsTo(Conversation, { foreignKey: 'conversationId' })
User.hasMany(MoodEntry, { foreignKey: 'userId' })
User.hasMany(JournalEntry, { foreignKey: 'userId' })
User.hasMany(CommunityPost, { foreignKey: 'authorId', as: 'posts' })
CommunityPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' })
CommunityPost.belongsTo(SupportCircle, { foreignKey: 'circleId', as: 'circle' })
SupportCircle.hasMany(CommunityPost, { foreignKey: 'circleId' })
CommunityPost.hasMany(CommunityComment, { foreignKey: 'postId', as: 'comments' })
CommunityComment.belongsTo(CommunityPost, { foreignKey: 'postId' })
CommunityComment.belongsTo(User, { foreignKey: 'authorId', as: 'author' })
CommunityPost.hasMany(PostReaction, { foreignKey: 'postId', as: 'reactions' })
SupportCircle.hasMany(CircleMember, { foreignKey: 'circleId', as: 'members' })
CircleMember.belongsTo(SupportCircle, { foreignKey: 'circleId' })
CircleMember.belongsTo(User, { foreignKey: 'userId' })
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' })
User.hasMany(Notification, { foreignKey: 'userId' })
User.hasMany(Appeal, { foreignKey: 'userId' })
