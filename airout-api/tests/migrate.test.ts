import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'fs'
import path from 'path'

const storage = path.resolve(__dirname, '../data/migrate-test.sqlite')
fs.mkdirSync(path.dirname(storage), { recursive: true })
fs.rmSync(storage, { force: true })

process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = storage
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-characters-min'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-characters-min'

test('initial migration creates the community and private tables', async () => {
  const { migrate } = await import('../src/db/migrate')
  const { sequelize } = await import('../src/db/sequelize')
  await migrate()
  await migrate()
  const [rows] = await sequelize.query("SELECT name FROM sqlite_master WHERE type = 'table'")
  const names = (rows as { name: string }[]).map((row) => row.name)
  for (const table of [
    'users',
    'user_profiles',
    'auth_sessions',
    'conversations',
    'chat_messages',
    'mood_entries',
    'journal_entries',
    'community_posts',
    'community_comments',
    'post_reactions',
    'saved_posts',
    'support_circles',
    'circle_members',
    'reports',
    'user_blocks',
    'moderation_actions',
    'notifications',
    'user_preferences',
    'appeals',
    'verification_tokens',
  ]) {
    assert.ok(names.includes(table), `missing ${table}`)
  }
  await sequelize.close()
  fs.rmSync(storage, { force: true })
})
