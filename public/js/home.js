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
const OPTIONAL_KEYS = ['namaSekolah', 'namaPenyusun', 'nip', 'jumlahAnak']
const REQUIRED_KEYS = FILTER_KEYS.filter((key) => !OPTIONAL_KEYS.includes(key))

const requiredEl = []
REQUIRED_KEYS.forEach((key) => {
  const el = document.getElementById(key)
  if (el) {
    requiredEl.push(el)
  } else {
    console.warn(`Element with id "${key}" not found in the DOM.`)
  }
})

const isRequiredFilled = () => {
  return requiredEl.every((el) => el.value.trim() !== '')
}

const getUnfilledRequiredFields = () => {
  return requiredEl
    .filter((el) => el.value.trim() === '')
    .map((el) => el.id)
}

const alokasiWaktu1 = document.getElementById('alokasiWaktu1')
const alokasiWaktu2 = document.getElementById('alokasiWaktu2')
const alokasiWaktu = document.getElementById('alokasiWaktu')
const modelPembelajaran = document.getElementById('modelPembelajaran')
const modelPembelajaranOptions = document.querySelectorAll(
  '.model-pembelajaran-option'
)
const elemenCp = document.getElementById('elemenCp')
const elemenCpOptions = document.querySelectorAll('.elemen-cp-option')
const dimensiProfilLulusan = document.getElementById('dimensiProfilLulusan')
const dplOptions = document.querySelectorAll('.dpl-option')
const kegiatanDynamicContainer = document.getElementById(
  'kegiatanDynamicContainer'
)
const kegiatanAiButtonTemplate = document.getElementById(
  'kegiatanAiButtonTemplate'
)
const form = document.getElementById('rppForm')
const submitButton = document.getElementById('rppFormSubmitBtn')

// State variables
let isGeneratingDocx = false

const savedKegiatanValues = {}

const createAiButton = (dayIndex, jpIndex) => {
  const fallbackButton = document.createElement('button')
  fallbackButton.type = 'button'
  fallbackButton.className = 'bg-transparent border-0 p-0 m-0 cursor-pointer'
  fallbackButton.title = `AI: Sempurnakan kegiatan hari ${dayIndex} JP ${jpIndex}`
  fallbackButton.id = `kegiatanHari${dayIndex}Jp${jpIndex}Ai`
  fallbackButton.dataset.aiPrompt = `Sempurnakan kegiatan hari ${dayIndex} JP ${jpIndex} dengan memberikan rekomendasi yang lebih baik berdasarkan konteks kegiatan yang sudah diisi. Pastikan rekomendasi tersebut jelas, mudah dipahami, dan dapat langsung diterapkan untuk meningkatkan kualitas kegiatan pembelajaran.`

  if (!kegiatanAiButtonTemplate) {
    fallbackButton.textContent = 'AI'
    return fallbackButton
  }

  const aiButton =
      kegiatanAiButtonTemplate.content.firstElementChild.cloneNode(true)
  aiButton.id = `ai.kegiatanHari${dayIndex}Jp${jpIndex}`
  aiButton.title = `AI: Sempurnakan kegiatan hari ${dayIndex} JP ${jpIndex}`
  aiButton.dataset.aiPrompt = `Sempurnakan kegiatan hari ${dayIndex} JP ${jpIndex} dengan memberikan rekomendasi yang lebih baik berdasarkan konteks kegiatan yang sudah diisi. Pastikan rekomendasi tersebut jelas, mudah dipahami, dan dapat langsung diterapkan untuk meningkatkan kualitas kegiatan pembelajaran.`

  const aiLabel = aiButton.querySelector('.sr-only')
  if (aiLabel) {
    aiLabel.textContent = `AI: Sempurnakan kegiatan hari ${dayIndex} JP ${jpIndex}`
  }

  return aiButton
}

