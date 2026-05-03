/**
 * This file is handling req for generating the document based on the provided data from the client.
 */

import { AppRoute } from '../index.js'
import consola from 'consola'
import handleGenerateDocx from '@repo/handlers/handle-generate-docx.js'

export const route = new AppRoute('/generate-docx', 'post', async (req, res) => {
  const body = req.body

  try {
    const result = await handleGenerateDocx(body)

    if (result.status === 200) {
      const docxBuffer = result.data
      res.setHeader('Content-Disposition', 'attachment; filename="Modul_Ajar_' + body.namaSekolah.replace(/\s+/g, '_') + '.docx"')
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      return res.status(200).send(docxBuffer)
    } else {
      consola.error('Failed to generate document:', result.message)
      return res.status(500).json({ status: false, message: result.message })
    }
  } catch (err) {
    consola.error('Error in /generate-docx route:', err)
    return res.status(500).json({ status: false, message: 'Internal server error' })
  }
})
