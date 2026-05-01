/**
 * This file is handleing req for generating the document based on the provided data from the client.
 */

import { AppRoute } from '../index.js'
import OpenAIWrapper from '../../../../lib/openai.js'
import { extractCodeFromMarkdownFence, validateBodyParams } from '../../../../utils/utils.js'
import generateDocxInVM from '../../../../lib/vm-generate-docx.js'
import consola from 'consola'

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
 */
function buildRencanaKegiatan (body, kegiatanKeys) {
  const lines = ['# Rencana Kegiatan', '']

  // Parse activities and group by day and JP
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

const openai = new OpenAIWrapper()

export const route = new AppRoute('/generate', 'post', async (req, res) => {
  const body = req.body
  const kegiatanKeys = Object.keys(req.body).filter(key => !FILTER_KEYS.includes(key))

  const validate = validateBodyParams(body, ...FILTER_KEYS.filter(key => !OPTIONAL_KEYS.includes(key)), kegiatanKeys)
  if (!validate) {
    return res.status(400).json({ status: false, message: 'Missing required parameters', buffer: null })
  }
  if (validate.status === false) {
    return res.status(400).json({ status: false, message: validate.message, buffer: null })
  }

  const { totalHari, kegiatanPerHari } = parseAlokasiWaktu(body.alokasiWaktu)

  // Build Rencana Kegiatan section dynamically from received kegiatan data
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
${body.dimensiProfilLulusan.split(',').map((dpl) => `- ${dpl.trim()}`).join('\n')}

## Elemen Capaian Pembelajaran
${body.elemenCp.split(',').map((cp) => `- ${cp.trim()}`).join('\n')}

## Tujuan Pembelajaran
${body.tujuanPembelajaran}

## Topik Pembelajaran
${body.topikPembelajaran}

${rencanaKegiatan}
`

  const response = await openai.chat(prompt)

  // Remove code blocks from the response
  const cleanResponse = extractCodeFromMarkdownFence(response)

  // Execute the code — credentialVars is passed directly from above
  const docxBuffer = await generateDocxInVM({ ...body }, cleanResponse)
  if (docxBuffer) {
    res.setHeader('Content-Disposition', 'attachment; filename="Modul_Ajar_' + body.namaSekolah.replace(/\s+/g, '_') + '.docx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return res.status(200).send(docxBuffer)
  } else {
    consola.error('Failed to generate document: No buffer returned from VM')
    return res.status(500).json({ status: false, message: 'Failed to generate document', buffer: null })
  }
})
