import { db } from "#infrastructures/database/index.js"

abstract class Service {
  protected readonly db = db
}

export { Service }
