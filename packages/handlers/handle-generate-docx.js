import fs from 'fs'
import path from 'path'
import consola from 'consola'
import { validateBodyParams, extractCodeFromMarkdownFence, removeImportRequire, convertNumToRoman } from '@repo/utils/utils.js'
import handleHCaptchaValidation from './handle-hcaptcha-validation.js'
import OpenAIWrapper from '@repo/core/ai/openai-wrapper.js'
import VMRunner from '@repo/core/engine/vm-runner.js'

import * as docx from 'docx'
import * as docxConfig from '../scripts/docx/docx-config.js'
import * as docxApi from '../scripts/docx/docx-api.js'
import * as docxCoverPage from '../scripts/docx/docx-cover-page.js'

const __dirname = import.meta.dirname

const openai = new OpenAIWrapper(process.env.OPENAI_API_KEY || '', process.env.OPENAI_MODEL || 'gpt-4.1-2025-04-14', process.env.OPENAI_BASE_URL || null)

openai.loadContextsFromDir(path.join(__dirname, '../../context'))

const FILTER_KEYS = [
  'namaSekolah',
  'namaPenyusun',
  'nip',
  'fase',
  'semester',
  'bulan',
  'mingguKe',
  'kelas',
  'jumlahAnak',
  'alokasiWaktu',
  'temaSubtema',
  'modelPembelajaran',
  'elemenCp',
  'dimensiProfilLulusan',
  'materiPembelajaran',
  'identifikasiPesertaDidik',
  'tujuanPembelajaran',
  'topikPembelajaran'
]

const OPTIONAL_KEYS = [
  'namaSekolah',
  'namaPenyusun',
  'nip',
  'jumlahAnak'
]

/**
 * Parse alokasiWaktu string into days and activities per day.
 * Format: 'N x M JP' → { totalHari: N, kegiatanPerHari: M }
 * Example: '5 x 3 JP' → { totalHari: 5, kegiatanPerHari: 3 }
 *
 * @param {string} alokasiWaktu - The alokasi waktu string to parse.
 * @returns {{ totalHari: number, kegiatanPerHari: number }} - Parsed total days and activities per day.
 */
function parseAlokasiWaktu (alokasiWaktu) {
  const match = String(alokasiWaktu).match(/(\d+)\s*x\s*(\d+)/i)
  if (!match) return { totalHari: 5, kegiatanPerHari: 3 }
  return {
    totalHari: parseInt(match[1], 10),
    kegiatanPerHari: parseInt(match[2], 10)
  }
}

/**
 * Build "Rencana Kegiatan" section dynamically from kegiatan keys.
 * Parses keys matching pattern: kegiatanHari{hari}Jp{kegiatan}
 * Groups activities by day in order, numbered as Kegiatan 1, Kegiatan 2, etc.
 *
 * @param {any} body - The request body containing kegiatan keys and values.
 * @param {string[]} kegiatanKeys - The list of keys in the body that represent kegiatan.
 * @returns {string} - The formatted "Rencana Kegiatan" section as a markdown string.
 */
function buildRencanaKegiatan (body, kegiatanKeys) {
  const lines = ['# Rencana Kegiatan', '']

  // Parse activities and group by day and JP
  /** @type {Record<number, Record<number, string>>} */
  const aktivitasByDay = {}

  kegiatanKeys.forEach(key => {
    const match = key.match(/kegiatanHari(\d+)Jp(\d+)/i)
    if (!match) return

    const hari = parseInt(match[1], 10)
    const jp = parseInt(match[2], 10)

    if (!aktivitasByDay[hari]) {
      aktivitasByDay[hari] = {}
    }
    aktivitasByDay[hari][jp] = body[key]
  })

  const sortedDays = Object.keys(aktivitasByDay).map(Number).sort((a, b) => a - b)
  if (sortedDays.length === 0) return lines.join('\n')

  // Build day sections
  sortedDays.forEach((hari, index) => {
    lines.push(`## Hari ${hari}`)

    if (aktivitasByDay[hari]) {
      const jpsForDay = Object.keys(aktivitasByDay[hari])
        .map(Number)
        .sort((a, b) => a - b)

      jpsForDay.forEach((jp, kegiatanIndex) => {
        if (aktivitasByDay[hari][jp]) {
          lines.push(`Kegiatan ${kegiatanIndex + 1}: ${aktivitasByDay[hari][jp]}`)
        }
      })
    }

    if (index < sortedDays.length - 1) {
      lines.push('')
    }
  })

  return lines.join('\n')
}

/**
 * Handles the generation of a DOCX document based on the provided body data.
 *
 * @param {any} body
 * @returns {Promise<{status: number, data?: any, message?: string}>}
 */
