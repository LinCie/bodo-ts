import { env } from "#infrastructure/config/index.js"
import { Kysely, MysqlDialect } from "kysely"
import { createPool } from "mysql2"
import type { DB } from "./database.js"

const globalForKysely = globalThis as unknown as {
  kysely: Kysely<DB> | undefined
}

const dialect = new MysqlDialect({
  pool: createPool(env.DATABASE_URL),
})

export const db =
  globalForKysely.kysely ??
  new Kysely<DB>({
    dialect,
  })
