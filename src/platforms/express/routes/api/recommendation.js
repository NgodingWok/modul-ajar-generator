/**
 * Handling the /recommendation endpoint for generating recommendations to improve lesson plans based on provided class information
 */

import { AppRoute } from '../index.js'
import OpenAIWrapper from '../../../../lib/openai.js'
import consola from 'consola'
import { validateBodyParams } from '../../../../utils/utils.js'
import fs from 'fs'
import path from 'path'

const __dirname = import.meta.dirname

const openai = new OpenAIWrapper(true)

const convesation = [
  {
    role: 'system',
    content: 'You are an expert educational assistant designed to directly generate and perfect lesson plan (RPP) content. You must provide the final text that will be inserted directly into the form field, NOT instructions on what to write.'
  },
  {
    role: 'system',
    content: 'NEVER output directives, prompts, or instructions to the user (e.g., do not write "Deskripsikan...", "Buatlah...", "Tuliskan..."). Output ONLY the actual completed text based on the user\'s context. Act as the teacher writing the document.'
  },
  {
    role: 'system',
    content: 'Your answer must ONLY contain the final smoothed/perfected text without any conversational filler, explanations, or quotes.'
  },
  {
    role: 'system',
    content: 'You should answer in Indonesian language. Make the language professional, concise, clearly understandable, and appropriate for formal educational documents.'
  },
  {
    role: 'system',
    content: 'Your task is to improve the provided text or generate missing text based on context, preserving the main structure and intent while making it pedagogically sound.'
  },
  {
    role: 'system',
    content: 'Fix typo words, and make the sentence more concise and clear, but dont change the main context of the sentence. For example "Barani" should be "Berani" and so on.'
  },
  {
    role: 'system',
    content: 'Dont embed field like "Tujuan pembelajaran: ", just give the direct content. For example "Anak mampu menyebutkan anggota keluarganya dengan benar dan percaya diri."'
  },
  {
    role: 'system',
    content: fs.readFileSync(path.join(__dirname, '../../../context/10-contoh-tema-dan-subtema.md'), 'utf-8')
  }
]
openai.setContext(convesation)

export const route = new AppRoute('/recommendation', 'post', async (req, res) => {
  try {
    const { text, field } = req.body

    const validate = validateBodyParams(req.body, 'text', 'field')
    if (!validate) {
      return res.status(400).json({ status: false, message: 'Missing required parameters' })
    }
    if (validate.status === false) {
      return res.status(400).json({ status: false, message: validate.message })
    }

    // Validation
    if (!text) {
      return res.status(400).json({ status: false, message: 'text is required' })
    }
    if (!field) {
      return res.status(400).json({ status: false, message: 'field is required' })
    }

    const response = await openai.chat(`Berikut adalah konteks dan instruksi untuk field "${field}":
${text}

TUGAS ANDA: Tuliskan hasil akhir teks yang akan langsung dipakai/dimasukkan ke dalam form rpp atau bahan ajar. JANGAN memberikan instruksi, kalimat perintah (seperti "Deskripsikan..."), atau saran penjelasan kepada user. Hasilkan teks kontennya secara langsung, profesional, dan sesuai konteks pendidikan.`)

    res.json({ result: response })
  } catch (error) {
    consola.error('Error generating recommendation:', error)
    res.status(500).json({ status: false, message: 'Failed to generate recommendation' })
  }
})
