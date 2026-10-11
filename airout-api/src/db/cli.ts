import { migrate } from './migrate'
import { seed } from './seed'

async function main() {
  const command = process.argv[2]
  if (command === 'migrate') {
    await migrate()
    console.log('Migration 001-initial is applied.')
  } else if (command === 'seed') {
    await migrate()
    await seed()
    console.log('Development seed data is ready. Do not use these accounts in production.')
  } else {
    throw new Error('Use db:migrate or db:seed.')
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Database command failed')
  process.exit(1)
})
