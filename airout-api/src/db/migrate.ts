import { DataTypes } from 'sequelize'
import { enableForeignKeys, sequelize } from './sequelize'
import '../models'

/**
 * Initial migration. Model definitions in src/models are the schema source.
 * Later production changes should be new numbered migrations, not edits that rewrite existing tables.
 */
export async function migrate(): Promise<void> {
  await enableForeignKeys()
  const queryInterface = sequelize.getQueryInterface()
  const existing = await queryInterface.showAllTables()
  const names = (existing as Array<string | { tableName?: string }>).map((table) =>
    typeof table === 'string' ? table : table.tableName ?? '',
  )
  if (!names.includes('schema_migrations')) {
    await queryInterface.createTable('schema_migrations', {
      name: { type: DataTypes.STRING(255), primaryKey: true },
      applied_at: { type: DataTypes.DATE, allowNull: false },
    })
  }
  const [rows] = await sequelize.query("SELECT name FROM schema_migrations WHERE name = '001-initial'")
  if (Array.isArray(rows) && rows.length > 0) return
  await sequelize.sync()
  await sequelize.query("INSERT INTO schema_migrations (name, applied_at) VALUES ('001-initial', CURRENT_TIMESTAMP)")
}
