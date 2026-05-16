/**
 * Handles Cloudflare Turnstile validation by verifying the Turnstile response token with the Cloudflare service.
 * @param {any} body - The request body containing the Turnstile response token.
 * @param {string|null} [remoteip=null] - The visitor's IP address (optional).
 * @returns {Promise<boolean>} - A promise that resolves to true if the Turnstile validation is successful, or false otherwise.
 */
const handleCloudflareCaptchaValidation = async (body, remoteip = null) => {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  if (!secret || secret === 'undefined') {
    console.warn('Bypassing Cloudflare Turnstile validation because CLOUDFLARE_TURNSTILE_SECRET_KEY is not set in environment variables.')
    return true
  }

  const { 'cf-turnstile-response': turnstileResponse } = body
  if (!turnstileResponse || typeof turnstileResponse !== 'string') {
    console.warn('Cloudflare Turnstile response token is missing or invalid in the request body.')
    return false
  }

  // Token characteristics: Maximum length 2048 characters
  if (turnstileResponse.length > 2048) {
    console.warn('Cloudflare Turnstile response token is too long.')
    return false
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret,
        response: turnstileResponse,
        ...(remoteip && { remoteip })
      }),
      signal: controller.signal
    })

    const result = await response.json()

    if (!result.success) {
      console.error('Turnstile validation failed:', result['error-codes'])
      return false
    }

    return true
  } catch (/** @type {Error | unknown} */ error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Turnstile validation timeout')
      } else {
        console.error('Error validating Cloudflare Turnstile:', error)
      }
    } else {
      console.error('Unknown error validating Cloudflare Turnstile:', error)
    }
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

export default handleCloudflareCaptchaValidation