const createKegiatanInput = (dayIndex, jpIndex, existingValue = '') => {
  const inputWrapper = document.createElement('div')
  inputWrapper.className =
      'relative flex items-center rounded-md border-2 border-violet-800/30 transition-all focus-within:border-violet-800 focus-within:ring-2 focus-within:ring-violet-800/40'

  const input = document.createElement('input')
  input.type = 'text'
  input.name = `kegiatanHari${dayIndex}Jp${jpIndex}`
  input.id = `kegiatanHari${dayIndex}Jp${jpIndex}`
  input.value = existingValue
  input.className =
      'w-full border-none bg-transparent p-2.5 text-gray-700 placeholder:text-gray-400 focus:ring-0 focus:outline-none'
  input.placeholder = `Kegiatan hari ${dayIndex} - JP ${jpIndex}`
  input.required = true

  input.addEventListener('input', (e) => {
    savedKegiatanValues[e.target.id] = e.target.value
  })

  const aiWrapper = document.createElement('div')
  aiWrapper.className = 'flex items-center pr-3'
  aiWrapper.appendChild(createAiButton(dayIndex, jpIndex))

  inputWrapper.appendChild(input)
  inputWrapper.appendChild(aiWrapper)

  return inputWrapper
}

const renderKegiatanFields = () => {
  if (!kegiatanDynamicContainer) return

  const existingInputs =
      kegiatanDynamicContainer.querySelectorAll('input[type="text"]')
  existingInputs.forEach((input) => {
    savedKegiatanValues[input.id] = input.value
  })

  const totalDays = Number.parseInt(alokasiWaktu1?.value, 10)
  const totalJp = Number.parseInt(alokasiWaktu2?.value, 10)

  kegiatanDynamicContainer.innerHTML = ''

  if (
    !Number.isFinite(totalDays) ||
      totalDays <= 0 ||
      !Number.isFinite(totalJp) ||
      totalJp <= 0
  ) {
    const emptyHint = document.createElement('p')
    emptyHint.className = 'text-sm text-gray-500'
    emptyHint.textContent =
        'Isi Hari dan JP pada Alokasi Waktu untuk membuat kolom kegiatan otomatis.'
    kegiatanDynamicContainer.appendChild(emptyHint)
    return
  }

  for (let dayIndex = 1; dayIndex <= totalDays; dayIndex += 1) {
    const dayBlock = document.createElement('div')
    dayBlock.className = 'rounded-md border-2 border-violet-800/20 p-3'

    const heading = document.createElement('h3')
    heading.className = 'font-semibold text-violet-800'
    heading.textContent = `Hari ${dayIndex}`

    const helper = document.createElement('small')
    helper.className = 'block text-sm text-gray-500 mt-1'
    helper.textContent = `Isi ${totalJp} kegiatan untuk hari ke-${dayIndex}.`

    const dayGrid = document.createElement('div')
    dayGrid.className = 'mt-3 grid grid-cols-1 gap-2'

    for (let jpIndex = 1; jpIndex <= totalJp; jpIndex += 1) {
      const inputId = `kegiatanHari${dayIndex}Jp${jpIndex}`
      const existingValue = savedKegiatanValues[inputId] || ''
      dayGrid.appendChild(
        createKegiatanInput(dayIndex, jpIndex, existingValue)
      )
    }

    dayBlock.appendChild(heading)
    dayBlock.appendChild(helper)
    dayBlock.appendChild(dayGrid)
    kegiatanDynamicContainer.appendChild(dayBlock)
  }
}

const handleAlokasiWaktuChange = () => {
  if (alokasiWaktu1?.value && alokasiWaktu2?.value) {
    alokasiWaktu.value = `${alokasiWaktu1.value} x ${alokasiWaktu2.value} JP`
  } else {
    alokasiWaktu.value = ''
  }

  renderKegiatanFields()
}

const handleModelPembelajaranChange = () => {
  if (!modelPembelajaran) return

  const selectedModelPembelajaran = Array.from(modelPembelajaranOptions)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value)
    .filter(Boolean)

  modelPembelajaran.value = selectedModelPembelajaran.join(', ')
}

const handleElemenCpChange = () => {
  if (!elemenCp) return

  const selectedElemenCp = Array.from(elemenCpOptions)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value)
    .filter(Boolean)

  elemenCp.value = selectedElemenCp.join(', ')
}

