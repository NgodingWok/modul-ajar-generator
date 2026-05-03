import { config } from 'dotenv'
import { getEnvPath } from '@repo/utils/utils.js'
const envPath = getEnvPath()
if (envPath) {
  config({ path: envPath, override: true })
} else {
  config({ override: true })
}

/* eslint-disable import/first */

import consola from 'consola'
import Express from 'express'

import { loadRoutes } from './routes/index.js'

import limiter from './middleware/ratelimit.js'
import cors from './middleware/cors.js'
import helmetMiddleware from './middleware/helmet.js'

/* eslint-enable import/first */

const APP_HOST = process.env.APP_HOST || 'localhost'
const APP_PORT = Number(process.env.APP_PORT ?? 3000)

const app = Express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(Express.urlencoded({ extended: true }))
app.use(Express.json())

// Register middlewares
app.use(limiter)
app.use(helmetMiddleware)
app.use(cors)

// Load and register routes
const router = await loadRoutes()
app.use(router)

// Start the server
app.listen(APP_PORT, APP_HOST, () => {
  consola.log(`Server is running at http://${APP_HOST}:${APP_PORT}`)
})

export default app
