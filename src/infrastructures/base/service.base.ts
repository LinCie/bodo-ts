import { redis } from "#infrastructures/caching/redis.js"
import { db } from "#infrastructures/database/kysely.js"
import { logger } from "#infrastructures/utilities/logger.utility.js"

abstract class Service {
  protected readonly db = db
  protected readonly redis = redis
  protected readonly log = logger
}

export { Service }
