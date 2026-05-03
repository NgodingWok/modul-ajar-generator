import consola from 'consola'

const APP_ORIGIN_URL = process.env.APP_ORIGIN_URL || 'http://localhost:3000'
const APP_ORIGIN_HOST = new URL(APP_ORIGIN_URL).host
const isDevelopment = process.env.NODE_ENV !== 'production'

if (!APP_ORIGIN_URL) {
  throw new Error('APP_ORIGIN_URL environment variable is required')
}

/**
 * Helper function to check if the request host is allowed based on the configured APP_ORIGIN_URL.
 * @param {string | undefined} host - The host from the request headers (e.g., 'localhost:3000')
 * @returns {boolean}
 */
const isHostAllowed = (host) => {
  if (!host) {
    return isDevelopment
  }

  return host === APP_ORIGIN_HOST
}

/**
 * Helper function to check if the request origin is allowed based on the configured APP_ORIGIN_URL.
 * @param {string} origin - The origin from the request headers (e.g., 'http://localhost:3000')
 * @returns {boolean}
 */
const isOriginAllowed = (origin) => {
  if (!origin) {
    return isDevelopment
  }

  return origin === APP_ORIGIN_HOST
}

/**
 * CORS middleware function
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {import('express').Response | void}
 */
const cors = (req, res, next) => {
  const origin = req.headers.origin || req.headers.host || ''
  consola.debug(`CORS check - Origin: ${origin}, Host: ${req.headers.host}`)

  res.header('Vary', 'Origin')

  if (isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }

  if (req.url.startsWith('/api/')) {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  } else {
    res.header('Access-Control-Allow-Methods', 'GET')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
  }

  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400')
    return res.sendStatus(204)
  }

  if (!isOriginAllowed(origin) && !isHostAllowed(req.headers.host)) {
    consola.warn(`CORS blocked - origin not allowed: ${origin}`)
    return res.status(403).json({ status: false, message: '403 Forbidden', error: null })
  }

  next()
}

export default cors
