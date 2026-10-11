export interface CrisisResource {
  id: string
  region: string
  name: string
  detail: string
  contact: string
  url: string
}

/**
 * Published directories and national lines. Confirm locally before relying on them.
 * This keyword layer is a cautious net, not a clinical assessment. It misses paraphrases
 * and can flag people who are quoting someone else. Do not use a classifier in its place.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'international',
    region: 'International',
    name: 'Find a Helpline',
    detail: 'Local helpline directory associated with the International Association for Suicide Prevention.',
    contact: 'https://findahelpline.com',
    url: 'https://findahelpline.com',
  },
  {
    id: 'iasp',
    region: 'International',
    name: 'IASP resources',
    detail: 'International Association for Suicide Prevention.',
    contact: 'https://www.iasp.info/suicidalthoughts/',
    url: 'https://www.iasp.info/suicidalthoughts/',
  },
  {
    id: 'us',
    region: 'United States',
    name: '988 Suicide & Crisis Lifeline',
    detail: 'Call or text 988, or use the online chat.',
    contact: '988',
    url: 'https://988lifeline.org',
  },
  {
    id: 'ca',
    region: 'Canada',
    name: '9-8-8 Suicide Crisis Helpline',
    detail: 'Call or text 9-8-8.',
    contact: '9-8-8',
    url: 'https://988.ca',
  },
  {
    id: 'uk',
    region: 'United Kingdom and Ireland',
    name: 'Samaritans',
    detail: 'Call 116 123.',
    contact: '116 123',
    url: 'https://www.samaritans.org',
  },
  {
    id: 'au',
    region: 'Australia',
    name: 'Lifeline',
    detail: 'Call 13 11 14.',
    contact: '13 11 14',
    url: 'https://www.lifeline.org.au',
  },
]

const REGION_IDS: Record<string, string[]> = {
  international: ['international', 'iasp'],
  us: ['us', 'international', 'iasp'],
  ca: ['ca', 'international', 'iasp'],
  uk: ['uk', 'international', 'iasp'],
  au: ['au', 'international', 'iasp'],
}

const SELF_HARM =
  /\b(suicid(e|al)|kill myself|end my life|want to die|do not want to live|don't want to live|hurt myself|self[-\s]?harm|ending it all|can't go on|cannot go on|better off dead|take my own life|wish i were dead|wish i was dead)\b/i

const HARM_OTHERS = /\bi(?:'m| am| will| plan to)?\s+(?:going to\s+)?(?:kill|hurt)\s+(?:him|her|them|someone)\b/i

export interface SafetyAssessment {
  escalated: boolean
  harmToOthers: boolean
  resources: CrisisResource[]
  message: string | null
}

export function resourcesFor(region: string): CrisisResource[] {
  const ids = REGION_IDS[region] ?? REGION_IDS.international
  return CRISIS_RESOURCES.filter((item) => ids.includes(item.id))
}

export function assessSafety(text: string, region = 'international'): SafetyAssessment {
  const harmToOthers = HARM_OTHERS.test(text)
  const escalated = SELF_HARM.test(text)
  if (!escalated && !harmToOthers) {
    return { escalated: false, harmToOthers: false, resources: [], message: null }
  }
  const resources = resourcesFor(region)
  const message = harmToOthers
    ? 'I can’t help with harming someone. If there is any chance a person could get hurt, contact local emergency services now. If you are angry and need to talk without planning to hurt anyone, you can say that plainly and I will listen.'
    : 'I’m really glad you said something. I’m not an emergency service or a therapist, and you deserve a person who can stay with you. If you might act on thoughts of suicide or self-harm, contact local emergency services or a crisis line now. If you can, tell someone you trust.'
  return { escalated: escalated || harmToOthers, harmToOthers, resources, message }
}
