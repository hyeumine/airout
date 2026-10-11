import type { Mode } from '../../types'
import { assessSafety, type SafetyAssessment } from './safety'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  mode: Mode
  messages: ChatTurn[]
  region?: string
}

export interface LLMResult {
  content: string
  provider: 'mock' | 'local' | 'remote'
  simulated: boolean
  safety: SafetyAssessment
}

export interface LLMProvider {
  id: 'mock' | 'local' | 'remote'
  isAvailable(): Promise<boolean>
  complete(request: LLMRequest): Promise<LLMResult>
}

export function mockReply(mode: Mode, latest: string): string {
  const text = latest.toLowerCase()
  if (/exhaust|tired|unappreciat|nobody|no one/.test(text)) {
    if (mode === 'encourage') return 'Putting in that much effort and feeling unseen is heavy. The fact that you kept going says something steady about you. One small option, only if you want it, is to name a single task you can set down tonight.'
    if (mode === 'reflect') return 'It sounds like the tiredness and the feeling of being overlooked are tangled together. What part of today felt most unnoticed?'
    return 'That sounds exhausting, especially when your efforts feel unnoticed. Would you like to tell me what happened, or would you prefer that I simply listen?'
  }
  if (/sad|lonely|cry|alone/.test(text)) {
    if (mode === 'encourage') return 'Feeling alone with this hurts, and telling someone — even here — is a real step. You don’t have to brighten it up. If a tiny comfort would help, a glass of water or stepping outside is enough for this moment.'
    if (mode === 'reflect') return 'That sadness sounds close. When the loneliness showed up today, what was happening around you?'
    return 'That sounds painful. Thank you for sharing it. Would you like to tell me what has felt hardest, or should I simply stay with what you said?'
  }
  if (/stress|anxious|overwhelm|worr|frustrat/.test(text)) {
    if (mode === 'encourage') return 'A lot is asking for your attention at once, and it makes sense that your body feels tight. You can set the whole list down for a minute. If you want one small move, pick the single item that is actually due next.'
    if (mode === 'reflect') return 'It sounds like a lot is stacked up. If you pictured one piece of it losing a little weight, which piece would that be?'
    return 'It sounds like a lot is weighing on you. I can sit with that. Would it help to name one part, or would you rather just let it out?'
  }
  if (mode === 'encourage') return 'I’m here for this moment with you, as a listening companion in the app. What you shared matters. If a next step would help, choose one small kindness toward yourself before you decide anything else.'
  if (mode === 'reflect') return 'Thank you for trusting me with that. What feels most important for us to understand about it right now?'
  return 'I’m listening. What would you like me to understand about what you’re going through?'
}

export class MockConversationalProvider implements LLMProvider {
  id = 'mock' as const
  async isAvailable() {
    return true
  }
  async complete(request: LLMRequest): Promise<LLMResult> {
    const latest = [...request.messages].reverse().find((turn) => turn.role === 'user')?.content ?? ''
    const safety = assessSafety(latest, request.region)
    if (safety.message) {
      const resourceLines = safety.resources.map((item) => `${item.name}: ${item.contact}`).join('\n')
      return {
        content: resourceLines ? `${safety.message}\n\n${resourceLines}` : safety.message,
        provider: 'mock',
        simulated: true,
        safety,
      }
    }
    return { content: mockReply(request.mode, latest), provider: 'mock', simulated: true, safety }
  }
}

export class LocalLLMProvider implements LLMProvider {
  id = 'local' as const
  async isAvailable() {
    return false
  }
  async complete(): Promise<LLMResult> {
    throw new Error('A local model is not connected.')
  }
}

export class RemoteLLMProvider implements LLMProvider {
  id = 'remote' as const
  constructor(private baseUrl = process.env.EXPO_PUBLIC_LLM_BASE_URL || '', private fetcher: typeof fetch = globalThis.fetch) {}
  async isAvailable() {
    return Boolean(this.baseUrl)
  }
  async complete(request: LLMRequest): Promise<LLMResult> {
    if (!this.baseUrl) throw new Error('No remote model URL is configured.')
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: request.messages.slice(-20),
        temperature: 0.7,
      }),
    })
    if (!response.ok) throw new Error('Remote model request failed.')
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const content = payload.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error('Remote model returned an empty reply.')
    return { content, provider: 'remote', simulated: false, safety: assessSafety('', request.region) }
  }
}

/** Guest and offline replies. Signed-in chats go through the API so provider keys stay on the server. */
export async function replyWithFallback(request: LLMRequest, remote = new RemoteLLMProvider()): Promise<LLMResult> {
  const safety = assessSafety(request.messages.at(-1)?.content ?? '', request.region)
  if (safety.escalated) return new MockConversationalProvider().complete(request)
  if (await remote.isAvailable()) {
    try {
      return await remote.complete(request)
    } catch {
      // Fall through to the labeled mock listener.
    }
  }
  return new MockConversationalProvider().complete(request)
}
