/**
 * Just a example hos to use AppRoute to create a route. You can create as many routes as you want by creating new files in the routes/ directory and exporting an AppRoute instance from those files.
 */

import { AppRoute } from './index.js'

const APP_NAME = process.env.APP_NAME || 'My Express App'

/**
 * Helper function to normalize the API base URL from environment variables, ensuring it is in a consistent format for client-side usage.
 * @param {string} value
 * @returns {string}
 */
const normalizeApiBaseUrl = (value) => {
  if (!value) return '/api'

  const trimmedValue = String(value).trim()
  if (!trimmedValue) return '/api'

  if (trimmedValue.startsWith('/')) {
    const normalizedPath = trimmedValue.replace(/\/+$/, '')
    return normalizedPath === '' ? '/' : normalizedPath
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '/api'
    }

    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '')
    return `${parsedUrl.origin}${normalizedPath === '' ? '' : normalizedPath}`
  } catch {
    return '/api'
  }
}

export const route = new AppRoute('/', 'get', async (req, res) => {
  const META = {
    APP_API_BASE_URL: process.env.APP_USE_BUILTIN_API === 'true'
      ? '/api'
      : normalizeApiBaseUrl(String(process.env.APP_API_BASE_URL)),
    HCAPTCHA_SITE_KEY: String(process.env.HCAPTCHA_SITE_KEY || ''),
    CLOUDFLARE_TURNSTILE_SITE_KEY: String(process.env.CLOUDFLARE_TURNSTILE_SITE_KEY || '')
  }

  res.render('layout/main', { VIEW: 'home', APP_NAME, TITLE: 'Home', BASE_URL: process.env.BASE_URL || '', META })
})
