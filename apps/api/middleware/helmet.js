import helmet from 'helmet'

const CORS_TRUSTED_HOSTS = process.env.CORS_TRUSTED_HOSTS ? process.env.CORS_TRUSTED_HOSTS.split(',').map(host => host.trim()) : []
const CORS_TRUSTED_CDN_HOSTS = process.env.CORS_TRUSTED_CDN_HOSTS
  ? process.env.CORS_TRUSTED_CDN_HOSTS.split(',').map(host => host.trim())
  : []
const isDevelopment = process.env.NODE_ENV !== 'production'

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),

      'upgrade-insecure-requests': isDevelopment ? null : [],
      'frame-ancestors': ["'self'", ...CORS_TRUSTED_HOSTS],
      'frame-src': ["'self'", 'https://newassets.hcaptcha.com', 'https://js.hcaptcha.com', 'https://challenges.cloudflare.com', ...CORS_TRUSTED_HOSTS],
      'script-src': ["'self'", "'unsafe-inline'", 'https://static.cloudflareinsights.com', 'https://js.hcaptcha.com', 'https://newassets.hcaptcha.com', 'https://challenges.cloudflare.com', ...CORS_TRUSTED_CDN_HOSTS],
      'style-src': ["'self'", "'unsafe-inline'", 'https://newassets.hcaptcha.com', ...CORS_TRUSTED_CDN_HOSTS],
      'img-src': ["'self'", 'data:', 'https://contrib.rocks', ...CORS_TRUSTED_CDN_HOSTS],
      'font-src': ["'self'", ...CORS_TRUSTED_CDN_HOSTS],
      'connect-src': ["'self'", 'https://hcaptcha.com', 'https://*.hcaptcha.com', 'https://challenges.cloudflare.com']
    }
  },
  frameguard: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xPoweredBy: false
})

export default helmetMiddleware
