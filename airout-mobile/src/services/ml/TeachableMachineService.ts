export interface MlConfig {
  enabled: boolean
  modelType: string
  modelUrl: string
  metadataUrl: string
  confidenceThreshold: number
}

export interface InferenceRuntime {
  predict(input: ArrayBuffer | string): Promise<Array<{ label: string; confidence: number }>>
}

export interface ModelStatus {
  available: boolean
  reason: string
  labels?: string[]
}

/**
 * Loads an exported Teachable Machine model when one is configured.
 * Classification is optional context. It is not a diagnosis and it does not decide safety.
 * Text classification is refused: Teachable Machine exports used here are image or audio models.
 */
export class TeachableMachineService {
  private status: ModelStatus = { available: false, reason: 'Inference has not been started.' }

  constructor(
    private config: MlConfig,
    private runtime?: InferenceRuntime,
    private fetcher: typeof fetch = globalThis.fetch,
  ) {}

  getStatus(): ModelStatus {
    return this.status
  }

  async prepare(): Promise<ModelStatus> {
    if (!this.config.enabled || !this.config.modelUrl || !this.config.metadataUrl) {
      this.status = { available: false, reason: 'No Teachable Machine model is configured.' }
      return this.status
    }
    if (this.config.modelType !== 'audio' && this.config.modelType !== 'image') {
      this.status = {
        available: false,
        reason: 'Only image and audio models are supported. Text classification is not available.',
      }
      return this.status
    }
    try {
      const response = await this.fetcher(this.config.metadataUrl)
      if (!response.ok) throw new Error('metadata request failed')
      const metadata = (await response.json()) as { labels?: unknown }
      if (!Array.isArray(metadata.labels) || metadata.labels.some((label) => typeof label !== 'string')) {
        this.status = { available: false, reason: 'Model metadata is missing a labels list.' }
        return this.status
      }
      const labels = metadata.labels as string[]
      if (!this.runtime) {
        this.status = {
          available: false,
          reason: 'Model metadata loaded, but no compatible inference runtime is installed.',
          labels,
        }
        return this.status
      }
      this.status = { available: true, reason: 'Ready.', labels }
      return this.status
    } catch {
      this.status = { available: false, reason: 'The model could not be loaded. Inference is disabled.' }
      return this.status
    }
  }

  async classify(input: ArrayBuffer | string) {
    if (!this.status.available || !this.runtime) {
      throw new Error(this.status.reason || 'Inference is disabled.')
    }
    const scores = await this.runtime.predict(input)
    return scores.map((score) => ({
      label: score.label,
      confidence: score.confidence,
      meetsThreshold: score.confidence >= this.config.confidenceThreshold,
      note: 'This is an uncertain cue, not a psychological assessment.',
    }))
  }
}
