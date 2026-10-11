import { z } from 'zod'
import { AI_MODES, COMMENT_KINDS, CRISIS_REGIONS, MOODS, POST_CATEGORIES, REACTIONS, REPORT_REASONS } from '../config/constants'

const password = z.string().min(10).max(72).regex(/[A-Za-z]/, 'Include a letter.').regex(/[0-9]/, 'Include a number.')
const displayName = z.string().trim().min(2).max(28).regex(/^[\p{L}\p{N} '._-]+$/u, 'Use letters, numbers, and simple punctuation.')

export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password,
  displayName: displayName.optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
})

export const refreshSchema = z.object({ refreshToken: z.string().min(20) })
export const tokenSchema = z.object({ token: z.string().min(20) })
export const resetSchema = z.object({ token: z.string().min(20), password })
export const forgotSchema = z.object({ email: z.string().trim().email().max(254) })
export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1).max(72), newPassword: password })
export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(72),
  deleteCommunityContent: z.boolean().optional().default(false),
})

export const profileSchema = z.object({ displayName })
export const preferenceSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  notifyReplies: z.boolean().optional(),
  notifyReactions: z.boolean().optional(),
  notifyCircles: z.boolean().optional(),
  notifyModeration: z.boolean().optional(),
  journalReminders: z.boolean().optional(),
  defaultConversationMode: z.enum(AI_MODES).optional(),
  crisisRegion: z.enum(CRISIS_REGIONS).optional(),
  aiSaveConsent: z.boolean().optional(),
})

export const conversationSchema = z.object({
  mode: z.enum(AI_MODES).default('listen'),
  temporary: z.boolean().default(false),
  consentToSave: z.boolean().default(false),
})

export const modeSchema = z.object({ mode: z.enum(AI_MODES) })
export const messageSchema = z.object({ content: z.string().trim().min(1).max(4000) })

export const moodSchema = z.object({
  mood: z.enum(MOODS),
  note: z.string().trim().max(500).optional().nullable(),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const journalSchema = z.object({
  title: z.string().trim().max(120).optional().default(''),
  body: z.string().trim().min(1).max(20000),
  mood: z.enum(MOODS).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().default([]),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const postSchema = z.object({
  body: z.string().trim().min(10).max(2000),
  category: z.enum(POST_CATEGORIES),
  identity: z.enum(['alias', 'anonymous']).default('alias'),
  commentPermission: z.enum(['open', 'closed']).default('open'),
  contentWarning: z.string().trim().max(80).optional().nullable(),
  circleId: z.string().uuid().optional().nullable(),
})

export const commentSchema = z.object({
  body: z.string().trim().min(2).max(800),
  kind: z.enum(COMMENT_KINDS),
  identity: z.enum(['alias', 'anonymous']).default('alias'),
})

export const reactionSchema = z.object({ type: z.enum(REACTIONS) })
export const reportSchema = z.object({
  targetType: z.enum(['post', 'comment']),
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional().nullable(),
})
export const blockSchema = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
})
export const appealSchema = z.object({ statement: z.string().trim().min(10).max(2000) })
export const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'hide', 'remove', 'suspend']),
  notes: z.string().trim().max(500).optional().nullable(),
})
export const resolveAppealSchema = z.object({
  decision: z.enum(['accepted', 'denied']),
  notes: z.string().trim().max(500).optional().nullable(),
})
export const circleUpdateSchema = z.object({
  description: z.string().trim().min(10).max(1000).optional(),
  rules: z.string().trim().min(10).max(2000).optional(),
  requiresApproval: z.boolean().optional(),
})
export const readNotificationsSchema = z.object({ ids: z.array(z.string().uuid()).optional() })
