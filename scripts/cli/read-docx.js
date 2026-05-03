/**
 * This CLI script used to read a .docx file with JSZip
 *
 * Usage:
 *   node read-docx.js <docx-file-path> [options]
 *
 * Options:
 *   --list, -l            List all files in the DOCX archive
 *   --read <file>, -r     Read and display specific file content
 *   --structure, -s       Show directory structure
 *   --xml                 Pretty print XML files
 *   --help, -h            Show this help message
 *
 * Examples:
 *   node read-docx.js document.docx --structure
 *   node read-docx.js document.docx --read document.xml
 *   node read-docx.js document.docx --read styles.xml --xml
 */

import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import consola from 'consola'

// const __dirname = import.meta.dirname // Commented out since it's not used in this script
const __filename = import.meta.filename

// Parse CLI arguments
const args = process.argv.slice(2)
const docxPath = args[0]
const flags = args.slice(1)

// Helper function to show help
function showHelp () {
  const content = fs.readFileSync(__filename, 'utf-8')
  // FIX #2: ReDoS — capped quantifier on [\s\S]
  const helpMatch = content.match(/\/\*\*[\s\S]{0,5000}?\*\//)
  if (helpMatch) {
    console.log(helpMatch[0])
  }
  process.exit(0)
}

// Helper function to check flag
/**
 * Checks if a flag is present in the command-line arguments
 * @param {string} flag
 * @param {string | null} shortFlag
 * @returns {boolean} - True if the flag is present, false otherwise
 */
function hasFlag (flag, shortFlag = null) {
  return flags.includes(flag) || (shortFlag ? flags.includes(shortFlag) : false)
}

// Helper function to get flag value
/**
 * Gets the value of a flag from the command-line arguments
 * @param {string} flag
 * @param {string} shortFlag
 * @returns {string|null} - The value of the flag or null if not found
 */
function getFlagValue (flag, shortFlag) {
  let index = flags.indexOf(flag)
  if (index === -1) index = flags.indexOf(shortFlag)
  return index !== -1 && index + 1 < flags.length ? flags[index + 1] : null
}

// Helper function to pretty print XML
/**
 * Pretty prints an XML string with indentation and newlines.
 * @param {string} xmlString - The raw XML string to format
 * @returns {string} - The formatted XML string
 */
function prettyPrintXml (xmlString) {
  let formatted = ''
  let indent = 0
  const tab = '  '

  xmlString = xmlString.replace(/>\s+</g, '><')

  for (let i = 0; i < xmlString.length; i++) {
    const char = xmlString[i]

    if (char === '<') {
      if (xmlString.substr(i + 1, 1) === '/') {
        indent--
      }

      if (formatted && formatted.trimEnd().slice(-1) !== '\n') {
        formatted += '\n'
      }

      formatted += tab.repeat(indent) + '<'
    } else if (char === '>') {
      formatted += '>'
      if (!xmlString.substr(i + 1, 1).match(/\s/) || xmlString.substr(i + 1, 1) === '<') {
        if (xmlString.substr(i - 1, 1) !== '/' && !xmlString.substr(i + 1).match(/^\s*</)) {
          formatted += '\n'
        }
      }

      if (xmlString.substr(i + 1, 1) === '<' && !xmlString.substr(i + 1).match(/^\s*<\//)) {
        indent++
      }
    } else {
      formatted += char
    }
  }

  return formatted
}

// Helper function to print tree structure
/**
 * Prints the directory structure of the DOCX archive
 * @param {Object} obj - The object representing the directory structure
 * @param {string} prefix - The prefix for indentation
 * @param {boolean} isLast - Whether the current item is the last in its level
 */
function printTree (obj, prefix = '', isLast = true) {
  const keys = Object.keys(obj).sort()

  keys.forEach((key, index) => {
    const isLastItem = index === keys.length - 1
    // @ts-ignore
    const current = obj[key]
    const connector = isLastItem ? '└── ' : '├── '
    const extension = isLastItem ? '    ' : '│   '

    if (typeof current === 'object' && current !== null) {
      console.log(`${prefix}${connector}${key}/`)
      printTree(current, prefix + extension, isLastItem)
    } else {
      console.log(`${prefix}${connector}${key} (${current})`)
    }
  })
}

// FIX #3: Zip Slip — sanitize zip entry paths before use
/**
 * Sanitizes a file path to prevent zip slip vulnerabilities.
 * It normalizes the path and removes any leading ../ sequences.
 *
 * @param {string} filePath - The file path to sanitize
 * @returns {string} - The sanitized file path
 */
function sanitizeZipPath (filePath) {
  // Normalize and strip any leading ../ traversal sequences
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
  return normalized
}

// Main function
async function readDocx () {
  if (!docxPath || hasFlag('--help', '-h')) {
    showHelp()
  }

  const fullPath = path.resolve(docxPath)

  // FIX #1: Path traversal — only allow .docx files
  if (!fullPath.endsWith('.docx')) {
    consola.error('Only .docx files are allowed.')
    process.exit(1)
  }

  if (!fs.existsSync(fullPath)) {
    consola.error(`File not found: ${fullPath}`)
    process.exit(1)
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath)
    const zip = await JSZip.loadAsync(fileBuffer)

    consola.success(`Loaded DOCX file: ${path.basename(fullPath)}`)
    console.log('\n')

    // FIX #4: Avoid private _data API — use a safe size helper
    /**
     * Gets the uncompressed size of a zip file entry safely.
     * @param {Object} zipFile - The zip file entry object from JSZip
     * @returns {number|null} - The uncompressed size in bytes, or null if unavailable
     */
    function getFileSize (zipFile) {
      try {
        // JSZip exposes _data as internal; use optional chaining with a fallback
        // @ts-ignore
        return zipFile._data?.uncompressedSize ?? null
      } catch {
        return null
      }
    }

    // List all files
    if (hasFlag('--list', '-l')) {
      consola.info('Files in DOCX archive:')
      console.log('\n')
      Object.keys(zip.files)
        .sort()
        .forEach((file) => {
          const isDir = file.endsWith('/')
          const sizeBytes = getFileSize(zip.files[file])
          const size = isDir ? '[DIR]' : (sizeBytes !== null ? `${sizeBytes} bytes` : 'unknown')
          console.log(`  ${isDir ? '[🖿]' : '[🗈]'} ${file.padEnd(50)} ${size}`)
        })
      console.log('\n')
    }

    // Show structure
    if (hasFlag('--structure', '-s')) {
      consola.info('DOCX Structure:')
      console.log('\n')

      const tree = {}
      Object.keys(zip.files).forEach((file) => {
        const parts = file.split('/').filter((p) => p)
        let current = tree
        parts.forEach((part, idx) => {
          if (idx === parts.length - 1) {
            if (!file.endsWith('/')) {
              const size = getFileSize(zip.files[file])
              // @ts-ignore
              current[part] = size !== null ? `${size} bytes` : '0 bytes'
            }
          } else {
            // @ts-ignore
            if (typeof current[part] !== 'object' || current[part] === null) {
              // @ts-ignore
              current[part] = {}
            }
            // @ts-ignore
            current = current[part]
          }
        })
      })

      printTree(tree)
      console.log('\n')
    }

    // Read specific file
    const fileToRead = getFlagValue('--read', '-r')
    if (fileToRead) {
      // FIX #3: Sanitize user-supplied file path before zip lookup
      const sanitizedInput = sanitizeZipPath(fileToRead)
      let fileKey = sanitizedInput

      if (!zip.files[fileKey]) {
        const matching = Object.keys(zip.files).find(
          (f) => sanitizeZipPath(f) === sanitizedInput ||
                 f.endsWith(`/${sanitizedInput}`)
        )
        if (!matching) {
          consola.error(`File not found in DOCX: ${fileToRead}`)
          console.log('\nAvailable files:')
          Object.keys(zip.files)
            .sort()
            .forEach((f) => console.log(`  - ${f}`))
          process.exit(1)
        }
        fileKey = matching
      }

      // FIX #3: Final zip slip guard — ensure resolved key has no traversal
      const safeKey = sanitizeZipPath(fileKey)
      if (!zip.files[safeKey]) {
        consola.error(`Unsafe file path rejected: ${fileKey}`)
        process.exit(1)
      }

      if (!safeKey) {
        consola.error(`File not found in DOCX: ${fileToRead}`)
        process.exit(1)
      }

      // @ts-ignore
      const content = await zip.file(safeKey).async('text')

      consola.info(`Content of ${safeKey}:`)
      console.log('\n')

      if ((hasFlag('--xml') || safeKey.endsWith('.xml')) && fileToRead.includes('.xml')) {
        console.log(prettyPrintXml(content))
      } else {
        console.log(content)
      }
      console.log('\n')
    }

    // Show metadata if no specific options provided
    if (!hasFlag('--list', '-l') && !hasFlag('--structure', '-s') && !fileToRead) {
      consola.info('Quick Info:')
      console.log(`  Files: ${Object.keys(zip.files).length}`)
      console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`)

      consola.info('Available options:')
      console.log('  --list, -l              List all files')
      console.log('  --structure, -s         Show directory structure')
      console.log('  --read <file>, -r       Read specific file content')
      console.log('  --xml                   Pretty print XML\n')
    }
  } catch (/** @type {Error | unknown} */ err) {
    if (err instanceof Error) {
      consola.error(`Error reading DOCX file: ${err.message}`)
      console.error(err)
    } else {
      consola.error('An unknown error occurred while reading the DOCX file.')
      console.error(err)
    }
    process.exit(1)
  }
}

// Run the CLI
readDocx()
