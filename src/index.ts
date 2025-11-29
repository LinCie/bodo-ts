import { env } from "#infrastructures/config/env.config.js"
import { logger } from "#infrastructures/utilities/logger.utility.js"
import { errorMiddleware } from "#middlewares/error.middleware.js"
import { ItemsController } from "#modules/items/items.controller.js"
import express from "express"
import helmet from "helmet"
import morgan from "morgan"

const app = express()
const port = env.PORT

// Before request middlewares
app
  .use(
    morgan("tiny", {
      stream: {
        write: message => {
          logger.info(message.trim())
        },
      },
    }),
  )
  .use(helmet())
  .use(express.json())

// Regular Routes
app
  // Index
  .get("/", (req, res) => {
    res.send("Hello World!")
  })
  .use("/api/v1/items", new ItemsController().router)

// After request middlewares
app.use(errorMiddleware)

app.listen(port, () => {
  logger.info(`Server is listening to port ${env.PORT} 🦊`)
})
