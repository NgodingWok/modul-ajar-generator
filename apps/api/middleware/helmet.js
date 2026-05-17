import helmet from 'helmet'

/** @returns {string[]} */
const parseEnvHosts = (/** @type {string} */ key) =>
  process.env[key]?.split(',').map(h => h.trim()) ?? []

const CORS_TRUSTED_HOSTS = parseEnvHosts('CORS_TRUSTED_HOSTS')
const CORS_TRUSTED_CDN_HOSTS = parseEnvHosts('CORS_TRUSTED_CDN_HOSTS')
const isDevelopment = process.env.NODE_ENV !== 'production'

const defaultDirectives = helmet.contentSecurityPolicy.getDefaultDirectives()
if (isDevelopment) delete defaultDirectives['upgrade-insecure-requests']

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      ...defaultDirectives,
      'frame-ancestors': ["'self'", ...CORS_TRUSTED_HOSTS],
      'frame-src': [
        "'self'",
        'https://newassets.hcaptcha.com', 'https://js.hcaptcha.com',
        'https://challenges.cloudflare.com',
        ...CORS_TRUSTED_HOSTS
      ],
      'script-src': [
        "'self'", "'unsafe-inline'",
        'https://static.cloudflareinsights.com',
        'https://js.hcaptcha.com', 'https://newassets.hcaptcha.com',
        'https://challenges.cloudflare.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        ...CORS_TRUSTED_CDN_HOSTS
      ],
      'style-src': [
        "'self'", "'unsafe-inline'",
        'https://newassets.hcaptcha.com',
        ...CORS_TRUSTED_CDN_HOSTS
      ],
      'img-src': [
        "'self'", 'data:',
        'https://contrib.rocks',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        ...CORS_TRUSTED_CDN_HOSTS
      ],
      'font-src': ["'self'", ...CORS_TRUSTED_CDN_HOSTS],
      'connect-src': [
        "'self'",
        'https://hcaptcha.com', 'https://*.hcaptcha.com',
        'https://challenges.cloudflare.com',
        'https://pat-issuer.cloudflare.com',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://stats.g.doubleclick.net',
        'https://*.google-analytics.com',
        ...CORS_TRUSTED_HOSTS
      ]
    }
  },
  frameguard: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xPoweredBy: false
})

export default helmetMiddleware
