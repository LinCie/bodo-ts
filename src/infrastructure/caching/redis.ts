import type { RedisClientType } from "redis"

import { env } from "#infrastructure/config/index.js"
import { createClient } from "redis"

const globalForRedis = globalThis as unknown as {
  redis: RedisClientType | undefined
}

globalForRedis.redis ??= createClient({
  url: env.REDIS_URL,
})

export const redis = globalForRedis.redis
