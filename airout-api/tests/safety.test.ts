import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.NODE_ENV = 'test'
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-characters-min'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters-min'

test('safety layer flags crisis language and stays silent for ordinary sadness', async () => {
  const { assessSafety, mockReply } = await import('../src/services/aiProvider').then(async (ai) => {
    const safety = await import('../src/services/safety')
    return { assessSafety: safety.assessSafety, mockReply: ai.mockReply }
  })
  const ordinary = assessSafety('I feel sad and tired today.')
  assert.equal(ordinary.escalated, false)
  assert.equal(ordinary.resources.length, 0)

  const crisis = assessSafety('I want to die', 'us')
  assert.equal(crisis.escalated, true)
  assert.ok(crisis.resources.some((item) => item.url === 'https://988lifeline.org'))
  assert.ok(crisis.resources.some((item) => item.url === 'https://findahelpline.com'))
  assert.match(crisis.message ?? '', /not an emergency service/i)

  const listen = mockReply('listen', "I'm exhausted. Nobody seems to appreciate what I do.")
  assert.match(listen, /exhausting/i)
  assert.match(listen, /simply listen/i)
  const reflect = mockReply('reflect', "I'm exhausted. Nobody seems to appreciate what I do.")
  assert.notEqual(listen, reflect)
})

test('remote provider is not required for a reply', async () => {
  const { completeChat } = await import('../src/services/aiProvider')
  const result = await completeChat({
    mode: 'listen',
    messages: [{ role: 'user', content: 'I had a heavy day and I just want to say it out loud.' }],
  })
  assert.equal(result.provider, 'mock')
  assert.equal(result.simulated, true)
  assert.equal(result.safety.escalated, false)
  assert.doesNotMatch(result.content, /diagnos|medication|therapist I am/i)
})

test('crisis text is not handed to a casual reply', async () => {
  const { completeChat } = await import('../src/services/aiProvider')
  const result = await completeChat({
    mode: 'encourage',
    region: 'uk',
    messages: [{ role: 'user', content: 'I want to hurt myself tonight.' }],
  })
  assert.equal(result.safety.escalated, true)
  assert.match(result.content, /116 123/)
  assert.doesNotMatch(result.content, /small kindness|set down tonight/i)
})

test('development tokens are omitted in production', async () => {
  const { devOnlySecret } = await import('../src/lib/tokens')
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    assert.equal(devOnlySecret('raw-token-value'), undefined)
  } finally {
    process.env.NODE_ENV = previous
  }
})
