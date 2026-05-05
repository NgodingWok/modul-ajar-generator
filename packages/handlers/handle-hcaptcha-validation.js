import { verify } from 'hcaptcha'

/**
 * Handles hCaptcha validation by verifying the hCaptcha response token with the hCaptcha service.
 * @param {any} body - The request body containing the hCaptcha response token.
 * @returns {Promise<boolean>} - A promise that resolves to true if the hCaptcha validation is successful, or false otherwise.
 */
const handleHCaptchaValidation = async (body) => {
  const secret = String(process.env.HCAPTCHA_SECRET_KEY)
  if (!secret) {
    console.warn('Bypassing hCaptcha validation because HCAPTCHA_SECRET_KEY is not set in environment variables.')
    return true
  }

  const { 'h-captcha-response': hCaptchaResponse } = body
  if (!hCaptchaResponse) {
    console.warn('hCaptcha response token is missing in the request body.')
    return false
  }

  try {
    const result = await verify(secret, hCaptchaResponse)
    return result.success
  } catch (error) {
    console.error('Error validating hCaptcha:', error)
    return false
  }
}

export default handleHCaptchaValidation
