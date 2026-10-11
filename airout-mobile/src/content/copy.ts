import type { Category, CommentKind, Mode, Mood, Reaction } from '../types'

export const MOODS: { id: Mood; label: string; face: string; tint: string }[] = [
  { id: 'happy', label: 'Happy', face: '😊', tint: '#FFE4EE' },
  { id: 'calm', label: 'Calm', face: '😌', tint: '#DDF6F1' },
  { id: 'neutral', label: 'Neutral', face: '😐', tint: '#F3E8FF' },
  { id: 'sad', label: 'Sad', face: '😔', tint: '#E4ECFF' },
  { id: 'anxious', label: 'Anxious', face: '😟', tint: '#FFF1D6' },
  { id: 'frustrated', label: 'Frustrated', face: '😣', tint: '#FDE2E4' },
  { id: 'exhausted', label: 'Exhausted', face: '😴', tint: '#E8E4F8' },
]

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'listen', label: 'I Need Someone to Listen' },
  { id: 'advice', label: 'Seeking Advice' },
  { id: 'encouragement', label: 'Words of Encouragement' },
  { id: 'victory', label: 'Small Victories' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'reflection', label: 'Personal Reflections' },
]

export const REACTIONS: { id: Reaction; label: string }[] = [
  { id: 'hear', label: 'I Hear You' },
  { id: 'support', label: 'Sending Support' },
  { id: 'not_alone', label: "You're Not Alone" },
  { id: 'thanks', label: 'Thank You for Sharing' },
]

export const COMMENT_KINDS: { id: CommentKind; label: string }[] = [
  { id: 'encouragement', label: 'Encouragement' },
  { id: 'experience', label: 'Personal experience' },
  { id: 'advice', label: 'Practical advice' },
  { id: 'question', label: 'Supportive question' },
]

export const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'listen', label: 'Just Listen', hint: 'Reflection, few suggestions' },
  { id: 'reflect', label: 'Help Me Reflect', hint: 'One gentle question at a time' },
  { id: 'encourage', label: 'Encourage Me', hint: 'Grounded support and a small step' },
]

export const JOURNAL_PROMPTS = [
  'What felt heavier than it needed to today?',
  'Where did someone, including you, show a little care?',
  'What do you want tomorrow-you to remember about this feeling?',
  'If a kind friend heard this, what might they understand?',
]

export const CIRCLE_SEED = [
  {
    id: 'academic-pressure',
    name: 'Academic Pressure',
    description: 'A peer space for school, exams, and the weight of expectations.',
    rules: 'This is not a therapy group. Listen first. Do not diagnose classmates or share someone else’s private story.',
  },
  {
    id: 'work-and-burnout',
    name: 'Work and Burnout',
    description: 'For the tiredness that comes with work, care, and too many demands.',
    rules: 'This is not a therapy group. Offer lived experience, not professional advice. Leave out workplace names and contact details.',
  },
  {
    id: 'family-challenges',
    name: 'Family Challenges',
    description: 'A careful place to talk about home, caregiving, and family strain.',
    rules: 'This is not a therapy group. Do not identify family members. No insults or pressure to reconcile.',
  },
  {
    id: 'friendship-and-relationships',
    name: 'Friendship and Relationships',
    description: 'For loneliness, conflict, and the hope of being understood.',
    rules: 'This is not a therapy group or a dating space. Do not post private messages from other people.',
  },
  {
    id: 'personal-growth',
    name: 'Personal Growth',
    description: 'Small changes, setbacks, and what you are learning about yourself.',
    rules: 'This is not a therapy group. Encourage without comparing or ranking people.',
  },
  {
    id: 'everyday-encouragement',
    name: 'Everyday Encouragement',
    description: 'Ordinary kindness, gratitude, and reminders that people are listening.',
    rules: 'This is not a therapy group. Keep posts kind. Do not dismiss pain with forced positivity.',
  },
]

export const GUIDELINES = [
  'Listen before you advise. Some people only want to be heard.',
  'Share your own experience. Do not diagnose or tell someone what medication to take.',
  'Use a nickname. Do not post real names, emails, phone numbers, or where someone lives.',
  'No insults, harassment, or pressure to keep talking.',
  'These circles are peers supporting peers. They are not therapy groups or emergency help.',
  'If someone may be in immediate danger, point them toward local emergency services or a crisis line. Do not try to handle a crisis alone in the comments.',
]

export const CRISIS_RESOURCES = [
  { id: 'international', region: 'International', name: 'Find a Helpline', detail: 'Local helpline directory associated with the International Association for Suicide Prevention.', contact: 'findahelpline.com', url: 'https://findahelpline.com' },
  { id: 'iasp', region: 'International', name: 'IASP resources', detail: 'International Association for Suicide Prevention.', contact: 'iasp.info', url: 'https://www.iasp.info/suicidalthoughts/' },
  { id: 'us', region: 'United States', name: '988 Suicide & Crisis Lifeline', detail: 'Call or text 988, or use the online chat.', contact: '988', url: 'https://988lifeline.org' },
  { id: 'ca', region: 'Canada', name: '9-8-8 Suicide Crisis Helpline', detail: 'Call or text 9-8-8.', contact: '9-8-8', url: 'https://988.ca' },
  { id: 'uk', region: 'United Kingdom and Ireland', name: 'Samaritans', detail: 'Call 116 123.', contact: '116 123', url: 'https://www.samaritans.org' },
  { id: 'au', region: 'Australia', name: 'Lifeline', detail: 'Call 13 11 14.', contact: '13 11 14', url: 'https://www.lifeline.org.au' },
]

export const REGION_OPTIONS = [
  { id: 'international', label: 'International directory' },
  { id: 'us', label: 'United States' },
  { id: 'ca', label: 'Canada' },
  { id: 'uk', label: 'United Kingdom and Ireland' },
  { id: 'au', label: 'Australia' },
]

export function resourcesForRegion(region: string) {
  const ids: Record<string, string[]> = {
    international: ['international', 'iasp'],
    us: ['us', 'international', 'iasp'],
    ca: ['ca', 'international', 'iasp'],
    uk: ['uk', 'international', 'iasp'],
    au: ['au', 'international', 'iasp'],
  }
  const wanted = new Set(ids[region] ?? ids.international)
  return CRISIS_RESOURCES.filter((item) => wanted.has(item.id))
}

export function labelFor<T extends string>(items: { id: T; label: string }[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id
}
