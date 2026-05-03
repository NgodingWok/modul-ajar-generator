/**
 * This module is main logic for AI auto fill feature.
 */

/** @var {string[]} - Array of keys for indexing */
const INDEX_KEYS = [
  'temaSubtema',
  'modelPembelajaran',
  'elemenCp',
  'dimensiProfilLulusan',
  'topikPembelajaran',
  'materiPembelajaran',
  'identifikasiPesertaDidik',
  'tujuanPembelajaran'
]

/** @var {string} - Base prompt for AI auto fill */
const AUTO_FILL_PROMPT_BASE = 'Isi kolom berdasarkan informasi dibawah ini:\n\n'

const EMPTY_DPL_VALUE = 'DPL1 Keimanan dan Ketakwaan: false,DPL2 Kewargaan: false,DPL3 Penalaran Kritis: false,DPL4 Kreativitas: false,DPL5 Kolaborasi: false,DPL6 Kemandirian: false,DPL7 Kesehatan: false,DPL8 Komunikasi: false'

const isFieldFilled = (value) => {
  if (!value || value.trim() === '') return false
  return value !== EMPTY_DPL_VALUE
}

const parseKegiatanFieldId = (id) => {
  const match = id.match(/^kegiatanHari(\d+)Jp(\d+)$/)
  if (!match) return null

  return {
    day: Number.parseInt(match[1], 10),
    jp: Number.parseInt(match[2], 10)
  }
}

