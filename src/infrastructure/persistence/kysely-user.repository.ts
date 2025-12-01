import type { Insertable, Kysely, Selectable } from "kysely"

import type { UserRepository } from "#domain/auth/index.js"
import { User } from "#domain/auth/index.js"
import type { DB, Users } from "#infrastructure/database/index.js"

type UserRecord = Selectable<Users>

/**
 * Kysely-based implementation of the UserRepository interface.
 * Handles persistence operations for User entities using MySQL database.
 */
class KyselyUserRepository implements UserRepository {
  constructor(private readonly database: Kysely<DB>) {}

  /**
   * Converts a database record to a domain User entity.
   */
  private toDomain(record: UserRecord): User {
    return User.create({
      id: record.id,
      name: record.name,
      email: record.email,
      password: record.password,
      createdAt: record.created_at ?? undefined,
      updatedAt: record.updated_at ?? undefined,
    })
  }

  /**
   * Converts a domain User entity to a database record for persistence.
   */
  private toPersistence(user: User): Insertable<Users> {
    return {
      name: user.name,
      email: user.email,
      password: user.password,
      created_at: user.createdAt ?? new Date(),
      updated_at: user.updatedAt ?? new Date(),
    }
  }

  /**
   * Finds a user by their unique identifier.
   */
  async findById(id: number): Promise<User | null> {
    const record = await this.database
      .selectFrom("users")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst()

    if (!record) {
      return null
    }

    return this.toDomain(record)
  }

  /**
   * Finds a user by their email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    const record = await this.database
      .selectFrom("users")
      .where("email", "=", email)
      .selectAll()
      .executeTakeFirst()

    if (!record) {
      return null
    }

    return this.toDomain(record)
  }

  /**
   * Persists a user entity to the data store.
   * Creates a new user if no ID exists, updates if ID is present.
   */
  async save(user: User): Promise<User> {
    const data = this.toPersistence(user)

    if (user.id) {
      // Update existing user
      await this.database
        .updateTable("users")
        .set({
          name: data.name,
          email: data.email,
          password: data.password,
          updated_at: new Date(),
        })
        .where("id", "=", user.id)
        .execute()

      const updated = await this.findById(user.id)
      if (!updated) {
        throw new Error("Failed to update user")
      }
      return updated
    }

    // Create new user
    const result = await this.database
      .insertInto("users")
      .values(data)
      .executeTakeFirst()

    const insertedId = result.insertId

    const saved = await this.findById(Number(insertedId))
    if (!saved) {
      throw new Error("Failed to save user")
    }

    return saved
  }
}

export { KyselyUserRepository }
