import { resourcesForRegion } from '../../content/copy'

const SELF_HARM =
  /\b(suicid(e|al)|kill myself|end my life|want to die|do not want to live|don't want to live|hurt myself|self[-\s]?harm|ending it all|can't go on|cannot go on|better off dead|take my own life|wish i were dead|wish i was dead)\b/i

const HARM_OTHERS = /\bi(?:'m| am| will| plan to)?\s+(?:going to\s+)?(?:kill|hurt)\s+(?:him|her|them|someone)\b/i

export interface SafetyAssessment {
  escalated: boolean
  harmToOthers: boolean
  message: string | null
  resources: { name: string; contact: string; url: string }[]
}

/** Offline mirror of the server safety net. Keyword matching is not a diagnosis and is not the Teachable Machine model. */
export function assessSafety(text: string, region = 'international'): SafetyAssessment {
  const harmToOthers = HARM_OTHERS.test(text)
  const selfHarm = SELF_HARM.test(text)
  if (!selfHarm && !harmToOthers) return { escalated: false, harmToOthers: false, message: null, resources: [] }
  const resources = resourcesForRegion(region).map((item) => ({ name: item.name, contact: item.contact, url: item.url }))
  const message = harmToOthers
    ? 'I can’t help with harming someone. If there is any chance a person could get hurt, contact local emergency services now. If you are angry and need to talk without planning to hurt anyone, you can say that plainly and I will listen.'
    : 'I’m really glad you said something. I’m not an emergency service or a therapist, and you deserve a person who can stay with you. If you might act on thoughts of suicide or self-harm, contact local emergency services or a crisis line now. If you can, tell someone you trust.'
  return { escalated: true, harmToOthers, message, resources }
}