const getKegiatanInputIdsInOrder = () => {
  return Array.from(document.querySelectorAll('input[id^="kegiatanHari"][id*="Jp"]'))
    .map((el) => {
      const parsed = parseKegiatanFieldId(el.id)
      if (!parsed) return null

      return {
        id: el.id,
        day: parsed.day,
        jp: parsed.jp
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return a.jp - b.jp
    })
    .map((item) => item.id)
}

const getFieldWrapper = (id) => { // eslint-disable-line no-unused-vars
  const wrapperById = document.getElementById(`${id}Wrapper`)
  if (wrapperById) return wrapperById

  const fieldEl = document.getElementById(id)
  if (!fieldEl) return null

  return fieldEl.closest('.relative') || fieldEl.parentElement
}

const getFieldLabel = (id) => {
  const label = document.querySelector(`label[for="${id}"]`)
  if (label) return label.textContent.trim()

  const parsedKegiatan = parseKegiatanFieldId(id)
  if (!parsedKegiatan) return id

  return `Kegiatan hari ${parsedKegiatan.day} JP ${parsedKegiatan.jp}`
}

const getKegiatanSectionsContext = (kegiatanIds, currentFieldId) => {
  const lines = kegiatanIds.map((id) => {
    const value = document.getElementById(id)?.value?.trim() || ''
    if (!value) {
      return `${id}: [KOSONG]`
    }

    const compact = value.replace(/\s+/g, ' ').trim()
    return `${id}: ${compact}`
  })

  return [
    'Konteks section kegiatan yang tersedia (gunakan sebagai referensi konsistensi):',
    ...lines,
    `Section target prioritas utama yang HARUS diisi sekarang: ${currentFieldId}`
  ].join('\n')
}

const getPreviousKegiatanContext = (kegiatanIds, currentKegiatanIndex) => {
  if (currentKegiatanIndex <= 0) {
    return 'Riwayat kegiatan terisi sebelum target: [BELUM ADA]'
  }

  const previousFilled = kegiatanIds
    .slice(0, currentKegiatanIndex)
    .map((id) => {
      const value = document.getElementById(id)?.value?.trim() || ''
      if (!value) return null
      return `${id}: ${value.replace(/\s+/g, ' ').trim()}`
    })
    .filter(Boolean)

  if (previousFilled.length === 0) {
    return 'Riwayat kegiatan terisi sebelum target: [BELUM ADA]'
  }

  return [
    'Riwayat kegiatan terisi sebelum target (pakai sebagai acuan kesinambungan):',
    ...previousFilled
  ].join('\n')
}

const buildKegiatanFlowInstruction = (kegiatanIds, currentFieldId) => {
  const parsedCurrent = parseKegiatanFieldId(currentFieldId)
  if (!parsedCurrent) return ''

  const sameDay = kegiatanIds
    .map((id) => ({ id, parsed: parseKegiatanFieldId(id) }))
    .filter((item) => item.parsed && item.parsed.day === parsedCurrent.day)
    .sort((a, b) => a.parsed.jp - b.parsed.jp)

  const totalJpInDay = sameDay.length
  const currentPos = sameDay.findIndex((item) => item.id === currentFieldId) + 1

  let role = 'inti'
  if (totalJpInDay <= 1) {
    role = 'utuh'
  } else if (currentPos === 1) {
    role = 'pembuka'
  } else if (currentPos === totalJpInDay) {
    role = 'penutup'
  }

  let roleGuidance = 'Buat aktivitas inti yang melanjutkan kegiatan sebelumnya dan menyiapkan transisi ke sesi berikutnya.'
  if (role === 'pembuka') {
    roleGuidance = 'Buat aktivitas pembuka singkat (misalnya doa, absensi, apersepsi) yang mengantar ke inti pembelajaran hari ini.'
  } else if (role === 'penutup') {
    roleGuidance = 'Buat aktivitas penutup/refleksi singkat yang merangkum inti, memberi umpan balik, dan menyiapkan kelanjutan hari berikutnya.'
  } else if (role === 'utuh') {
    roleGuidance = 'Buat alur mini utuh dalam satu sesi: pembuka sangat singkat, inti utama, lalu penutup/refleksi singkat.'
  }

  const previousInDay = sameDay[currentPos - 2]?.id || '-'
  const nextInDay = sameDay[currentPos]?.id || '-'

  return [
    'Aturan kesinambungan kegiatan (WAJIB diikuti):',
    `- Hari ke-${parsedCurrent.day}, JP ke-${parsedCurrent.jp} dari total ${totalJpInDay} JP pada hari ini.`,
    `- Peran sesi saat ini: ${role}.`,
    `- ${roleGuidance}`,
    `- Hubungkan isi dengan sesi sebelumnya pada hari yang sama jika ada (${previousInDay}) tanpa mengulang penuh.`,
    `- Sisipkan transisi alami ke sesi berikutnya jika ada (${nextInDay}).`,
    '- Semua sesi dalam hari yang sama harus terasa sebagai rangkaian yang nyambung, bukan aktivitas yang berdiri sendiri.',
    '- Jika ini hari berikutnya, lanjutkan progres dari hasil hari sebelumnya secara bertahap dan konsisten.'
  ].join('\n')
}

const extractSectionByFieldLabel = (text, fieldId) => {
  const escapedFieldId = fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const targetLabelRegex = new RegExp(`(?:\\*\\*)?${escapedFieldId}(?:\\*\\*)?\\s*:`, 'i')
  const targetMatch = targetLabelRegex.exec(text)
  if (!targetMatch) return text

  const startIndex = targetMatch.index + targetMatch[0].length
  const afterTarget = text.slice(startIndex).trimStart()
  const nextKegiatanLabelRegex = /(?:\*\*)?(?:kegiatanHari\d+Jp\d+|kegiatanH\d+JP\d+)(?:\*\*)?\s*:/gi
  const nextMatch = nextKegiatanLabelRegex.exec(afterTarget)

  if (!nextMatch) return afterTarget.trim()
  return afterTarget.slice(0, nextMatch.index).trim()
}

const compactKegiatanContent = (text) => {
  if (!text) return ''

  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)

  const maxSentences = 3
  const maxWords = 90
  const pickedSentences = sentences.slice(0, maxSentences)
  const limitedWords = pickedSentences.join(' ').split(/\s+/).slice(0, maxWords).join(' ').trim()

  if (!limitedWords) return ''
  if (/[.!?]$/.test(limitedWords)) return limitedWords
  return `${limitedWords}.`
}

const sanitizeAiResult = (result, fieldId) => {
  if (!result) return ''

  let cleaned = String(result).replace(/\r\n/g, '\n').trim()
  cleaned = extractSectionByFieldLabel(cleaned, fieldId)

  cleaned = cleaned
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*(?:\*\*)?(?:kegiatanHari\d+Jp\d+|kegiatanH\d+JP\d+)(?:\*\*)?\s*:\s*/i, '')
    .trim()

  if (parseKegiatanFieldId(fieldId)) {
    cleaned = compactKegiatanContent(cleaned)
  }

  return cleaned
}

