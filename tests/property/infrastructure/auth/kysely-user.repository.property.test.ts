import * as fc from "fast-check"
import { describe, expect, it, vi } from "vitest"

import { User } from "#domain/auth/index.js"
import { KyselyUserRepository } from "#infrastructure/persistence/kysely-user.repository.js"

const TEST_TIMEOUT = 30000

// Mock Kysely database for testing
const createMockDb = () => {
  const users = new Map<
    number,
    {
      id: number
      name: string
      email: string
      password: string
      created_at: Date
      updated_at: Date
    }
  >()
  let nextId = 1

  return {
    users,
    selectFrom: vi.fn().mockImplementation(() => ({
      where: vi
        .fn()
        .mockImplementation(
          (field: string, _op: string, value: string | number) => ({
            selectAll: vi.fn().mockImplementation(() => ({
              executeTakeFirst: vi.fn().mockImplementation(() => {
                if (field === "id") {
                  return Promise.resolve(users.get(value as number) ?? null)
                }
                if (field === "email") {
                  const user = Array.from(users.values()).find(
                    u => u.email === value,
                  )
                  return Promise.resolve(user ?? null)
                }
                return Promise.resolve(null)
              }),
            })),
          }),
        ),
    })),
    insertInto: vi.fn().mockImplementation(() => ({
      values: vi
        .fn()
        .mockImplementation(
          (data: {
            name: string
            email: string
            password: string
            created_at: Date
            updated_at: Date
          }) => ({
            executeTakeFirst: vi.fn().mockImplementation(() => {
              const id = nextId++
              users.set(id, {
                id,
                name: data.name,
                email: data.email,
                password: data.password,
                created_at: data.created_at,
                updated_at: data.updated_at,
              })
              return Promise.resolve({ insertId: BigInt(id) })
            }),
          }),
        ),
    })),
    updateTable: vi.fn().mockImplementation(() => ({
      set: vi
        .fn()
        .mockImplementation(
          (data: {
            name: string
            email: string
            password: string
            updated_at: Date
          }) => ({
            where: vi
              .fn()
              .mockImplementation(
                (_field: string, _op: string, id: number) => ({
                  execute: vi.fn().mockImplementation(() => {
                    const existing = users.get(id)
                    if (existing) {
                      users.set(id, {
                        ...existing,
                        name: data.name,
                        email: data.email,
                        password: data.password,
                        updated_at: data.updated_at,
                      })
                    }
                    return Promise.resolve([])
                  }),
                }),
              ),
          }),
        ),
    })),
  }
}

/**
 * **Feature: auth-clean-architecture, Property 9: User Repository Persistence Round Trip**
 * **Validates: Requirements 3.2, 3.3**
 *
 * For any valid User entity, saving to the repository and retrieving by email
 * SHALL return a user with equivalent property values.
 */
describe("KyselyUserRepository - Persistence Round Trip Property Tests", () => {
  // Arbitrary for valid names (non-empty strings with at least one non-whitespace char)
  const validNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  // Arbitrary for valid emails (unique per test)
  const validEmailArb = fc
    .tuple(
      fc
        .string({ minLength: 1, maxLength: 20 })
        .filter(s => /^[a-zA-Z0-9]+$/.test(s)),
      fc
        .string({ minLength: 1, maxLength: 10 })
        .filter(s => /^[a-zA-Z0-9]+$/.test(s)),
      fc
        .string({ minLength: 2, maxLength: 5 })
        .filter(s => /^[a-zA-Z]+$/.test(s)),
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

  // Arbitrary for valid passwords (at least 8 characters)
  const validPasswordArb = fc.string({ minLength: 8, maxLength: 72 })

  it(
    "should persist and retrieve user with equivalent property values",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArb,
          validEmailArb,
          validPasswordArb,
          async (name, email, password) => {
            const mockDb = createMockDb()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const repository = new KyselyUserRepository(mockDb as any)

            // Create a user entity
            const user = User.create({ name, email, password })

            // Save the user
            const savedUser = await repository.save(user)

            // Retrieve by email
            const retrievedUser = await repository.findByEmail(email)

            // Verify round trip preserves properties
            expect(retrievedUser).not.toBeNull()
            expect(retrievedUser?.name).toBe(name)
            expect(retrievedUser?.email).toBe(email)
            expect(retrievedUser?.password).toBe(password)
            expect(retrievedUser?.id).toBe(savedUser.id)
          },
        ),
        { numRuns: 50 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should return null for non-existent email",
    async () => {
      await fc.assert(
        fc.asyncProperty(validEmailArb, async email => {
          const mockDb = createMockDb()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const repository = new KyselyUserRepository(mockDb as any)

          const user = await repository.findByEmail(email)
          expect(user).toBeNull()
        }),
        { numRuns: 50 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should return null for non-existent id",
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 1000000 }), async id => {
          const mockDb = createMockDb()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const repository = new KyselyUserRepository(mockDb as any)

          const user = await repository.findById(id)
          expect(user).toBeNull()
        }),
        { numRuns: 50 },
      )
    },
    TEST_TIMEOUT,
  )

  it(
    "should retrieve saved user by id",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArb,
          validEmailArb,
          validPasswordArb,
          async (name, email, password) => {
            const mockDb = createMockDb()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const repository = new KyselyUserRepository(mockDb as any)

            // Create and save a user
            const user = User.create({ name, email, password })
            const savedUser = await repository.save(user)

            // Retrieve by id
            const userId = savedUser.id
            if (userId === undefined) {
              throw new Error("Saved user should have an id")
            }
            const retrievedUser = await repository.findById(userId)

            // Verify properties match
            expect(retrievedUser).not.toBeNull()
            expect(retrievedUser?.id).toBe(savedUser.id)
            expect(retrievedUser?.name).toBe(name)
            expect(retrievedUser?.email).toBe(email)
            expect(retrievedUser?.password).toBe(password)
          },
        ),
        { numRuns: 50 },
      )
    },
    TEST_TIMEOUT,
  )
})
