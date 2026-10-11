import { DEV_SEED_PASSWORD } from '../config/constants'
import { hashPassword } from '../lib/password'
import { CommunityComment, CommunityPost, SupportCircle, User, UserPreference, UserProfile } from '../models'

const CIRCLES = [
  {
    slug: 'academic-pressure',
    name: 'Academic Pressure',
    description: 'A peer space for school, exams, and the weight of expectations.',
    rules: 'This is not a therapy group or a counseling session. Listen first. Do not diagnose classmates or share someone else’s private story.',
  },
  {
    slug: 'work-and-burnout',
    name: 'Work and Burnout',
    description: 'For the tiredness that comes with work, care, and too many demands.',
    rules: 'This is not a therapy group. Offer lived experience, not professional advice. Leave out employer names and contact details.',
  },
  {
    slug: 'family-challenges',
    name: 'Family Challenges',
    description: 'A careful place to talk about home, caregiving, and family strain.',
    rules: 'This is not a therapy group. Do not identify family members. No insults, threats, or pressure to reconcile.',
  },
  {
    slug: 'friendship-and-relationships',
    name: 'Friendship and Relationships',
    description: 'For loneliness, conflict, and the hope of being understood.',
    rules: 'This is not a therapy group or a dating space. Do not post private messages from other people or ask to meet up.',
  },
  {
    slug: 'personal-growth',
    name: 'Personal Growth',
    description: 'Small changes, setbacks, and what you are learning about yourself.',
    rules: 'This is not a therapy group. Encourage without comparing progress or ranking people.',
  },
  {
    slug: 'everyday-encouragement',
    name: 'Everyday Encouragement',
    description: 'Ordinary kindness, gratitude, and reminders that people are listening.',
    rules: 'This is not a therapy group. Keep posts kind. Do not dismiss someone else’s pain with forced positivity.',
  },
]

async function ensureUser(input: { email: string; displayName: string; role: 'user' | 'admin' }) {
  const existing = await User.findOne({ where: { email: input.email } })
  if (existing) return existing
  const user = await User.create({
    email: input.email,
    passwordHash: await hashPassword(DEV_SEED_PASSWORD),
    role: input.role,
    emailVerifiedAt: new Date(),
  })
  await UserProfile.create({ userId: user.id, displayName: input.displayName })
  await UserPreference.create({
    userId: user.id,
    guidelinesAcceptedAt: new Date(),
    notifyModeration: input.role === 'admin',
  })
  return user
}

export async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed development accounts in production.')
  }
  for (const circle of CIRCLES) {
    await SupportCircle.findOrCreate({ where: { slug: circle.slug }, defaults: circle })
  }
  const quiet = await ensureUser({ email: 'quiet@airout.local', displayName: 'Quiet Sunrise', role: 'user' })
  const gentle = await ensureUser({ email: 'gentle@airout.local', displayName: 'Gentle Rain', role: 'user' })
  await ensureUser({ email: 'moderator@airout.local', displayName: 'Circle Steward', role: 'admin' })

  if ((await CommunityPost.count()) > 0) return
  const first = await CommunityPost.create({
    authorId: quiet.id,
    category: 'encouragement',
    body: 'Today was difficult, but I managed to get through it. Small steps still count.',
    identity: 'alias',
    displayName: 'Quiet Sunrise',
    commentPermission: 'open',
  })
  await CommunityComment.create({
    postId: first.id,
    authorId: gentle.id,
    kind: 'encouragement',
    body: 'Proud of your progress. Keep going!',
    identity: 'alias',
    displayName: 'Gentle Rain',
  })
  await CommunityPost.create({
    authorId: gentle.id,
    category: 'advice',
    body: 'What helps you unwind after an overwhelming day?',
    identity: 'alias',
    displayName: 'Gentle Rain',
    commentPermission: 'open',
  })
}
