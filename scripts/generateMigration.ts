import fs from "fs"
import path from "path"
import readline from "readline"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../src/infrastructures/database/migrations",
)

const TEMPLATE = `
import { DB } from "#infrastructures/database/database.js"
import { Kysely } from "kysely"

export async function up(db: Kysely<DB>): Promise<void> {}

export async function down(db: Kysely<DB>): Promise<void> {}
`

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  try {
    const migrationNameInput = await prompt("Enter migration name: ")
    const migrationName = migrationNameInput.trim()

    if (!migrationName) {
      console.error("Migration name cannot be empty.")
      process.exit(1)
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    const seconds = String(now.getSeconds()).padStart(2, "0")

    const timestamp = `${year}_${month}_${day}_${hours}${minutes}${seconds}`

    // Handle folder structure if user provides slash
    let targetDir = MIGRATIONS_DIR
    let fileName = migrationName

    if (migrationName.includes("/")) {
      const parts = migrationName.split("/")
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fileName = parts.pop()!
      const subDir = parts.join("/")
      targetDir = path.join(MIGRATIONS_DIR, subDir)
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const fullFileName = `${timestamp}_${fileName}.ts`
    const filePath = path.join(targetDir, fullFileName)

    fs.writeFileSync(filePath, TEMPLATE)

    console.log(`Migration created successfully at: ${filePath}`)
  } catch (error) {
    console.error("Error creating migration:", error)
    process.exit(1)
  }
}

await main()
