/**
 * This file is the entrypoint for the Express application. It creates an app instance and exports that instance.
 *
 * Disable the 'x-powered-by' header for security reasons, and set 'trust proxy' to 1 to properly handle client IP addresses when behind a proxy.
 * The app is configured to use EJS as the template engine, and the views/ directory is explicitly set to ensure correct template loading.
 * Middlewares manually registered and each middleware is imported from the middleware/ directory, allowing for modular middleware management.
 * Routes are loaded dynamically from the routes directory, allowing for modular route management.
 * Static files are served from the public/ directory, enabling easy access to assets like CSS, JavaScript, and images.
 *
 * @note You might see imported ejs as an unused variable, but it is necessary to import it to handle production errors related to EJS templates. If you remove the import, you may encounter issues when rendering EJS templates in production environments.
 */

import { configDotenv } from 'dotenv'
import path from 'node:path'
import Express from 'express'
import ejs from 'ejs' // eslint-disable-line no-unused-vars
import { loadRoutes } from './platforms/express/routes/index.js'
import limiter from './platforms/express/middleware/ratelimit.js'
import cors from './platforms/express/middleware/cors.js'
import helmetMiddleware from './platforms/express/middleware/helmet.js'
import stripConsoleMiddleware from './platforms/express/middleware/stripconsole.js'
configDotenv({ override: true })

/**
 * Create an Express application instance, configure it, and export it for use in other parts of the application.
 *
 * @type {import('express').Express}
 */
const app = Express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

// Set EJS as the template engine
app.set('view engine', 'ejs')

// Explicitly set the views directory
const dirname = import.meta.dirname
app.set('views', path.join(dirname, 'views'))

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

// Serving static files
app.use(Express.static('public'))
app.use(Express.static('node_modules/sweetalert2/dist'))

export default app
