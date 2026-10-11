import { Sequelize } from 'sequelize'
import { env } from '../config/env'

const logging = env.db.logging ? (sql: string) => console.log(sql) : false

export const sequelize =
  env.db.dialect === 'sqlite'
    ? new Sequelize({
        dialect: 'sqlite',
        storage: env.db.storage,
        logging,
        pool: { max: 1, min: 1, idle: 10000 },
      })
    : new Sequelize(env.db.name, env.db.user, env.db.password, {
        dialect: 'mysql',
        host: env.db.host,
        port: env.db.port,
        logging,
        dialectOptions: { charset: 'utf8mb4' },
        define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
      })

export async function enableForeignKeys(): Promise<void> {
  if (sequelize.getDialect() === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = ON')
  }
}
