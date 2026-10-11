import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Category, CommentKind, JournalItem, Mode, Mood, Reaction, ThemeChoice } from '../types'
import { localId, todayKey } from '../lib/format'

export interface GuestComment {
  id: string
  author: string
  body: string
  kind: CommentKind
  createdAt: string
}

export interface GuestPost {
  id: string
  category: Category
  body: string
  displayName: string
  contentWarning: string | null
  commentPermission: 'open' | 'closed'
  createdAt: string
  comments: GuestComment[]
  reactionCounts: Record<Reaction, number>
  myReaction: Reaction | null
  saved: boolean
  circleId: string | null
  owned: boolean
}

export interface GuestChat {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  simulated: boolean
}

export interface GuestConversation {
  id: string
  title: string
  mode: Mode
  temporary: boolean
  messages: GuestChat[]
  updatedAt: string
}

export interface GuestMood {
  id: string
  mood: Mood
  note: string
  recordedOn: string
}

interface GuestData {
  alias: string
  theme: ThemeChoice
  crisisRegion: string
  readAloud: boolean
  guidelinesAccepted: boolean
  joinedCircleIds: string[]
  blockedNames: string[]
  posts: GuestPost[]
  journal: JournalItem[]
  moodHistory: GuestMood[]
  conversations: GuestConversation[]
  activeConversationId: string | null
}

interface GuestState extends GuestData {
  hydrated: boolean
  setAlias: (alias: string) => void
  setTheme: (theme: ThemeChoice) => void
  setCrisisRegion: (region: string) => void
  setReadAloud: (value: boolean) => void
  acceptGuidelines: () => void
  saveMood: (mood: Mood, note: string) => void
  saveJournal: (entry: Omit<JournalItem, 'id'> & { id?: string }) => void
  deleteJournal: (id: string) => void
  publishPost: (post: Omit<GuestPost, 'id' | 'createdAt' | 'comments' | 'reactionCounts' | 'myReaction' | 'saved' | 'owned'>) => void
  commentOn: (postId: string, body: string, kind: CommentKind) => void
  reactTo: (postId: string, reaction: Reaction) => void
  toggleSave: (postId: string) => void
  deletePost: (postId: string) => void
  blockName: (name: string) => void
  joinCircle: (id: string) => void
  leaveCircle: (id: string) => void
  startConversation: (mode: Mode, temporary: boolean) => string
  setMode: (id: string, mode: Mode) => void
  setActive: (id: string | null) => void
  appendChat: (id: string, messages: GuestChat[]) => void
  clearChat: (id: string) => void
  deleteConversation: (id: string) => void
  clearDevice: () => void
}

const counts = (): Record<Reaction, number> => ({ hear: 0, support: 0, not_alone: 0, thanks: 0 })

const welcome = (): GuestConversation => ({
  id: 'welcome',
  title: 'On this device',
  mode: 'listen',
  temporary: false,
  updatedAt: new Date().toISOString(),
  messages: [{
    id: 'welcome-note',
    role: 'assistant',
    content: 'Hi. This is your private space to share. What’s on your mind?',
    createdAt: new Date().toISOString(),
    simulated: true,
  }],
})

const starterPosts = (): GuestPost[] => [
  {
    id: 'p1',
    category: 'encouragement',
    displayName: 'Quiet Sunrise',
    body: 'Today was difficult, but I managed to get through it. Small steps still count.',
    contentWarning: null,
    commentPermission: 'open',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    comments: [{ id: 'c1', author: 'Gentle Rain', body: 'Proud of your progress. Keep going!', kind: 'encouragement', createdAt: new Date(Date.now() - 80000000).toISOString() }],
    reactionCounts: { hear: 0, support: 3, not_alone: 0, thanks: 0 },
    myReaction: null,
    saved: false,
    circleId: null,
    owned: false,
  },
  {
    id: 'p2',
    category: 'advice',
    displayName: 'Gentle Rain',
    body: 'What helps you unwind after an overwhelming day?',
    contentWarning: null,
    commentPermission: 'open',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    comments: [],
    reactionCounts: { hear: 0, support: 2, not_alone: 0, thanks: 0 },
    myReaction: null,
    saved: false,
    circleId: null,
    owned: false,
  },
]

