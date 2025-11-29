import { swaggerSpec } from "#docs/swagger.js"
import { env } from "#infrastructures/config/env.config.js"
import { logger } from "#infrastructures/utilities/logger.utility.js"
import { errorMiddleware } from "#middlewares/error.middleware.js"
import { AuthController } from "#modules/auth/auth.controller.js"
import { ItemsController } from "#modules/items/items.controller.js"
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

// Regular Routes
app
  // Index route
  .get("/", (req, res) => {
    res.send("Hello World!")
  })
  .use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  .use("/api/v1/auth", new AuthController().router)
  .use("/api/v1/items", new ItemsController().router)

// After request middlewares
app.use(errorMiddleware)

app.listen(port, () => {
  logger.info(`Server is listening to port ${env.PORT} 🦊`)
})
