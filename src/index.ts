import { swaggerSpec } from "#docs/swagger.js"
import {
  composeAuthModule,
  composeItemsModule,
} from "#infrastructure/composition/index.js"
import { env } from "#infrastructure/config/index.js"
import { logger } from "#infrastructure/logging/index.js"
import { errorMiddleware } from "#presentation/shared/middleware/index.js"
import express from "express"
import helmet from "helmet"
import morgan from "morgan"
import swaggerUi from "swagger-ui-express"

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

// Compose modules using dependency injection
const authController = composeAuthModule()
const itemsController = composeItemsModule()

// Regular Routes
app
  // Index route
  .get("/", (req, res) => {
    res.send("Hello World!")
  })
  .use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  .use("/api/v1/auth", authController.router)
  .use("/api/v1/items", itemsController.router)

// After request middlewares
app.use(errorMiddleware)

app.listen(port, () => {
  logger.info(`Server is listening to port ${env.PORT} 🦊`)
})