const fresh = (): GuestData => ({
  alias: 'Kind Stranger',
  theme: 'system',
  crisisRegion: 'international',
  readAloud: false,
  guidelinesAccepted: false,
  joinedCircleIds: [],
  blockedNames: [],
  posts: starterPosts(),
  journal: [],
  moodHistory: [],
  conversations: [welcome()],
  activeConversationId: 'welcome',
})

const moodMap: Record<string, Mood> = {
  Calm: 'calm', Okay: 'neutral', Sad: 'sad', Anxious: 'anxious', Overwhelmed: 'exhausted',
  Happy: 'happy', Neutral: 'neutral', Frustrated: 'frustrated', Exhausted: 'exhausted',
}
const topicMap: Record<string, Category> = { Encouragement: 'encouragement', Advice: 'advice', Vent: 'listen' }

function migrateLegacy(saved: Record<string, unknown>): GuestData {
  const base = fresh()
  if (typeof saved.alias === 'string') base.alias = saved.alias
  if (typeof saved.mood === 'string' && moodMap[saved.mood]) {
    base.moodHistory = [{ id: 'legacy-mood', mood: moodMap[saved.mood], note: '', recordedOn: todayKey() }]
  }
  if (Array.isArray(saved.journal)) {
    base.journal = saved.journal.map((item) => {
      const entry = item as { id?: unknown; date?: unknown; body?: unknown }
      return {
        id: String(entry.id ?? localId()),
        title: '',
        body: String(entry.body ?? ''),
        mood: null,
        tags: [],
        entryDate: typeof entry.date === 'string' ? entry.date : todayKey(),
      }
    })
  }
  if (Array.isArray(saved.posts)) {
    base.posts = saved.posts.map((item) => {
      const post = item as { id?: unknown; author?: unknown; topic?: unknown; body?: unknown; hearts?: unknown; comments?: { author?: string; body?: string }[] }
      const category = topicMap[String(post.topic)] ?? 'reflection'
      return {
        id: String(post.id ?? localId()),
        category,
        displayName: String(post.author ?? 'Anonymous'),
        body: String(post.body ?? ''),
        contentWarning: null,
        commentPermission: 'open' as const,
        createdAt: new Date().toISOString(),
        comments: Array.isArray(post.comments)
          ? post.comments.map((comment) => ({ id: localId(), author: comment.author ?? 'Anonymous', body: comment.body ?? '', kind: 'encouragement' as const, createdAt: new Date().toISOString() }))
          : [],
        reactionCounts: { hear: 0, support: Number(post.hearts ?? 0), not_alone: 0, thanks: 0 },
        myReaction: null,
        saved: false,
        circleId: null,
        owned: String(post.author ?? '') === base.alias,
      }
    })
  }
  if (Array.isArray(saved.messages) && saved.messages.length) {
    const conversation = welcome()
    conversation.messages = saved.messages.map((item) => {
      const message = item as { role?: string; text?: string }
      return {
        id: localId(),
        role: message.role === 'user' ? 'user' as const : 'assistant' as const,
        content: String(message.text ?? ''),
        createdAt: new Date().toISOString(),
        simulated: message.role !== 'user',
      }
    })
    base.conversations = [conversation]
    base.activeConversationId = conversation.id
  }
  return base
}

