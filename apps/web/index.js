import { config } from 'dotenv'
import { getEnvPath } from '@repo/utils/utils.js'
const envPath = getEnvPath()
if (envPath) {
  config({ path: envPath, override: true })
} else {
  config({ override: true })
}

/* eslint-disable import/first */

import path from 'path'
import consola from 'consola'
import Express from 'express'
import ejs from 'ejs' // eslint-disable-line no-unused-vars

import { loadRoutes } from './routes/index.js'

import limiter from './middleware/ratelimit.js'
import cors from './middleware/cors.js'
import helmetMiddleware from './middleware/helmet.js'
import stripConsoleMiddleware from './middleware/stripconsole.js'

/* eslint-enable import/first */

const APP_HOST = process.env.APP_HOST || 'localhost'
const APP_PORT = Number(process.env.APP_PORT ?? 3000)
const APP_USE_BUILTIN_API = String(process.env.APP_USE_BUILTIN_API) === 'true'

const app = Express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

// Set EJS as the template engine
app.set('view engine', 'ejs')

// Explicitly set the views directory
const __dirname = import.meta.dirname
app.set('views', path.join(__dirname, '../../resources/views'))
consola.debug('Views directory set to:', path.join(__dirname, '../../resources/views'))

app.use(Express.urlencoded({ extended: true }))
app.use(Express.json())

// Register middlewares
app.use(limiter)
app.use(helmetMiddleware)
app.use(cors)
app.use(stripConsoleMiddleware)

// Load and register routes
const router = await loadRoutes()
app.use(router)

// Load built-in API routes if enabled
if (APP_USE_BUILTIN_API) {
  const AppAPI = await import('@repo/api/routes/index.js')
  const apiRouter = await AppAPI.loadRoutes()
  app.use(apiRouter)
  consola.debug('Built-in API routes registered')
}

// Serving static files
app.use(Express.static(path.join(__dirname, '../../public')))
consola.debug('Static files served from:', path.join(__dirname, '../../public'))
app.use(Express.static(path.join(__dirname, '../../node_modules/sweetalert2/dist')))
consola.debug('SweetAlert2 files served from:', path.join(__dirname, '../../node_modules/sweetalert2/dist'))

// Start the server
app.listen(APP_PORT, APP_HOST, () => {
  consola.log(`Server is running at http://${APP_HOST}:${APP_PORT}`)
})

export default app