const handleDplChange = () => {
  if (!dimensiProfilLulusan) return

  const selectedDpl = Array.from(dplOptions).map(
    (checkbox) => checkbox.value + (checkbox.checked ? ': true' : ': false')
  )

  dimensiProfilLulusan.value = selectedDpl.join(',')
}

modelPembelajaranOptions.forEach((checkbox) => {
  checkbox.addEventListener('change', handleModelPembelajaranChange)
})

elemenCpOptions.forEach((checkbox) => {
  checkbox.addEventListener('change', handleElemenCpChange)
})

dplOptions.forEach((checkbox) => {
  checkbox.addEventListener('change', handleDplChange)
})

alokasiWaktu1?.addEventListener('input', handleAlokasiWaktuChange)
alokasiWaktu2?.addEventListener('input', handleAlokasiWaktuChange)

window.handleAlokasiWaktuChange = handleAlokasiWaktuChange

handleAlokasiWaktuChange()
handleModelPembelajaranChange()
handleElemenCpChange()
handleDplChange()

// Event handler
form.addEventListener('submit', (e) => {
  e.preventDefault()

  console.log('Submit button clicked')
  if (isGeneratingDocx) {
    return
  }

  if (!isRequiredFilled()) {
    const unfilledFields = getUnfilledRequiredFields()
    const generateLinks = (unfilledFields_) => {
      return '<span>Perbaiki ' + unfilledFields_.map((fieldId) => `<a id="fix.${fieldId}" href="#${fieldId}Wrapper"><span class="text-blue-500">${fieldId}</span></a>`).join(', ') + '</span>'
    }

    SwalValidationWrapper.autoNextFocus(true).showValidationToast({ // eslint-disable-line no-undef
      title: "<span class='text-red-500'>Form belum lengkap</span>",
      html: generateLinks(unfilledFields),
      unfilledFields,
      getLinkElement: (fieldId) => document.getElementById(`fix.${fieldId}`),
      isFieldFilled: (fieldId) => {
        const el = document.getElementById(fieldId)
        return el && el.value.trim() !== ''
      }
    })

    return
  }

  isGeneratingDocx = true

  const formData = new FormData(form)

  submitButton.disabled = true
  submitButton.textContent = 'Generating...'
  submitButton.classList.add('cursor-not-allowed', 'opacity-50')

  const loadingIndicator = loadingIndicatorInit() // eslint-disable-line no-undef

  SwalValidationWrapper.fire({ // eslint-disable-line no-undef
    icon: 'warning',
    title: 'Sedang membuat dokumen...',
    text: 'Jangan meninggalkan, menutup, merefresh, maupun membuka aplikasi lain selama proses pembuatan berlangsung untuk menghindari kegagalan pembuatan dokumen.',
    footer: loadingIndicator.show().innerHTML,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      loadingIndicator.startAnimation()
    }
  })

  fetch(window.__APP__.APP_API_BASE_URL + '/generate-docx', { // eslint-disable-line no-undef
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(Object.fromEntries(formData.entries()))
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`)
      }

      isGeneratingDocx = false

      loadingIndicator.stopAnimation()
      loadingIndicator.changeLoadingMessage({
        message: 'Dokumen selesai dibuat, terima kasih sudah menunggu!',
        class: 'text-green-600',
        delay: 3000
      })

      submitButton.disabled = false
      submitButton.textContent = 'Buat Dokumen'
      submitButton.classList.remove('cursor-not-allowed', 'opacity-50')

      // Close the Swal alert if it's still open
      if (SwalValidationWrapper.isVisible()) { // eslint-disable-line no-undef
        setTimeout(() => {
          SwalValidationWrapper.closeSwal() // eslint-disable-line no-undef
        }, 3000)
      }

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'Modul_Ajar.docx'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      return response.blob().then((blob) => ({ blob, filename }))
    })
    .then(({ blob, filename }) => {
      // Auto-download the document
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
    .catch((error) => {
      console.error('Error during document generation:', error)
      SwalValidationWrapper.fire({ // eslint-disable-line no-undef
        icon: 'error',
        title: 'Gagal membuat dokumen',
        text: 'Terjadi kesalahan saat membuat dokumen. Silakan coba lagi nanti.'
      })
    })
})
