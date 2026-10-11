import { createServer } from 'http'
import { env } from './config/env'
import { createApp } from './app'
import { enableForeignKeys } from './db/sequelize'
import { migrate } from './db/migrate'
import { seed } from './db/seed'
import { runRetention } from './services/retention'
import { createSocket } from './socket'

async function main() {
  await enableForeignKeys()
  await migrate()
  if (env.nodeEnv === 'development') await seed()
  const app = createApp()
  const server = createServer(app)
  const io = createSocket(server)
  app.locals.io = io
  setInterval(() => {
    runRetention().catch(() => {
      console.log(JSON.stringify({ retention: 'failed' }))
    })
  }, 6 * 60 * 60 * 1000).unref()
  server.listen(env.port, () => {
    console.log(JSON.stringify({ service: 'airout-api', port: env.port, env: env.nodeEnv }))
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Server failed to start')
  process.exit(1)
})
