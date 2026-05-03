import fs from 'fs'
import path from 'path'
import VMRunner from '@repo/core/engine/vm-runner'
import { removeImportRequire, convertNumToRoman } from '@repo/utils/utils.js'

import * as docx from 'docx'
import * as docxConfig from '../packages/scripts/docx/docx-config.js'
import * as docxApi from '../packages/scripts/docx/docx-api.js'
import * as docxCoverPage from '../packages/scripts/docx/docx-cover-page.js'

const __dirname = import.meta.dirname

test('Generate DOX with original template', (done) => {
  const examplePredefinedCode = fs.readFileSync(path.join(__dirname, '../packages/scripts/docx/docx-example-predefined-var.js'), 'utf-8')
  const mainCode = removeImportRequire(fs.readFileSync(path.join(__dirname, '../packages/scripts/docx/template/original/docx-main.js'), 'utf-8'))

  const credentialVars = {
    namaSekolah: 'TK Negeri Pembina Bangsa',
    namaPenyusun: 'Zert S.Pd.',
    nip: '198001012010121001',
    temaSubtema: 'Identitas / Diriku (Aku Istimewa; Ayo Kita Berkenalan)',
    fase: 'Fondasi',
    kelas: 'Kelompok A (2-3 tahun)',
    semester: 1,
    mingguKe: 1,
    bulan: 'Januari',
    alokasiWaktu: '5 x 3 JP',
    modelPembelajaran: 'Kolabortif, Eksperimental',
    jumlahAnak: 10
  }

  const code = `${examplePredefinedCode};\n${mainCode};\nreturn (await main(credentialVars))`

  const runner = new VMRunner(
    code,
    {},
    (err, result) => {
      expect(err).toBeNull()
      expect(result).toBeInstanceOf(Buffer)
      done()
    }
  )

  runner.addContext(
    docx,
    docxConfig,
    docxApi,
    docxCoverPage,
    { credentialVars },
    { convertNumToRoman }
  )

  runner.run()
}, 10000)