const storage = {
  getItem: async (name: string) => {
    const current = await AsyncStorage.getItem(name)
    if (current) return current
    const legacy = await AsyncStorage.getItem('airout-demo')
    if (!legacy) return null
    try {
      const wrapped = JSON.stringify({ state: migrateLegacy(JSON.parse(legacy) as Record<string, unknown>), version: 0 })
      await AsyncStorage.setItem(name, wrapped)
      return wrapped
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      hydrated: false,
      setAlias: (alias) => set({ alias: alias.slice(0, 28) }),
      setTheme: (theme) => set({ theme }),
      setCrisisRegion: (crisisRegion) => set({ crisisRegion }),
      setReadAloud: (readAloud) => set({ readAloud }),
      acceptGuidelines: () => set({ guidelinesAccepted: true }),
      saveMood: (mood, note) => {
        const recordedOn = todayKey()
        const history = get().moodHistory.filter((item) => item.recordedOn !== recordedOn)
        set({ moodHistory: [{ id: localId(), mood, note, recordedOn }, ...history] })
      },
      saveJournal: (entry) => {
        if (entry.id) {
          set({ journal: get().journal.map((item) => (item.id === entry.id ? { ...item, ...entry, id: item.id } : item)) })
          return
        }
        set({ journal: [{ ...entry, id: localId(), entryDate: entry.entryDate || todayKey() }, ...get().journal] })
      },
      deleteJournal: (id) => set({ journal: get().journal.filter((item) => item.id !== id) }),
      publishPost: (post) => set({
        posts: [{ ...post, id: localId(), createdAt: new Date().toISOString(), comments: [], reactionCounts: counts(), myReaction: null, saved: false, owned: true }, ...get().posts],
      }),
      commentOn: (postId, body, kind) => set({
        posts: get().posts.map((post) => post.id === postId ? { ...post, comments: [...post.comments, { id: localId(), author: get().alias || 'Anonymous', body, kind, createdAt: new Date().toISOString() }] } : post),
      }),
      reactTo: (postId, reaction) => set({
        posts: get().posts.map((post) => {
          if (post.id !== postId) return post
          const reactionCounts = { ...post.reactionCounts }
          if (post.myReaction) reactionCounts[post.myReaction] = Math.max(0, reactionCounts[post.myReaction] - 1)
          if (post.myReaction === reaction) return { ...post, reactionCounts, myReaction: null }
          reactionCounts[reaction] += 1
          return { ...post, reactionCounts, myReaction: reaction }
        }),
      }),
      toggleSave: (postId) => set({ posts: get().posts.map((post) => post.id === postId ? { ...post, saved: !post.saved } : post) }),
      deletePost: (postId) => set({ posts: get().posts.filter((post) => post.id !== postId) }),
      blockName: (name) => set({ blockedNames: [...new Set([...get().blockedNames, name])] }),
      joinCircle: (id) => set({ joinedCircleIds: [...new Set([...get().joinedCircleIds, id])] }),
      leaveCircle: (id) => set({ joinedCircleIds: get().joinedCircleIds.filter((item) => item !== id) }),
      startConversation: (mode, temporary) => {
        const id = localId()
        const conversation: GuestConversation = { id, title: temporary ? 'Temporary chat' : 'New conversation', mode, temporary, messages: [], updatedAt: new Date().toISOString() }
        set({ conversations: [conversation, ...get().conversations.filter((item) => !(temporary && item.temporary))], activeConversationId: id })
        return id
      },
      setMode: (id, mode) => set({ conversations: get().conversations.map((item) => item.id === id ? { ...item, mode } : item) }),
      setActive: (activeConversationId) => set({ activeConversationId }),
      appendChat: (id, messages) => set({
        conversations: get().conversations.map((item) => {
          if (item.id !== id) return item
          const title = item.title === 'New conversation' || item.title === 'Temporary chat'
            ? messages.find((message) => message.role === 'user')?.content.slice(0, 80) || item.title
            : item.title
          return { ...item, title, messages: [...item.messages, ...messages], updatedAt: new Date().toISOString() }
        }),
      }),
      clearChat: (id) => set({ conversations: get().conversations.map((item) => item.id === id ? { ...item, messages: [] } : item) }),
      deleteConversation: (id) => {
        const conversations = get().conversations.filter((item) => item.id !== id)
        set({ conversations, activeConversationId: conversations[0]?.id ?? null })
      },
      clearDevice: () => set({ ...fresh(), hydrated: true }),
    }),
    {
      name: 'airout-guest-v1',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        alias: state.alias,
        theme: state.theme,
        crisisRegion: state.crisisRegion,
        readAloud: state.readAloud,
        guidelinesAccepted: state.guidelinesAccepted,
        joinedCircleIds: state.joinedCircleIds,
        blockedNames: state.blockedNames,
        posts: state.posts,
        journal: state.journal,
        moodHistory: state.moodHistory,
        conversations: state.conversations.filter((item) => !item.temporary),
        activeConversationId: state.activeConversationId,
      }),
      onRehydrateStorage: () => () => {
        useGuestStore.setState({ hydrated: true })
      },
    },
  ),
)

export function visibleGuestPosts(state: GuestState, circleId?: string | null) {
  return state.posts.filter((post) => {
    if (state.blockedNames.includes(post.displayName) && post.displayName !== state.alias) return false
    if (circleId && post.circleId !== circleId) return false
    return true
  })
}
