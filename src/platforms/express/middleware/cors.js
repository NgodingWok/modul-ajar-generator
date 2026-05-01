const APP_ORIGIN_URL = process.env.APP_ORIGIN_URL || 'http://localhost:3000'
const APP_ORIGIN_HOST = new URL(APP_ORIGIN_URL).host
const isDevelopment = process.env.NODE_ENV !== 'production'

if (!APP_ORIGIN_URL) {
  throw new Error('APP_ORIGIN_URL environment variable is required')
}

const isHostAllowed = (host) => {
  return host === APP_ORIGIN_HOST
}

const isOriginAllowed = (origin) => {
  if (!origin) {
    return isDevelopment
  }

  return origin === APP_ORIGIN_HOST
}

const cors = (req, res, next) => {
  const origin = req.headers.origin || req.headers.host || ''

  res.header('Vary', 'Origin')

  if (isOriginAllowed(origin, req)) {
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
    console.warn(`CORS blocked - origin not allowed: ${origin}`)
    return res.status(403).json({ status: false, message: '403 Forbidden', error: null })
  }

  next()
}

export default cors
