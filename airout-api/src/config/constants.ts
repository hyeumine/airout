export const ROLES = ['user', 'moderator', 'admin'] as const
export const MOODS = ['happy', 'calm', 'neutral', 'sad', 'anxious', 'frustrated', 'exhausted'] as const
export const POST_CATEGORIES = ['listen', 'advice', 'encouragement', 'victory', 'gratitude', 'reflection'] as const
export const REACTIONS = ['hear', 'support', 'not_alone', 'thanks'] as const
export const COMMENT_KINDS = ['encouragement', 'experience', 'advice', 'question'] as const
export const AI_MODES = ['listen', 'reflect', 'encourage'] as const
export const REPORT_REASONS = ['self_harm_concern', 'harassment', 'spam', 'privacy', 'other'] as const
export const CRISIS_REGIONS = ['international', 'us', 'ca', 'uk', 'au'] as const

export const CATEGORY_LABELS: Record<(typeof POST_CATEGORIES)[number], string> = {
  listen: 'I Need Someone to Listen',
  advice: 'Seeking Advice',
  encouragement: 'Words of Encouragement',
  victory: 'Small Victories',
  gratitude: 'Gratitude',
  reflection: 'Personal Reflections',
}

export const REACTION_LABELS: Record<(typeof REACTIONS)[number], string> = {
  hear: 'I Hear You',
  support: 'Sending Support',
  not_alone: "You're Not Alone",
  thanks: 'Thank You for Sharing',
}

export const DEV_SEED_PASSWORD = 'DevOnly-Listen-2026!'