const handleGenerateDocx = async (body) => {
  // Validate hCaptcha response before proceeding with document generation
  if (!await handleHCaptchaValidation(body)) {
    return { status: 400, message: 'hCaptcha validation failed' }
  }

  const template = 'original' // TODO: Make this dynamic based on request parameter if multiple templates are supported in the future'
  const kegiatanKeys = Object.keys(body).filter(key => !FILTER_KEYS.includes(key))

  consola.debug('[handleGenerateDocx] Body received:', body)
  consola.debug('[handleGenerateDocx] Identified kegiatan keys:', kegiatanKeys)

  const validate = validateBodyParams(body, ...FILTER_KEYS.filter(key => !OPTIONAL_KEYS.includes(key)))
  consola.debug('[handleGenerateDocx] Validation result:', validate)

  if (!validate) {
    return { status: 400, message: 'Missing required parameters' }
  }
  if (validate.status === false) {
    return { status: 400, message: String(validate.message) }
  }

  try {
    const { totalHari, kegiatanPerHari } = parseAlokasiWaktu(body.alokasiWaktu)
    const rencanaKegiatan = buildRencanaKegiatan(body, kegiatanKeys)

    const prompt = `
Buatkan predefined variable JavaScript berdasarkan data guru di bawah ini.
Hasilkan konten yang sepenuhnya baru dan relevan berdasarkan input guru - jangan gunakan atau meniru nilai contoh dari dokumentasi schema.
Output hanya kode JavaScript murni, tanpa penjelasan, tanpa pembungkus backtick.

---

# Credentials (Ditetapkan oleh sistem — jangan ubah nilai ini)

- Fase          : ${body.fase} 
- Tema/Subtema  : ${body.temaSubtema}
- Kelas         : ${body.kelas}
- Alokasi Waktu : ${body.alokasiWaktu} → ${totalHari} hari pembelajaran, ${kegiatanPerHari} kegiatan per hari
- Model Pembelajaran: ${body.modelPembelajaran}

⚠️  PENTING — Konsistensi Credentials:
- Variabel \`desainPembelajaranTopikPembelajaran\` HARUS konsisten dengan Tema/Subtema di atas.
- Variabel \`rencanaPelaksanaanIntiTable\` HARUS mencerminkan alokasi waktu ${body.alokasiWaktu}:
  * Total hari dalam tabel = ${totalHari} hari (tersebar di 3 tabel: MEMAHAMI, MENGAPLIKASI, MEREFLEKSI)
  * Setiap hari memiliki TEPAT ${kegiatanPerHari} kegiatan pembelajaran
  * Distribusi hari yang direkomendasikan: MEMAHAMI = Hari 1-2, MENGAPLIKASI = Hari 3-4, MEREFLEKSI = Hari 5 untuk alokasi waktu 5 x 3 JP. Sesuaikan distribusi untuk alokasi waktu yang berbeda, tetapi pastikan total hari dan kegiatan per hari tetap konsisten.

---

# Identifikasi

## Peserta Didik
${body.identifikasiPesertaDidik}

## Materi Pembelajaran
${body.materiPembelajaran}

## Dimensi Profil Lulusan
${body.dimensiProfilLulusan.split(',').map((/** @type {string} */ dpl) => `- ${dpl.trim()}`).join('\n')}

## Elemen Capaian Pembelajaran
${body.elemenCp.split(',').map((/** @type {string} */ cp) => `- ${cp.trim()}`).join('\n')}

## Tujuan Pembelajaran
${body.tujuanPembelajaran}

## Topik Pembelajaran
${body.topikPembelajaran}

${rencanaKegiatan}
`

    consola.debug('[handleGenerateDocx] Context:', openai.context)
    consola.debug('[handleGenerateDocx] Generated prompt for OpenAI:', prompt)
    consola.debug('[handleGenerateDocx] Sending prompt to OpenAI to generate JavaScript code for document generation...')

    const response = await openai.chat(prompt)
    const cleanResponse = extractCodeFromMarkdownFence(response)

    consola.debug('[handleGenerateDocx] Raw response from OpenAI:', response)
    consola.debug('[handleGenerateDocx] Extracted JavaScript code from OpenAI response:', cleanResponse)

    const mainCode = removeImportRequire(fs.readFileSync(path.join(__dirname, `../scripts/docx/template/${template}/docx-main.js`), 'utf-8'))

    const code = `${cleanResponse};\n${mainCode};\nreturn (await main(credentialVars))`

    return new Promise((resolve) => {
      const runner = new VMRunner(
        code,
        {},
        (err, result) => {
          if (err) {
            consola.error('Error in VMRunner:', err)
            resolve({ status: 500, message: 'Error generating document' })
          } else {
            consola.debug('[handleGenerateDocx] Final result from VMRunner:', result)
            resolve({ status: 200, data: result })
          }
        }
      )

      runner.addContext(
        docx,
        docxConfig,
        docxApi,
        docxCoverPage,
        { credentialVars: body },
        { convertNumToRoman }
      )

      runner.run()
    })
  } catch (err) {
    consola.error('Error in handleGenerateDocx:', err)
    return { status: 500, message: 'Internal server error' }
  }
}

export default handleGenerateDocx
