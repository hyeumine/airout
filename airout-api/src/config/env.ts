import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function devDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return fallback
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development'
  },
  port: Number(process.env.PORT ?? 4000),
  db: {
    dialect: (process.env.DB_DIALECT ?? 'mysql') as 'mysql' | 'sqlite',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? 'airout',
    user: process.env.DB_USER ?? 'airout',
    password: process.env.DB_PASSWORD ?? 'airout_dev_password',
    storage: process.env.DB_STORAGE ?? './data/airout.sqlite',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    accessSecret: devDefault('JWT_ACCESS_SECRET', 'dev-only-access-secret-change-me-32b'),
    refreshSecret: devDefault('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-change-me-32'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30),
  },
  llm: {
    baseUrl: process.env.LLM_BASE_URL?.trim() ?? '',
    apiKey: process.env.LLM_API_KEY?.trim() ?? '',
    model: process.env.LLM_MODEL?.trim() ?? '',
  },
  mailProvider: process.env.MAIL_PROVIDER?.trim() ?? '',
}
