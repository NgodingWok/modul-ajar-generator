import consola from 'consola'

const APP_ORIGIN_HOSTS = process.env.APP_ORIGIN_HOSTS || 'localhost'
const isDevelopment = process.env.NODE_ENV !== 'production'

// Support wildcard '*' or comma-separated list of full origin URLs
// e.g. APP_ORIGIN_HOSTS="modul-ajar.web.id,test.modul-ajar.web.id"
const ALLOWED_ORIGINS = APP_ORIGIN_HOSTS === '*'
  ? '*'
  : APP_ORIGIN_HOSTS.split(',').map(o => o.trim())

/**
 * Helper function to check if the request origin is allowed.
 * @param {string | undefined} origin - The origin from the request headers (e.g., 'https://modul-ajar.web.id')
 * @returns {boolean}
 */
const isOriginAllowed = (origin) => {
  if (!origin) return isDevelopment
  if (ALLOWED_ORIGINS === '*') return true
  return ALLOWED_ORIGINS.includes(origin)
}

/**
 * CORS middleware function
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {import('express').Response | void}
 */
const cors = (req, res, next) => {
  const originHeader = req.headers.origin || req.get('origin') || ''

  let origin = ''
  let fullUrl = ''

  if (originHeader) {
    try {
      const urlObj = new URL(originHeader)
      origin = urlObj.hostname
      fullUrl = originHeader
    } catch (e) {
      origin = originHeader
      fullUrl = originHeader
    }
  } else {
    // Fallback if no origin is provided (e.g., direct API calls)
    const hostHeader = String(req.get('host') || '')
    origin = hostHeader.split(':')[0]
    fullUrl = req.protocol + '://' + hostHeader
  }

  consola.debug(`CORS check - Origin Header: ${originHeader}, Extracted Origin: ${origin}, URL: ${fullUrl}`)

  res.header('Vary', 'Origin')

  const IS_ALLOWED = isOriginAllowed(origin)
  consola.debug(`CORS allowed: ${IS_ALLOWED} for origin: ${origin}`)

  if (ALLOWED_ORIGINS === '*') {
    res.header('Access-Control-Allow-Origin', '*')
  } else if (origin && IS_ALLOWED) {
    res.header('Access-Control-Allow-Origin', fullUrl)
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

  if (!isOriginAllowed(origin)) {
    consola.warn(`CORS blocked - origin not allowed: ${origin}`)
    return res.status(403).json({ status: false, message: '403 Forbidden', error: null })
  }

  next()
}

export default cors
