import helmet from 'helmet'

/** @returns {string[]} */

/**
 * Splits a comma-separated string of hosts into an array of trimmed host strings.
 * @param {string} hosts - A comma-separated string of hostnames (e.g., "example.com, api.example.com")
 * @returns {string[]} An array of trimmed hostnames (e.g., ["example.com", "api.example.com"])
 */
const splitHosts = (hosts) => {
  if (!hosts) return []
  return hosts.split(',').map(h => h.trim())
}

const isDevelopment = process.env.NODE_ENV !== 'production'

const defaultDirectives = helmet.contentSecurityPolicy.getDefaultDirectives()
if (isDevelopment) delete defaultDirectives['upgrade-insecure-requests']

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      ...defaultDirectives,
      'frame-ancestors': ["'self'", ...splitHosts(process.env.CORS_TRUSTED_HOSTS || '')],
      'frame-src': [
        "'self'",
        'https://newassets.hcaptcha.com', 'https://js.hcaptcha.com',
        'https://challenges.cloudflare.com',
        ...splitHosts(process.env.CORS_TRUSTED_HOSTS || '')
      ],
      'script-src': [
        "'self'", "'unsafe-inline'",
        'https://static.cloudflareinsights.com',
        'https://js.hcaptcha.com', 'https://newassets.hcaptcha.com',
        'https://challenges.cloudflare.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        ...splitHosts(process.env.CORS_TRUSTED_CDN_HOSTS || '')
      ],
      'style-src': [
        "'self'", "'unsafe-inline'",
        'https://newassets.hcaptcha.com',
        ...splitHosts(process.env.CORS_TRUSTED_CDN_HOSTS || '')
      ],
      'img-src': [
        "'self'", 'data:',
        'https://contrib.rocks',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        ...splitHosts(process.env.CORS_TRUSTED_CDN_HOSTS || '')
      ],
      'font-src': ["'self'", ...splitHosts(process.env.CORS_TRUSTED_CDN_HOSTS || '')],
      'connect-src': [
        "'self'",
        'https://hcaptcha.com', 'https://*.hcaptcha.com',
        'https://challenges.cloudflare.com',
        'https://pat-issuer.cloudflare.com',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://stats.g.doubleclick.net',
        'https://*.google-analytics.com'
      ]
    }
  },
  frameguard: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xPoweredBy: false
})

export default helmetMiddleware
