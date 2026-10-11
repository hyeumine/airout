export type Mood = 'happy' | 'calm' | 'neutral' | 'sad' | 'anxious' | 'frustrated' | 'exhausted'
export type Category = 'listen' | 'advice' | 'encouragement' | 'victory' | 'gratitude' | 'reflection'
export type Reaction = 'hear' | 'support' | 'not_alone' | 'thanks'
export type Mode = 'listen' | 'reflect' | 'encourage'
export type CommentKind = 'encouragement' | 'experience' | 'advice' | 'question'
export type ThemeChoice = 'system' | 'light' | 'dark'

export interface PublicUser {
  id: string
  email: string
  emailVerified: boolean
  role: 'user' | 'moderator' | 'admin'
  status: 'active' | 'suspended'
  profile: { displayName: string }
  preferences: {
    theme: ThemeChoice
    notifyReplies: boolean
    notifyReactions: boolean
    notifyCircles: boolean
    notifyModeration: boolean
    journalReminders: boolean
    defaultConversationMode: Mode
    crisisRegion: string
    guidelinesAcceptedAt: string | null
    aiSaveConsent: boolean
  }
}

export interface FeedPost {
  id: string
  category: string
  body: string
  displayName: string
  contentWarning: string | null
  commentPermission: 'open' | 'closed'
  createdAt: string
  mine: boolean
  status?: string
  commentCount: number
  reactionCounts: Record<Reaction, number>
  myReaction: string | null
  saved: boolean
  circle: { id: string; name: string } | null
  comments?: FeedComment[]
  safetyNotice?: { message: string; resources: { name: string; contact: string; url: string }[] }
}

export interface FeedComment {
  id: string
  kind: string
  body: string
  displayName: string
  createdAt: string
  mine: boolean
}

export interface JournalItem {
  id: string
  title: string
  body: string
  mood: string | null
  tags: string[]
  entryDate: string
}

export interface MoodItem {
  id: string
  mood: string
  note: string | null
  recordedOn: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  simulated?: boolean
}

export interface ConversationItem {
  id: string
  title: string
  mode: Mode
  temporary: boolean
  consentToSave?: boolean
  messages?: ChatMessage[]
  updatedAt?: string
}