/**
 * Get values of elements by keys and return as an object.
 * @param  {...any} keys - Array of keys corresponding to element IDs
 * @returns {Object|null} - Object with key-value pairs of element values or null if any element is not found
 */
const getElementsValues = (...keys) => {
  const res = {}
  const els = keys.map((key) => document.getElementById(key))

  if (els.some(el => !el)) {
    console.error('One or more elements not found for keys:', keys)
    return null
  }

  els.forEach((el, index) => {
    if (keys[index] === 'dimensiProfilLulusan') {
      res[keys[index]] = el.value === 'DPL1 Keimanan dan Ketakwaan: false,DPL2 Kewargaan: false,DPL3 Penalaran Kritis: false,DPL4 Kreativitas: false,DPL5 Kolaborasi: false,DPL6 Kemandirian: false,DPL7 Kesehatan: false,DPL8 Komunikasi: false' ? '' : el.value
    } else {
      res[keys[index]] = el.value
    }
  })

  return res
}

document.addEventListener('click', async (e) => {
  // Handle AI buttons with either id format: "ai.<fieldId>" or "<fieldId>Ai"
  const target = e.target.closest('button[id^="ai."], button[id$="Ai"]')
  if (!target || !target.id) return

  let fieldId = ''
  if (target.id.startsWith('ai.')) {
    fieldId = target.id.slice(3)
  } else if (target.id.endsWith('Ai')) {
    fieldId = target.id.slice(0, -2)
  }

  if (!fieldId) {
    console.error('Failed to resolve field id from AI button id:', target.id)
    return
  }

  const prompt = target.dataset.aiPrompt
  if (!prompt) {
    console.error('AI prompt not found in button dataset for button:', target)
    return
  }

  console.debug('Clicked button:', target)
  console.debug('Id element:', target?.id)

  const inputEl = document.getElementById(fieldId)
  if (!inputEl) {
    console.error('Input element not found for id:', fieldId)
    return
  }

  console.debug('Input element found:', inputEl)

  // If empty, user want an idea of what to fill, so we check if prerequisites are filled
  if (!inputEl.value || inputEl.value.trim() === '') {
    const indexVals = getElementsValues(...INDEX_KEYS)
    if (!indexVals) {
      console.error('Failed to read index values for auto fill prompt.')
      return
    }

    const currentIndex = INDEX_KEYS.indexOf(fieldId)
    const isIndexedField = currentIndex > -1
    const kegiatanIds = getKegiatanInputIdsInOrder()
    const currentKegiatanIndex = kegiatanIds.indexOf(fieldId)
    const isKegiatanField = currentKegiatanIndex > -1

    let previousKeys = []
    if (isIndexedField) {
      previousKeys = INDEX_KEYS.slice(0, currentIndex)
    } else if (isKegiatanField) {
      previousKeys = [...INDEX_KEYS, ...kegiatanIds.slice(0, currentKegiatanIndex)]
    }

    const listUnfilled = previousKeys.filter((key) => {
      const value = document.getElementById(key)?.value ?? indexVals[key] ?? ''
      return !isFieldFilled(value)
    })
    let isPrerequisiteFilled = true

    const generateLinks = (keys) => {
      if (keys.length === 0) return '<p class="text-green-500">Semua form sebelumnya sudah terisi. Silakan klik tombol lagi untuk mendapatkan ide.</p>'

      return `
        <p class="mb-2">Form sebelumnya yang belum terisi:</p>
        <ul class="list-disc list-inside text-left">
          ${keys.map(key => {
            const labelText = getFieldLabel(key)
            return `<li><a href="#${key}" class="text-blue-500 underline">${labelText}</a></li>`
          }).join('')}
        </ul>
      `
    }

    previousKeys.forEach((key) => {
      const value = document.getElementById(key)?.value ?? indexVals[key] ?? ''
      if (!isFieldFilled(value)) {
        isPrerequisiteFilled = false
        console.warn(`Prerequisite field "${key}" is not filled.`)
      }
    })

    console.debug('Current index value:', currentIndex)
    console.debug('Index values:', indexVals)
    console.debug('Previous keys:', previousKeys)
    console.debug('Is prerequisite filled:', isPrerequisiteFilled)
    console.debug('List of unfilled prerequisites:', listUnfilled)

    if ((isIndexedField || isKegiatanField) && !isPrerequisiteFilled) {
      SwalValidationWrapper.autoNextFocus(false).showValidationToast({ // eslint-disable-line no-undef
        title: "<span class='text-red-500'>Lengkapi form sebelumnya untuk memberi AI sebuah gambaran</span>",
        html: generateLinks(listUnfilled),
        unfilledFields: listUnfilled,
        getLinkElement: (id) => document.querySelector(`.swal2-container a[href="#${id}"]`),
        isFieldFilled: (id) => {
          const value = document.getElementById(id)?.value ?? indexVals[id] ?? ''
          return isFieldFilled(value)
        },
        checkDelay: 2000
      })

      return
    }

    try {
      let autoFillPrompt = AUTO_FILL_PROMPT_BASE

      Object.keys(indexVals).forEach(key => {
        if (isFieldFilled(indexVals[key])) {
          autoFillPrompt += `${key}: ${indexVals[key]}\n`
        }
      })

      if (isKegiatanField) {
        autoFillPrompt += `\n${getPreviousKegiatanContext(kegiatanIds, currentKegiatanIndex)}\n`
        autoFillPrompt += `\n${getKegiatanSectionsContext(kegiatanIds, fieldId)}\n`
        autoFillPrompt += `\n${buildKegiatanFlowInstruction(kegiatanIds, fieldId)}\n`
        autoFillPrompt += '\nBatasan durasi: 1 JP = 30 menit, jadi konten harus ringkas dan realistis untuk satu sesi singkat.'
        autoFillPrompt += '\nFormat isi kegiatan menyesuaikan peran sesi (pembuka/inti/penutup) secara dinamis berdasarkan posisi JP.'
        autoFillPrompt += '\nBatas panjang: maksimal 2-3 kalimat dan maksimal 90 kata.'
      }

      autoFillPrompt += `\nBerdasarkan informasi di atas, isi kolom "${fieldId}" dengan hasil akhir yang langsung bisa dipakai pada input form.`
      autoFillPrompt += '\nFokus utama: isi section target saat ini terlebih dahulu. Section lain hanya sebagai konteks agar tetap konsisten.'
      autoFillPrompt += `\nJangan berikan penjelasan, jangan gunakan format instruksi, jangan gunakan daftar poin, jangan pakai heading seperti "Kegiatan Hari 1:", dan jangan sertakan nama field atau prefix seperti "${fieldId}:".`

      autoFillPrompt += '\nKeluarkan tepat satu konten final untuk satu field ini saja.'

      const response = await fetch(window.__APP__.APP_API_BASE_URL + '/autofill-ai', { // eslint-disable-line no-undef
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: autoFillPrompt,
          field: fieldId
        })
      })

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`)
      }

      const data = await response.json()

      // Update input with a cleaned single-field result.
      inputEl.value = sanitizeAiResult(data.data, fieldId)
    } catch (error) {
      console.error('Error fetching AI recommendation:', error)
    }
  }

  // Otherwise, user want optimize existing content
  try {
    const response = await fetch(window.__APP__.APP_API_BASE_URL + '/autofill-ai', { // eslint-disable-line no-undef
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: prompt + '\n' + inputEl.value,
        field: fieldId
      })
    })

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`)
    }

    const data = await response.json()
    inputEl.value = sanitizeAiResult(data.data, fieldId)
  } catch (error) {
    console.error('Error fetching AI recommendation:', error)
    SwalValidationWrapper.autoNextFocus(false).showValidationToast({ // eslint-disable-line no-undef
      title: "<span class='text-red-500'>Error fetching AI recommendation</span>",
      html: 'Terjadi kesalahan saat mengambil rekomendasi AI. Silakan coba lagi nanti.'
    })
  }
})
