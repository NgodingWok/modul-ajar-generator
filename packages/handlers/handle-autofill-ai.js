import fs from 'fs'
import path from 'path'
import consola from 'consola'
import { validateBodyParams } from '@repo/utils/utils.js'
import OpenAIWrapper from '@repo/core/ai/openai-wrapper.js'

/**
 * @typedef {Object} Message
 * @property {'system' | 'user' | 'assistant' | 'tool'} role - The role of the message sender (excluding 'function' to avoid name requirement)
 * @property {string} content - The content of the message
 * @property {string} [name] - Optional name for tool/function messages
 * @property {string} [tool_call_id] - Optional tool_call_id for tool messages
 */

const __dirname = import.meta.dirname

const openai = new OpenAIWrapper(process.env.OPENAI_API_KEY || '', process.env.OPENAI_MODEL || 'gpt-4.1-2025-04-14', process.env.OPENAI_BASE_URL || null)

/** @type {Message[]} */
openai.context = [
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
    content: 'Berikut adalah DAFTAR REFERENSI tema dan subtema yang tersedia. Gunakan ini HANYA sebagai acuan untuk memilih satu tema dan satu subtema yang paling relevan dengan konteks yang diberikan. JANGAN menampilkan seluruh daftar. Output hanya tema dan subtema terpilih saja.\n\n' + fs.readFileSync(path.join(__dirname, '../../context/10-contoh-tema-dan-subtema.md'), 'utf-8')
  },
  {
    role: 'system',
    content: 'Untuk field yang berkaitan dengan tema dan subtema: pilih SATU tema dan SATU subtema yang paling sesuai dengan konteks yang diberikan pengguna, lalu tuliskan dalam format:\nTema : [nama tema]\nSub Tema : [nama subtema]\n\nContoh output BENAR: "Tema : Diriku\nSub Tema : Identitasku"\nContoh output SALAH: menampilkan semua tema dan subtema sekaligus dalam satu jawaban.'
  }
]

/**
 * Handles auto-filling AI functionality.
 * @param {any} body - The request body containing text and field.
 *
 * @returns {Promise<{status: number, data?: string, message?: string}>} - The auto-filled text.
 */
const handleAutoFillAI = async (body) => {
  const { text, field } = body

  consola.debug('[handleAutoFillAI] Body received:', body)
  consola.debug(`[handleAutoFillAI] Received request for field "${field}" with text:`, text)

  const validate = validateBodyParams({ text, field }, 'text', 'field')
  consola.debug('[handleAutoFillAI] Validation result:', validate)

  if (!validate) {
    return { status: 400, message: 'Missing required parameters' }
  }
  if (validate.status === false) {
    return { status: 400, message: String(validate.message) }
  }

  try {
    const prompt = `Berikut adalah konteks dan instruksi untuk field "${field}":
${text}

TUGAS ANDA: Tuliskan hasil akhir teks yang akan langsung dipakai/dimasukkan ke dalam form rpp atau bahan ajar. JANGAN memberikan instruksi, kalimat perintah (seperti "Deskripsikan..."), atau saran penjelasan kepada user. Hasilkan teks kontennya secara langsung, profesional, dan sesuai konteks pendidikan.`

    consola.debug('[handleAutoFillAI] Context:', openai.context)
    consola.debug('[handleAutoFillAI] Sending prompt to OpenAI:', prompt)

    const response = await openai.chat(prompt)

    if (!response) {
      throw new Error('No response from OpenAI')
    }

    consola.debug('[handleAutoFillAI] Raw response from OpenAI:', response)

    return { status: 200, data: response }
  } catch (err) {
    consola.error('Error in handleAutoFillAI:', err)
    return { status: 500, message: 'Internal server error' }
  }
}

export default handleAutoFillAI
