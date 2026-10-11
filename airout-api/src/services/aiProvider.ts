import { env } from '../config/env'
import { assessSafety, type SafetyAssessment } from './safety'

export type ConversationMode = 'listen' | 'reflect' | 'encourage'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface CompletionInput {
  mode: ConversationMode
  messages: ChatTurn[]
  region?: string
}

export interface CompletionResult {
  content: string
  provider: 'mock' | 'remote'
  simulated: boolean
  safety: SafetyAssessment
}

const SYSTEM = `You are AIrOut, a private listening companion inside a support app. You are not a human therapist, not a doctor, and not emergency help.
Listen first. Keep replies to two or three short sentences. Do not diagnose, prescribe, or recommend medication.
Do not encourage dependency or say you will always be there. If someone only wants to vent, do not push advice.
Just Listen: reflect the feeling and ask at most one gentle question.
Help Me Reflect: offer one curious question that explores the situation, the feeling, or what they wish were different.
Encourage Me: acknowledge what they said, offer one grounded affirmation tied to their words, and at most one small optional step.`

export function mockReply(mode: ConversationMode, latest: string): string {
  const text = latest.toLowerCase()
  if (/exhaust|tired|unappreciat|nobody|no one/.test(text)) {
    if (mode === 'encourage') {
      return 'Putting in that much effort and feeling unseen is heavy. The fact that you kept going says something steady about you. One small option, only if you want it, is to name a single task you can set down tonight.'
    }
    if (mode === 'reflect') {
      return 'It sounds like the tiredness and the feeling of being overlooked are tangled together. What part of today felt most unnoticed?'
    }
    return 'That sounds exhausting, especially when your efforts feel unnoticed. Would you like to tell me what happened, or would you prefer that I simply listen?'
  }
  if (/sad|lonely|cry|alone/.test(text)) {
    if (mode === 'encourage') {
      return 'Feeling alone with this hurts, and telling someone — even here — is a real step. You don’t have to brighten it up. If a tiny comfort would help, a glass of water or stepping outside is enough for this moment.'
    }
    if (mode === 'reflect') {
      return 'That sadness sounds close. When the loneliness showed up today, what was happening around you?'
    }
    return 'That sounds painful. Thank you for sharing it. Would you like to tell me what has felt hardest, or should I simply stay with what you said?'
  }
  if (/stress|anxious|overwhelm|worr|frustrat/.test(text)) {
    if (mode === 'encourage') {
      return 'A lot is asking for your attention at once, and it makes sense that your body feels tight. You can set the whole list down for a minute. If you want one small move, pick the single item that is actually due next.'
    }
    if (mode === 'reflect') {
      return 'It sounds like a lot is stacked up. If you pictured one piece of it losing a little weight, which piece would that be?'
    }
    return 'It sounds like a lot is weighing on you. I can sit with that. Would it help to name one part, or would you rather just let it out?'
  }
  if (mode === 'encourage') {
    return 'I’m here for this moment with you, as a listening companion in the app. What you shared matters. If a next step would help, choose one small kindness toward yourself before you decide anything else.'
  }
  if (mode === 'reflect') {
    return 'Thank you for trusting me with that. What feels most important for us to understand about it right now?'
  }
  return 'I’m listening. What would you like me to understand about what you’re going through?'
}

async function remoteReply(input: CompletionInput): Promise<string | null> {
  if (!env.llm.baseUrl || !env.llm.apiKey || !env.llm.model) return null
  const history = input.messages.slice(-20).map((turn) => ({ role: turn.role, content: turn.content }))
  try {
    const response = await fetch(`${env.llm.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: env.llm.model,
        temperature: 0.7,
        max_tokens: 280,
        messages: [{ role: 'system', content: `${SYSTEM}\nCurrent mode: ${input.mode}.` }, ...history],
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = payload.choices?.[0]?.message?.content?.trim()
    return content || null
  } catch {
    return null
  }
}

export async function completeChat(input: CompletionInput): Promise<CompletionResult> {
  const latest = [...input.messages].reverse().find((turn) => turn.role === 'user')?.content ?? ''
  const safety = assessSafety(latest, input.region)
  if (safety.message) {
    const lines = [safety.message]
    if (safety.resources.length) {
      lines.push(safety.resources.map((item) => `${item.name}: ${item.contact}`).join('\n'))
    }
    return { content: lines.join('\n\n'), provider: 'mock', simulated: true, safety }
  }

  const remote = await remoteReply(input)
  if (remote) {
    return { content: remote, provider: 'remote', simulated: false, safety }
  }
  return { content: mockReply(input.mode, latest), provider: 'mock', simulated: true, safety }
}
