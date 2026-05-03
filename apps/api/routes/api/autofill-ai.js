/**
 * Handling the /autofill-ai endpoint for generating AI-powered autofill suggestions for lesson plan fields
 */

import { AppRoute } from '../index.js'
import consola from 'consola'
import handleAutoFillAI from '@repo/handlers/handle-autofill-ai.js'

export const route = new AppRoute('/autofill-ai', 'post', async (req, res) => {
  try {
    const result = await handleAutoFillAI(req.body)

    if (result.status === 200) {
      res.json({ status: true, data: result.data })
    } else {
      res.status(result.status).json({ status: false, message: result.message })
    }
  } catch (error) {
    consola.error('Error generating recommendation:', error)
    res.status(500).json({ status: false, message: 'Failed to generate recommendation' })
  }
})
