import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mockReply, replyWithFallback, RemoteLLMProvider } from '../src/services/ai/LLMProvider'
import { assessSafety } from '../src/services/ai/safety'
import { TeachableMachineService } from '../src/services/ml/TeachableMachineService'

test('guest listener reflects without claiming to be a therapist', async () => {
  const reply = mockReply('listen', "I'm exhausted. Nobody seems to appreciate what I do.")
  assert.match(reply, /simply listen/i)
  const result = await replyWithFallback({
    mode: 'listen',
    messages: [{ role: 'user', content: 'I had a long day and I want to set it down.' }],
  })
  assert.equal(result.simulated, true)
  assert.equal(result.provider, 'mock')
})

test('crisis text stays with the safety response', async () => {
  const safety = assessSafety('I want to die', 'us')
  assert.equal(safety.escalated, true)
  assert.ok(safety.resources.some((item) => item.url.includes('988lifeline.org')))
  const remote = new RemoteLLMProvider('http://example.test', async () => {
    throw new Error('should not be called')
  })
  const result = await replyWithFallback({
    mode: 'encourage',
    region: 'uk',
    messages: [{ role: 'user', content: 'I want to hurt myself' }],
  }, remote)
  assert.match(result.content, /116 123/)
  assert.equal(result.simulated, true)
})

test('Teachable Machine stays disabled when loading fails or text is requested', async () => {
  const missing = new TeachableMachineService({
    enabled: false,
    modelType: 'audio',
    modelUrl: '',
    metadataUrl: '',
    confidenceThreshold: 0.75,
  })
  const unavailable = await missing.prepare()
  assert.equal(unavailable.available, false)
  await assert.rejects(() => missing.classify('audio'))

  const textModel = new TeachableMachineService({
    enabled: true,
    modelType: 'text',
    modelUrl: 'https://example.test/model.json',
    metadataUrl: 'https://example.test/metadata.json',
    confidenceThreshold: 0.75,
  })
  const rejected = await textModel.prepare()
  assert.match(rejected.reason, /Text classification/i)

  const failed = new TeachableMachineService(
    {
      enabled: true,
      modelType: 'audio',
      modelUrl: 'https://example.test/model.json',
      metadataUrl: 'https://example.test/metadata.json',
      confidenceThreshold: 0.75,
    },
    undefined,
    async () => {
      throw new Error('offline')
    },
  )
  const loaded = await failed.prepare()
  assert.match(loaded.reason, /could not be loaded/i)

  const metadataOnly = new TeachableMachineService(
    {
      enabled: true,
      modelType: 'image',
      modelUrl: 'https://example.test/model.json',
      metadataUrl: 'https://example.test/metadata.json',
      confidenceThreshold: 0.75,
    },
    undefined,
    async () => ({ ok: true, json: async () => ({ labels: ['quiet', 'tense'] }) }) as Response,
  )
  const partial = await metadataOnly.prepare()
  assert.equal(partial.available, false)
  assert.deepEqual(partial.labels, ['quiet', 'tense'])
  assert.match(partial.reason, /runtime/i)
})
