/**
 * @fileoverview
 * This file contains utility API functions for working with the docx library to create and manipulate Word documents.
 * Why should use this API instead of directly using docx? This API provides higher-level abstractions for common document structures like headings with children, bullet points with labels, and intelligent content parsing that supports HTML tags and markdown lists. It also includes internal utilities for handling XML components related to paragraph and table indentation, which are necessary for maintaining proper formatting when creating complex documents. By using this API, you can simplify the process of generating Word documents with consistent styling and structure, while still leveraging the powerful features of the underlying docx library.
 */

import {
  Document,
  DocumentDefaults,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  TableLayoutType,
  TextRun,
  LevelFormat,
  LevelSuffix,
  createIndent,
  createTableWidthElement
} from 'docx'
import { spacing, paragraphStyles } from './docx-config.js'

/** @type {string} - Key for indenting child paragraphs */
const CHILD_PARAGRAPH_INDENT_KEY = '__headingChildrenIndent'
/** @type {string} - Key for indenting child tables */
const CHILD_TABLE_INDENT_KEY = '__headingChildrenTableIndent'

// Helper function

/**
 * Checks if an XML component has a specific child key in its root array.
 *
 * @param {Object} xmlComponent - The XML component to check.
 * @param {string} rootKey - The key to look for.
 * @returns {boolean} True if the child exists, false otherwise.
 */
const hasXmlChild = (xmlComponent, rootKey) => Boolean(
  xmlComponent &&
  Array.isArray(xmlComponent.root) &&
  xmlComponent.root.some((item) => item && item.rootKey === rootKey)
)

/**
 * Finds the index of a specific child key in an XML component's root array.
 *
 * @param {Object} xmlComponent - The XML component to search.
 * @param {string} rootKey - The key to look for.
 * @returns {number} The index of the child, or -1 if not found.
 */
const getXmlChildIndex = (xmlComponent, rootKey) => {
  if (!xmlComponent || !Array.isArray(xmlComponent.root)) return -1

  return xmlComponent.root.findIndex((item) => item && item.rootKey === rootKey)
}

/**
 * Extracts the value of an XML attribute from a component.
 *
 * @param {Object} xmlComponent - The XML component to inspect.
 * @param {string} [attributeName='val'] - The name of the attribute.
 * @returns {string|number|null} The attribute value, or null if not found.
 */
const getXmlAttributeValue = (xmlComponent, attributeName = 'val') => {
  if (!xmlComponent || !Array.isArray(xmlComponent.root)) return null
  const attrNode = xmlComponent.root.find((item) => item && item.rootKey === '_attr')
  if (!attrNode || !attrNode.root) return null
  const rawValue = attrNode.root[attributeName]
  if (rawValue === null || rawValue === undefined) return null
  if (typeof rawValue === 'string' || typeof rawValue === 'number') return rawValue
  if (typeof rawValue === 'object' && rawValue !== null && Object.prototype.hasOwnProperty.call(rawValue, 'value')) {
    return rawValue.value
  }
  return null
}

/**
 * Retrieves the style ID from paragraph properties.
 *
 * @param {Object} paragraphProperties - The paragraph properties component.
 * @returns {string|null} The style ID, or null if not found.
 */
const getParagraphStyleId = (paragraphProperties) => {
  const styleIndex = getXmlChildIndex(paragraphProperties, 'w:pStyle')
  if (styleIndex < 0) return null
  return getXmlAttributeValue(paragraphProperties.root[styleIndex], 'val')
}

/**
 * Retrieves the numbering level (ilvl) from paragraph properties.
 *
 * @param {Object} paragraphProperties - The paragraph properties component.
 * @returns {number} The numbering level, defaulting to 0.
 */
const getParagraphNumberingLevel = (paragraphProperties) => {
  const numberingIndex = getXmlChildIndex(paragraphProperties, 'w:numPr')
  if (numberingIndex < 0) return null
  const numberingNode = paragraphProperties.root[numberingIndex]
  if (!numberingNode || !Array.isArray(numberingNode.root)) return 0
  const levelNode = numberingNode.root.find((item) => item && item.rootKey === 'w:ilvl')
  if (!levelNode) return 0
  const levelValue = getXmlAttributeValue(levelNode, 'val')
  const parsedLevel = Number.parseInt(String(levelValue), 10)
  return Number.isNaN(parsedLevel) ? 0 : parsedLevel
}

/**
 * Sets or overrides the left indent size on paragraph properties.
 *
 * @param {Object} paragraphProperties - The paragraph properties component.
 * @param {number} indentSize - The indent size in twips.
 */
const setParagraphIndent = (paragraphProperties, indentSize) => {
  const indentElement = createIndent({ left: indentSize, hanging: 0 })
  const indentIndex = getXmlChildIndex(paragraphProperties, 'w:ind')
  if (indentIndex >= 0) {
    paragraphProperties.root[indentIndex] = indentElement
    return
  }
  paragraphProperties.push(indentElement)
}

/**
 * Sets or overrides the table indent width element.
 *
 * @param {Object} tableProperties - The table properties component.
 * @param {number} indentSize - The indent size in twips.
 */
const setTableIndent = (tableProperties, indentSize) => {
  const indentElement = createTableWidthElement('w:tblInd', {
    size: indentSize,
    type: WidthType.DXA
  })
  const indentIndex = getXmlChildIndex(tableProperties, 'w:tblInd')
  if (indentIndex >= 0) {
    tableProperties.root[indentIndex] = indentElement
    return
  }
  tableProperties.root.push(indentElement)
}

/**
 * Calculates the initial paragraph indent, accounting for list hierarchy.
 *
 * @param {Object} paragraphProperties - The paragraph properties component.
 * @param {number} indentSize - The base indent size in twips.
 * @returns {number} The calculated indent size.
 */
const getInitialParagraphIndent = (paragraphProperties, indentSize) => {
  const paragraphStyle = getParagraphStyleId(paragraphProperties)
  const numberingLevel = getParagraphNumberingLevel(paragraphProperties)
  // Preserve nested list hierarchy when heading-child indent is injected
  if (paragraphStyle === 'ListParagraph' && typeof numberingLevel === 'number' && numberingLevel > 0) {
    return indentSize + (indentSize * numberingLevel)
  }
  return indentSize
}

/**
 * Safely applies cumulative left indentation to a Paragraph.
 *
 * @param {Paragraph} paragraph - The paragraph object to indent.
 * @param {number} indentSize - The indent size in twips.
 * @returns {Paragraph} The updated paragraph.
 */
const applyIndentToParagraph = (paragraph, indentSize) => {
  const paragraphProperties = paragraph && paragraph.properties
  const trackedIndent = paragraph && paragraph[CHILD_PARAGRAPH_INDENT_KEY]

  if (
    !paragraphProperties ||
    typeof paragraphProperties.push !== 'function' ||
    !Array.isArray(paragraphProperties.root)
  ) {
    return paragraph
  }

  const initialIndent = getInitialParagraphIndent(paragraphProperties, indentSize)

  if (typeof trackedIndent === 'number' && Number.isFinite(trackedIndent)) {
    const nextIndent = trackedIndent + indentSize
    setParagraphIndent(paragraphProperties, nextIndent)
    paragraph[CHILD_PARAGRAPH_INDENT_KEY] = nextIndent
    return paragraph
  }

  if (hasXmlChild(paragraphProperties, 'w:ind')) return paragraph

  setParagraphIndent(paragraphProperties, initialIndent)
  paragraph[CHILD_PARAGRAPH_INDENT_KEY] = initialIndent
  return paragraph
}

/**
 * Safely applies cumulative left indentation to a Table.
 *
 * @param {Table} table - The table object to indent.
 * @param {number} indentSize - The indent size in twips.
 * @returns {Table} The updated table.
 */
const applyIndentToTable = (table, indentSize) => {
  const trackedIndent = table && table[CHILD_TABLE_INDENT_KEY]

  if (!table || !Array.isArray(table.root) || table.root.length === 0) return table

  const tableProperties = table.root[0]
  if (!tableProperties || !Array.isArray(tableProperties.root)) return table

  if (typeof trackedIndent === 'number' && Number.isFinite(trackedIndent)) {
    const nextIndent = trackedIndent + indentSize
    setTableIndent(tableProperties, nextIndent)
    table[CHILD_TABLE_INDENT_KEY] = nextIndent
    return table
  }

  if (hasXmlChild(tableProperties, 'w:tblInd')) return table

  setTableIndent(tableProperties, indentSize)
  table[CHILD_TABLE_INDENT_KEY] = indentSize
  return table
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: HTML / Markdown parsers
// ─────────────────────────────────────────────────────────────────────────────

let htmlOrderedListInstanceCounter = 1

/**
 * Returns the next unique instance ID for HTML ordered lists.
 *
 * @returns {number} The next instance ID.
 */
const getNextHtmlOrderedListInstance = () => {
  const nextInstance = htmlOrderedListInstanceCounter
  htmlOrderedListInstanceCounter += 1
  return nextInstance
}

/**
 * Creates an array of TextRuns, splitting the text by newline.
 *
 * @param {string} text - The input text.
 * @param {Object} [formatting={}] - Formatting options to apply to each TextRun.
 * @returns {TextRun[]} The created text runs.
 */
const createTextRuns = (text, formatting = {}) => {
  const lines = String(text ?? '').split('\n')

  return lines.flatMap((line, index) => {
    const run = new TextRun({ ...formatting, text: line })
    if (index >= lines.length - 1) return [run]
    return [run, new TextRun({ break: 1 })]
  })
}

/**
 * Parse inline HTML tags (<b>, <i>, <u>, <s>) into TextRun[].
 * Supports nesting (e.g. <b><i>text</i></b>).
 *
 * @param {string} text
 * @returns {TextRun[]}
 */
const parseHtmlTags = (text) => {
  if (!text || typeof text !== 'string') return [new TextRun({ text: '' })]
  if (!text.includes('<')) return createTextRuns(text)

  const parseToObjects = (str) => {
    if (!str || !str.includes('<')) {
      return [{ text: str || '', bold: false, italic: false, underline: false, strike: false }]
    }

    const result = []
    let remaining = str

    while (remaining) {
      const nextTag = remaining.indexOf('<')
      if (nextTag === -1) {
        if (remaining) result.push({ text: remaining, bold: false, italic: false, underline: false, strike: false })
        break
      }
      if (nextTag > 0) {
        result.push({ text: remaining.slice(0, nextTag), bold: false, italic: false, underline: false, strike: false })
      }
      const tagMatch = remaining.slice(nextTag).match(/^<(b|i|u|s)>(.*?)<\/\1>/s)
      if (tagMatch) {
        const [fullMatch, tag, content] = tagMatch
        const formatKey = { b: 'bold', i: 'italic', u: 'underline', s: 'strike' }[tag]
        parseToObjects(content).forEach((seg) => {
          result.push({
            text: seg.text,
            bold: seg.bold || (formatKey === 'bold'),
            italic: seg.italic || (formatKey === 'italic'),
            underline: seg.underline || (formatKey === 'underline'),
            strike: seg.strike || (formatKey === 'strike')
          })
        })
        remaining = remaining.slice(nextTag + fullMatch.length)
      } else {
        result.push({ text: '<', bold: false, italic: false, underline: false, strike: false })
        remaining = remaining.slice(nextTag + 1)
      }
    }

    return result
  }

  return parseToObjects(text).flatMap((obj) => {
    const props = {}
    if (obj.bold) props.bold = true
    if (obj.italic) props.italics = true
    if (obj.underline) props.underline = {}
    if (obj.strike) props.strike = true
    return createTextRuns(obj.text, props)
  })
}

/**
 * Detect and parse HTML lists (<ul>, <ol>, <li>) or markdown "- item" lists.
 * Returns Paragraph[] or null if no lists found.
 *
 * @param {string} text
 * @returns {Paragraph[]|null}
 */
const parseHtmlLists = (text) => {
  if (!text || typeof text !== 'string') return null

  if (/<\/?(ul|ol|li)\b/i.test(text)) return parseHtmlListTags(text)

  const lines = text.split('\n')
  if (lines.some(line => /^\s*-\s+/.test(line))) return parseMarkdownLists(lines)

  return null
}

/**
 * Parse HTML <ul>/<ol>/<li> tags into Paragraph[].
 * Supports nested lists with cumulative level tracking.
 * Ordered lists use the `html-ordered-list` numbering reference.
 *
 * @param {string} text
 * @returns {Paragraph[]|null}
 */
const parseHtmlListTags = (text) => {
  const paragraphs = []
  const rootNode = { type: 'root', children: [] }
  const nodeStack = [rootNode]
  const tagRegex = /<\/?(ul|ol|li)\b[^>]*>/gi
  let lastIndex = 0

  const currentNode = () => nodeStack[nodeStack.length - 1]

  const attachNode = (node) => {
    const activeNode = currentNode()
    if (!activeNode) return
    if (activeNode.type === 'item') { activeNode.parts.push(node); return }
    if (activeNode.type === 'root') { activeNode.children.push(node); return }
    if (activeNode.type === 'list') rootNode.children.push(node)
  }

  const appendText = (rawText) => {
    if (!rawText || !rawText.trim()) return
    attachNode({ type: 'text', text: rawText.trim() })
  }

  const closeNode = (type, listType = null) => {
    while (nodeStack.length > 1) {
      const popped = nodeStack.pop()
      if (popped.type !== type) continue
      if (type !== 'list' || popped.listType === listType) break
    }
  }

  let tagMatch
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    appendText(text.slice(lastIndex, tagMatch.index))

    const token = tagMatch[0]
    const tag = tagMatch[1].toLowerCase()
    const isClosingTag = token.startsWith('</')

    if (!isClosingTag && (tag === 'ul' || tag === 'ol')) {
      const listNode = { type: 'list', listType: tag, items: [] }
      attachNode(listNode)
      nodeStack.push(listNode)
    } else if (isClosingTag && (tag === 'ul' || tag === 'ol')) {
      closeNode('list', tag)
    } else if (!isClosingTag && tag === 'li') {
      let activeList = null
      for (let i = nodeStack.length - 1; i >= 0; i--) {
        if (nodeStack[i].type === 'list') { activeList = nodeStack[i]; break }
      }
      if (!activeList) {
        activeList = { type: 'list', listType: 'ul', items: [] }
        attachNode(activeList)
        nodeStack.push(activeList)
      }
      const itemNode = { type: 'item', parts: [] }
      activeList.items.push(itemNode)
      nodeStack.push(itemNode)
    } else if (isClosingTag && tag === 'li') {
      closeNode('item')
    }

    lastIndex = tagRegex.lastIndex
  }

  appendText(text.slice(lastIndex))

  const pushTextParagraph = (value) => {
    if (!value || !value.trim()) return
    paragraphs.push(new Paragraph({ children: parseHtmlTags(value.trim()) }))
  }

  const pushListParagraph = (listType, level, instance, value) => {
    if (!value || !value.trim()) return
    const children = parseHtmlTags(value.trim())
    if (listType === 'ul') {
      paragraphs.push(new Paragraph({ bullet: { level }, children }))
      return
    }
    paragraphs.push(new Paragraph({
      numbering: { reference: 'html-ordered-list', level, instance },
      children
    }))
  }

  const renderListNode = (listNode, level = 0, inheritedOrderedInstance = null) => {
    if (!listNode || !Array.isArray(listNode.items) || listNode.items.length === 0) return
    const currentOrderedInstance = listNode.listType === 'ol'
      ? (typeof inheritedOrderedInstance === 'number' ? inheritedOrderedInstance : getNextHtmlOrderedListInstance())
      : inheritedOrderedInstance

    listNode.items.forEach((itemNode) => {
      if (!itemNode || !Array.isArray(itemNode.parts)) return
      itemNode.parts.forEach((partNode) => {
        if (!partNode) return
        if (partNode.type === 'text') {
          pushListParagraph(listNode.listType, level, currentOrderedInstance, partNode.text)
          return
        }
        if (partNode.type === 'list') renderListNode(partNode, level + 1, currentOrderedInstance)
      })
    })
  }

  rootNode.children.forEach((childNode) => {
    if (!childNode) return
    if (childNode.type === 'text') { pushTextParagraph(childNode.text); return }
    if (childNode.type === 'list') renderListNode(childNode)
  })

  return paragraphs.length > 0 ? paragraphs : null
}

/**
 * Parse markdown-style lists (lines starting with "-") into Paragraph[].
 *
 * @param {string[]} lines
 * @returns {Paragraph[]|null}
 */
const parseMarkdownLists = (lines) => {
  const paragraphs = []
  lines.forEach(line => {
    const match = line.match(/^\s*-\s+(.*)$/)
    if (match) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { line: 240, lineRule: 'AUTO' },
        children: parseHtmlTags(match[1])
      }))
    } else if (line.trim()) {
      paragraphs.push(new Paragraph({
        spacing: { line: 240, lineRule: 'AUTO' },
        children: parseHtmlTags(line)
      }))
    }
  })
  return paragraphs.length > 0 ? paragraphs : null
}

/**
 * Create a paragraph that supports explicit line breaks from "\n".
 *
 * @param {string} text
 * @returns {Paragraph}
 */
const createParagraphWithLineBreaks = (text) => {
  const lines = text.split('\n')
  const children = lines.flatMap((line, index) => {
    const runs = line.includes('<')
      ? parseHtmlTags(line)
      : [new TextRun({ text: line })]

    if (index < lines.length - 1) runs.push(new TextRun({ break: 1 }))
    return runs
  })

  return new Paragraph({ children })
}

/**
 * Intelligently parse any content string into Paragraph[].
 * Detects lists first; falls back to a single formatted paragraph.
 *
 * @param {string|Object} content
 * @returns {Paragraph[]}
 */
const parseContentAsParagraphs = (content) => {
  if (typeof content === 'string') {
    const listParagraphs = parseHtmlLists(content)
    if (listParagraphs) return listParagraphs
    if (content.includes('\n')) return [createParagraphWithLineBreaks(content)]
    if (content.includes('<')) return [new Paragraph({ children: parseHtmlTags(content) })]
    return [new Paragraph({ text: content })]
  }
  return [createParagraph(content)]
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Paragraph / heading creators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Paragraph with "Normal" style.
 * Supports HTML tags in string content and custom spacing.
 *
 * @param {string|Object} content - Text string or paragraph config object
 * @param {Object} [customSpacing] - Spacing overrides (before, after, line, lineRule)
 * @returns {Paragraph}
 */
const createParagraph = (content, customSpacing = {}) => {
  // Only apply custom spacing when it has actual keys; otherwise let the style drive spacing
  const hasCustomSpacing = customSpacing && Object.keys(customSpacing).length > 0
  const baseConfig = { spacing: hasCustomSpacing ? customSpacing : spacing }

  if (typeof content === 'string') {
    if (content.includes('<')) {
      return new Paragraph({ ...baseConfig, children: parseHtmlTags(content) })
    }
    return new Paragraph({ ...baseConfig, text: content })
  }

  const { text, bold, ...restContent } = content

  if (text) {
    if (text.includes('<')) {
      return new Paragraph({ ...baseConfig, ...restContent, children: parseHtmlTags(text) })
    }
    return new Paragraph({ ...baseConfig, ...restContent, children: [new TextRun({ text, bold })] })
  }

  return new Paragraph({ ...baseConfig, ...content })
}

/**
 * Create a "Title" styled paragraph.
 *
 * @param {string} text - Supports HTML tags
 * @param {boolean} [center=false]
 * @param {Object} [customSpacing]
 * @returns {Paragraph}
 */
const createTitle = (text, center = false, customSpacing = {}) => {
  const runs = text.includes('<') ? parseHtmlTags(text) : [new TextRun({ text })]
  return createParagraph(
    { children: runs, alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, style: 'Title' },
    customSpacing
  )
}

/**
 * Create a Heading paragraph (Heading1–Heading6 styles).
 * Newlines (\n) in text are preserved as line breaks within the same paragraph.
 *
 * @param {string} text
 * @param {number} [level=1] - Heading level (1–6)
 * @param {boolean} [center=false]
 * @param {Object} [customSpacing]
 * @param {number} [indentSize=0] - Left indent in twips
 * @returns {Paragraph}
 */
const createHeading = (text, level = 1, center = false, customSpacing = {}, indentSize = 0) => {
  const styleId = `Heading${level}`
  const lines = text.split('\n')
  const children = lines.flatMap((line, index) => {
    const runs = line.includes('<') ? parseHtmlTags(line) : [new TextRun({ text: line })]
    if (index < lines.length - 1) runs.push(new TextRun({ break: 1 }))
    return runs
  })

  return createParagraph(
    {
      children,
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      style: styleId,
      ...(indentSize > 0 && { indent: { left: indentSize, hanging: 0 } })
    },
    customSpacing
  )
}

/**
 * Create a numbered heading using section-heading-numbering (or custom reference).
 * Requires getNumberingConfig() to be registered on the Document.
 *
 * @param {string} text
 * @param {number} [level=1]
 * @param {number} [numberingLevel] - ilvl; defaults to level-1
 * @param {number} [numberingInstance=1]
 * @param {boolean} [center=false]
 * @param {Object} [customSpacing]
 * @param {number} [indentSize=0]
 * @param {string} [numberingReference='section-heading-numbering']
 * @returns {Paragraph}
 */
const createNumberedHeading = (
  text,
  level = 1,
  numberingLevel = level > 0 ? level - 1 : 0,
  numberingInstance = 1,
  center = false,
  customSpacing = {},
  indentSize = 0,
  numberingReference = 'section-heading-numbering'
) => {
  const styleId = `Heading${level}`
  const lines = text.split('\n')
  const children = lines.flatMap((line, index) => {
    const runs = line.includes('<') ? parseHtmlTags(line) : [new TextRun({ text: line })]
    if (index < lines.length - 1) runs.push(new TextRun({ break: 1 }))
    return runs
  })

  return createParagraph(
    {
      children,
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      style: styleId,
      numbering: { reference: numberingReference, level: numberingLevel, instance: numberingInstance },
      ...(indentSize > 0 && { indent: { left: indentSize, hanging: 0 } })
    },
    customSpacing
  )
}

/**
 * Create a heading followed by indented child elements.
 * Nested calls accumulate indentation automatically.
 *
 * @param {string} headingText
 * @param {number} [level=1]
 * @param {Array} [children] - Strings, Paragraphs, Tables, or nested createHeadingWithChildren results
 * @param {number} [indentSize=720] - Twips applied to each child
 * @param {number} [headingIndent=0] - Left indent on the heading itself
 * @param {Object} [headingOptions]
 * @param {boolean} [headingOptions.center]
 * @param {Object} [headingOptions.customSpacing]
 * @param {Object} [headingOptions.numbering] - { level, instance, reference }
 * @returns {Array} [headingParagraph, ...indentedChildren]
 */
const createHeadingWithChildren = (
  headingText,
  level = 1,
  children = [],
  indentSize = 720,
  headingIndent = 0,
  headingOptions = {}
) => {
  const { center = false, customSpacing = {}, numbering = null } = headingOptions || {}

  const headingParagraph = numbering
    ? createNumberedHeading(
      headingText,
      level,
      typeof numbering.level === 'number' ? numbering.level : (level > 0 ? level - 1 : 0),
      typeof numbering.instance === 'number' ? numbering.instance : 1,
      center,
      customSpacing,
      headingIndent,
      numbering.reference || 'section-heading-numbering'
    )
    : createHeading(headingText, level, center, customSpacing, headingIndent)

  const flatChildren = (Array.isArray(children) ? children.flat(Infinity) : [children])
    .filter((child) => child !== undefined && child !== null)

  const childParagraphs = flatChildren.map((child) => {
    const constructorName = child && child.constructor && child.constructor.name
    const isParagraphObject = child instanceof Paragraph || constructorName === 'Paragraph'
    const isTableObject = child instanceof Table || constructorName === 'Table'

    if (isParagraphObject) return applyIndentToParagraph(child, indentSize)
    if (isTableObject) return applyIndentToTable(child, indentSize)
    if (child && typeof child === 'object' && child.root) return child

    const isString = typeof child === 'string'
    const paragraph = createParagraph(
      {
        text: isString ? child : child.text,
        indent: { left: indentSize, hanging: 0 }
      },
      child.customSpacing || {}
    )
    paragraph[CHILD_PARAGRAPH_INDENT_KEY] = indentSize
    return paragraph
  })

  return [headingParagraph, ...childParagraphs]
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: List / bullet helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a bullet point paragraph with an optional bold label.
 * Supports optional children for nested sub-bullets.
 * Text / labels may contain HTML tags.
 *
 * @param {string} label - Bold label (use '' for no label)
 * @param {string|Array} [textOrChildren] - Body text, or children array if first is Array
 * @param {Array} [children] - Sub-bullet items: strings or { label, text } objects
 * @returns {Paragraph[]}
 */
const bulletPoint = (label, textOrChildren = '', children = []) => {
  if (Array.isArray(textOrChildren)) {
    children = textOrChildren
    textOrChildren = ''
  }

  let finalLabel = label
  if (textOrChildren && typeof label === 'string' && !label.endsWith(' ')) finalLabel += ' '

  const labelRuns = finalLabel.includes('<')
    ? parseHtmlTags(finalLabel)
    : [new TextRun({ text: finalLabel, bold: true })]

  const paragraphs = [
    new Paragraph({
      bullet: { level: 0 },
      children: [...labelRuns, ...(textOrChildren ? parseHtmlTags(textOrChildren) : [])]
    })
  ]

  if (children && children.length > 0) {
    const subBullets = children.map((child) => {
      const isString = typeof child === 'string'
      const text = isString ? child : child.text
      const childLabel = isString ? null : child.label

      if (childLabel) {
        let finalChildLabel = childLabel
        if (text && typeof childLabel === 'string' && !childLabel.endsWith(' ')) finalChildLabel += ' '
        const childLabelRuns = finalChildLabel.includes('<')
          ? parseHtmlTags(finalChildLabel)
          : [new TextRun({ text: finalChildLabel, bold: true })]
        const textRuns = text.includes('<') ? parseHtmlTags(text) : [new TextRun({ text })]
        return new Paragraph({ bullet: { level: 1 }, children: [...childLabelRuns, ...textRuns] })
      }

      const textRuns = text.includes('<') ? parseHtmlTags(text) : [new TextRun({ text })]
      return new Paragraph({ bullet: { level: 1 }, children: textRuns })
    })
    paragraphs.push(...subBullets)
  }

  return paragraphs
}

/**
 * Numbering configuration for Document.
 * Provides three references:
 *   - `html-ordered-list`   → 1. / a) / i) levels
 *   - `html-unordered-list` → • / ◦ / ▪ levels
 *   - `section-heading-numbering` → A. / A.1. / A.1.1. levels
 *
 * @returns {Array}
 */
const getNumberingConfig = () => [
  {
    reference: 'html-ordered-list',
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: '%1.\u2009',
        suffix: LevelSuffix.SPACE,
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      },
      {
        level: 1,
        format: LevelFormat.LOWER_LETTER,
        text: '%2)\u2009',
        suffix: LevelSuffix.SPACE,
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1440, hanging: 360 } } }
      },
      {
        level: 2,
        format: LevelFormat.LOWER_ROMAN,
        text: '%3)\u2009',
        suffix: LevelSuffix.SPACE,
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 2160, hanging: 360 } } }
      }
    ]
  },
  {
    reference: 'html-unordered-list',
    levels: [
      {
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      },
      {
        level: 1,
        format: LevelFormat.BULLET,
        text: '◦',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1440, hanging: 360 } } }
      },
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: '▪',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 2160, hanging: 360 } } }
      }
    ]
  },
  {
    reference: 'section-heading-numbering',
    levels: [
      {
        level: 0,
        format: LevelFormat.UPPER_LETTER,
        text: '%1.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 0, hanging: 0 } } }
      },
      {
        level: 1,
        format: LevelFormat.DECIMAL,
        text: '%1.%2.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 0 } } }
      },
      {
        level: 2,
        format: LevelFormat.DECIMAL,
        text: '%1.%2.%3.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1440, hanging: 0 } } }
      }
    ]
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Table — Row class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fluent builder for a single table row.
 *
 * @example
 * new Row()
 *   .addTitleCell('Header')
 *   .addTextCell('Cell 1')
 *   .setHeight(400, 'exact')
 *   .build()
 */
class Row {
  constructor () {
    this.cells = []
    this.height = null
    this.cantSplit = false
    this.tableHeader = false
  }

  /**
   * Add a cell or array of cells.
   * @param {TableCell|TableCell[]} cell
   * @returns {Row}
   */
  addCell (cell) {
    if (Array.isArray(cell)) this.cells.push(...cell)
    else this.cells.push(cell)
    return this
  }

  /**
   * Add a shaded title cell that spans multiple columns.
   * Supports \n for multiple lines within the cell.
   *
   * @param {string} text
   * @param {number} [columnSpan=2]
   * @returns {Row}
   */
  addTitleCell (text, columnSpan = 2) {
    this.cells.push(new TableCell({
      children: text.split('\n').map(line =>
        createParagraph({ text: line, alignment: AlignmentType.CENTER, style: 'Heading3' })
      ),
      shading: { type: ShadingType.CLEAR, fill: 'CCCCCC' },
      columnSpan,
      margins: { top: 80, bottom: 80, left: 100, right: 100 }
    }))
    return this
  }

  /**
   * Add a form field pair: bold label cell + empty input cell.
   *
   * @param {string} label
   * @returns {Row}
   */
  addFormField (label) {
    const border = (color = '000000') => ({
      top: { style: BorderStyle.SINGLE, size: 1, color },
      bottom: { style: BorderStyle.SINGLE, size: 1, color },
      left: { style: BorderStyle.SINGLE, size: 1, color },
      right: { style: BorderStyle.SINGLE, size: 1, color }
    })

    this.cells.push(
      new TableCell({
        children: [new Paragraph({ text: label, spacing: { line: 240, lineRule: 'AUTO' } })],
        width: { size: 3000, type: WidthType.DXA },
        margins: { top: 50, bottom: 50, left: 100, right: 100 },
        borders: border()
      }),
      new TableCell({
        children: [new Paragraph({ text: '', spacing: { line: 240, lineRule: 'AUTO' } })],
        margins: { top: 50, bottom: 50, left: 100, right: 100 },
        borders: border()
      })
    )
    return this
  }

  /**
   * Add a content cell. Text may contain HTML tags, lists, or markdown lists.
   *
   * @param {string} text
   * @param {Object} [options]
   * @param {number} [options.columnSpan=1]
   * @param {number} [options.rowSpan=1]
   * @param {Object} [options.width]
   * @param {Object} [options.margins]
   * @param {Object} [options.borders]
   * @returns {Row}
   */
  addTextCell (text, options = {}) {
    const {
      columnSpan = 1,
      rowSpan = 1,
      width = null,
      margins = { top: 50, bottom: 50, left: 100, right: 100 },
      borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
      }
    } = options

    this.cells.push(new TableCell({
      children: parseContentAsParagraphs(text),
      columnSpan,
      ...(rowSpan > 1 && { rowSpan }),
      ...(width && { width }),
      margins,
      borders
    }))
    return this
  }

  /**
   * Add two cells: a bold label and a value. Convenience for 2-column data rows.
   *
   * @param {string} label
   * @param {string} value
   * @param {Object} [options] - { labelOptions, valueOptions }
   * @returns {Row}
   */
  addLabelValue (label, value, options = {}) {
    this.addTextCell(label, { bold: true, alignment: AlignmentType.LEFT, ...options.labelOptions })
    this.addTextCell(value, { alignment: AlignmentType.LEFT, ...options.valueOptions })
    return this
  }

  /**
   * Set fixed or minimum row height.
   * @param {number} height - Twips
   * @param {'auto'|'atLeast'|'exact'} [rule='atLeast']
   * @returns {Row}
   */
  setHeight (height, rule = 'atLeast') {
    this.height = { value: height, rule }
    return this
  }

  /** @param {boolean} [cantSplit=true] */
  setCantSplit (cantSplit = true) { this.cantSplit = cantSplit; return this }

  /** @param {boolean} [isHeader=true] */
  setAsHeader (isHeader = true) { this.tableHeader = isHeader; return this }

  /** @returns {TableRow} */
  build () {
    return new TableRow({
      ...(this.height && { height: this.height }),
      ...(this.cantSplit && { cantSplit: true }),
      ...(this.tableHeader && { tableHeader: true }),
      children: this.cells
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: Table — TableWrapper class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fluent builder for a complete Table.
 *
 * Convenience methods (addTitleRow, addFormFieldRow, addLabelValueRow, addLabelValuePairRow)
 * return `this` for easy chaining. For full row control, use addRow() or addRowObject().
 *
 * @example
 * new TableWrapper()
 *   .setFitContent()
 *   .addTitleRow('My Table')
 *   .addLabelValuePairRow('<b>Key</b>', 'Value')
 *   .addRowObject(new Row().addTextCell('Custom').addTextCell('Row'))
 *   .build()
 */
class TableWrapper {
  constructor () {
    this.rows = []
    this.width = { size: 100, type: WidthType.PERCENTAGE }
    this.indent = { size: 0, type: WidthType.AUTO }
    this.borders = null
    this.margins = null
    this.layout = null
    this.columnWidths = null
  }

  /**
   * Create a new empty Row and add it.
   * @returns {Row} - The new Row (not TableWrapper — use .build() to close)
   */
  addRow () {
    const row = new Row()
    this.rows.push(row)
    return row
  }

  /**
   * Add a pre-built Row instance.
   * @param {Row} row
   * @returns {TableWrapper}
   */
  addRowObject (row) {
    if (row instanceof Row) this.rows.push(row)
    return this
  }

  /**
   * Add a shaded title row spanning 2 columns.
   * @param {string} text - Supports \n for multiple lines
   * @returns {TableWrapper}
   */
  addTitleRow (text) {
    this.rows.push(new Row().addTitleCell(text))
    return this
  }

  /**
   * Add a form field row (label + blank input cell).
   * @param {string} label
   * @returns {TableWrapper}
   */
  addFormFieldRow (label) {
    this.rows.push(new Row().addFormField(label))
    return this
  }

  /**
   * Add a 2-column row with bold label + value.
   * @param {string} label
   * @param {string} value
   * @returns {TableWrapper}
   */
  addLabelValuePairRow (label, value) {
    this.rows.push(new Row().addTextCell(label, { bold: true }).addTextCell(value))
    return this
  }

  /**
   * Add a 4-column row with two label/value pairs side by side.
   * @param {string} label1
   * @param {string} value1
   * @param {string} label2
   * @param {string} value2
   * @returns {TableWrapper}
   */
  addLabelValueRow (label1, value1, label2, value2) {
    this.rows.push(new Row().addLabelValue(label1, value1).addLabelValue(label2, value2))
    return this
  }

  /** @param {number} size  @param {WidthType} [type]  @returns {TableWrapper} */
  setWidth (size, type = WidthType.PERCENTAGE) { this.width = { size, type }; return this }

  /** @param {number} size  @param {WidthType} [type]  @returns {TableWrapper} */
  setIndent (size, type = WidthType.AUTO) { this.indent = { size, type }; return this }

  /**
   * Enable AUTOFIT layout — table width adapts to its content.
   * @returns {TableWrapper}
   */
  setFitContent () {
    this.width = { size: 100, type: WidthType.PERCENTAGE }
    this.layout = TableLayoutType.AUTOFIT
    return this
  }

  /** @param {number[]} widths @returns {TableWrapper} */
  setColumnWidths (widths) {
    this.columnWidths = widths
    return this
  }

  /** @param {Object} borders @returns {TableWrapper} */
  setBorders (borders) { this.borders = borders; return this }

  /** @param {Object} margins @returns {TableWrapper} */
  setMargins (margins) { this.margins = margins; return this }

  /** @returns {Table} */
  build () {
    const tableOptions = {
      rows: this.rows.map(row => (row instanceof Row ? row.build() : new TableRow({ children: [] }))),
      indent: this.indent,
      ...(this.width && { width: this.width }),
      ...(this.layout && { layout: this.layout }),
      ...(this.borders && { borders: this.borders }),
      ...(this.margins && { margins: this.margins }),
      ...(this.columnWidths && { columnWidths: this.columnWidths })
    }
    return new Table(tableOptions)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: SectionWrapper — fluent page/section builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fluent builder for a single Document section (one "page" of content).
 *
 * Eliminates manual array spreading and repeated createParagraph('') calls.
 * All methods return `this` for chaining — except `.getChildren()` and `.build()`.
 *
 * @example
 * new SectionWrapper(properties)
 *   .heading('IDENTIFIKASI', 1, { numbering: { level: 0 } })
 *   .sp()
 *   .table(new TableWrapper().setFitContent().addLabelValuePairRow('A', 'B'))
 *   .sp(2)
 *   .section('DESAIN PEMBELAJARAN', 1,
 *     new SectionWrapper()
 *       .sp()
 *       .add(...parseContentAsParagraphs('<ul><li>item</li></ul>')),
 *     { numbering: { level: 0 } }
 *   )
 *   .build()
 */
class SectionWrapper {
  /**
   * @param {Object|null} [sectionProperties] - docx page properties (size, margin, etc.)
   *   Pass null/undefined to use the Document's default properties.
   */
  constructor (sectionProperties = null) {
    this._properties = sectionProperties
    this._children = []
  }

  /**
   * Add one or more children — Paragraphs, Tables, arrays, or any docx object.
   * Arrays are automatically flattened one level, matching the spread pattern.
   *
   * @param {...(Paragraph|Table|Array|*)} items
   * @returns {SectionWrapper}
   */
  add (...items) {
    for (const item of items) {
      if (Array.isArray(item)) {
        this._children.push(...item.flat(Infinity).filter(Boolean))
      } else if (item != null) {
        this._children.push(item)
      }
    }
    return this
  }

  /**
   * Add n empty spacing paragraphs. Replaces repeated createParagraph('') calls.
   *
   * @param {number} [n=1]
   * @returns {SectionWrapper}
   */
  sp (n = 1) {
    for (let i = 0; i < n; i++) this._children.push(createParagraph(''))
    return this
  }

  /**
   * Add a paragraph with optional custom spacing.
   * Text may include HTML tags.
   *
   * @param {string|Object} [content='']
   * @param {Object} [customSpacing]
   * @returns {SectionWrapper}
   */
  para (content = '', customSpacing = {}) {
    this._children.push(createParagraph(content, customSpacing))
    return this
  }

  /**
   * Add a heading paragraph.
   *
   * @param {string} text
   * @param {number} [level=1]
   * @param {Object} [options]
   * @param {boolean} [options.center=false]
   * @param {Object} [options.customSpacing]
   * @param {number} [options.indent=0] - Left indent in twips
   * @param {Object} [options.numbering] - { level, instance?, reference? }
   * @returns {SectionWrapper}
   */
  heading (text, level = 1, options = {}) {
    const { center = false, customSpacing = {}, indent = 0, numbering = null } = options

    if (numbering) {
      this._children.push(createNumberedHeading(
        text, level,
        typeof numbering.level === 'number' ? numbering.level : (level > 0 ? level - 1 : 0),
        typeof numbering.instance === 'number' ? numbering.instance : 1,
        center,
        customSpacing,
        indent,
        numbering.reference || 'section-heading-numbering'
      ))
    } else {
      this._children.push(createHeading(text, level, center, customSpacing, indent))
    }
    return this
  }

  /**
   * Add a section: a heading followed by indented children.
   * Children may be a raw array or a nested SectionWrapper.
   * Supports the same headingOptions as createHeadingWithChildren.
   *
   * @param {string} text - Heading text
   * @param {number} [level=1]
   * @param {Array|SectionWrapper} [children=[]]
   * @param {Object} [options] - headingOptions + indentSize/headingIndent overrides
   * @param {number} [options.indentSize=720]
   * @param {number} [options.headingIndent=0]
   * @param {boolean} [options.center]
   * @param {Object} [options.customSpacing]
   * @param {Object} [options.numbering] - { level, instance?, reference? }
   * @returns {SectionWrapper}
   */
  section (text, level = 1, children = [], options = {}) {
    const { indentSize = 720, headingIndent = 0, ...headingOptions } = options

    const childArray = children instanceof SectionWrapper
      ? children.getChildren()
      : (Array.isArray(children) ? children.flat(Infinity).filter(Boolean) : [children])

    this._children.push(
      ...createHeadingWithChildren(text, level, childArray, indentSize, headingIndent, headingOptions)
    )
    return this
  }

  /**
   * Add a table. Accepts either a TableWrapper (calls .build()) or a raw Table object.
   *
   * @param {TableWrapper|Table} tableOrWrapper
   * @returns {SectionWrapper}
   */
  table (tableOrWrapper) {
    this._children.push(
      tableOrWrapper instanceof TableWrapper ? tableOrWrapper.build() : tableOrWrapper
    )
    return this
  }

  /**
   * Return the accumulated children array (used when this section is nested inside another).
   * @returns {Array}
   */
  getChildren () {
    return [...this._children]
  }

  /**
   * Build and return the raw section descriptor { properties?, children }.
   * The result is accepted directly by Document `sections` or DocWrapper.addSection().
   *
   * @returns {{ properties?: Object, children: Array }}
   */
  build () {
    const section = { children: this._children }
    if (this._properties) section.properties = this._properties
    return section
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: DocWrapper — top-level Document builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fluent builder for the top-level docx Document.
 *
 * Handles Document construction boilerplate: numbering config, default styles,
 * and section accumulation. Call .build() for a raw Document or .save() to write a file.
 *
 * @example
 * const buffer = await new DocWrapper()
 *   .withDefaultStyles()
 *   .addSection(coverPage)               // raw section object or SectionWrapper
 *   .addSection(
 *     new SectionWrapper(properties)
 *       .heading('SECTION A', 1)
 *       .sp()
 *       .table(new TableWrapper()...)
 *   )
 *   .toBuffer()
 */
class DocWrapper {
  constructor () {
    this._sections = []
    this._numberingConfig = getNumberingConfig()
    this._styles = null
  }

  /**
   * Apply default styles from docx-config (paragraphStyles + DocumentDefaults spacing).
   * This is the recommended way to apply consistent typography.
   *
   * @returns {DocWrapper}
   */
  withDefaultStyles () {
    this._styles = {
      default: new DocumentDefaults({ paragraph: { spacing } }),
      paragraphStyles
    }
    return this
  }

  /**
   * Apply a custom styles object (overrides withDefaultStyles).
   * Accepts the same shape as Document `styles`.
   *
   * @param {Object} stylesObj
   * @returns {DocWrapper}
   */
  withStyles (stylesObj) {
    this._styles = stylesObj
    return this
  }

  /**
   * Replace the default numbering config.
   * The default already includes html-ordered-list, html-unordered-list, section-heading-numbering.
   *
   * @param {Array} config - Raw numbering config array
   * @returns {DocWrapper}
   */
  withNumbering (config) {
    this._numberingConfig = config
    return this
  }

  /**
   * Append a section. Accepts a SectionWrapper (auto-built) or a raw section descriptor.
   *
   * @param {SectionWrapper|{ properties?: Object, children: Array }} section
   * @returns {DocWrapper}
   */
  addSection (section) {
    this._sections.push(
      section instanceof SectionWrapper ? section.build() : section
    )
    return this
  }

  /**
   * Build and return the docx Document object.
   * @returns {Document}
   */
  build () {
    return new Document({
      numbering: { config: this._numberingConfig },
      ...(this._styles && { styles: this._styles }),
      sections: this._sections
    })
  }

  /**
   * Build the Document and return a Buffer.
   * @returns {Promise<Buffer>}
   */
  async toBuffer () {
    return Packer.toBuffer(this.build())
  }

  /**
   * Build the Document, write it to disk, and return the Buffer.
   *
   * @param {string} filepath - Output file path (e.g. 'output/MyDoc.docx')
   * @returns {Promise<Buffer>}
   */
  async save (filepath) {
    const buffer = await this.toBuffer()
    const { writeFileSync } = await import('fs')
    writeFileSync(filepath, buffer)
    return buffer
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: Legacy helpers (kept for backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use new Row().addTitleCell(text).build() inside TableWrapper instead.
 * Creates a standalone title TableCell spanning 2 columns.
 */
const titleCell = (text) =>
  new TableCell({
    children: text.split('\n').map(line =>
      createParagraph({ text: line, alignment: AlignmentType.CENTER, style: 'Heading3' })
    ),
    shading: { type: ShadingType.CLEAR, fill: 'CCCCCC' },
    columnSpan: 2,
    margins: { top: 80, bottom: 80, left: 100, right: 100 }
  })

/**
 * @deprecated Use new Row().addFormField(label).build() inside TableWrapper instead.
 * Returns a [labelCell, inputCell] pair for use in a TableRow.
 */
const formField = (label) => [
  new TableCell({
    children: [new Paragraph({ text: label, spacing: { line: 240, lineRule: 'AUTO' } })],
    width: { size: 3000, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
    }
  }),
  new TableCell({
    children: [new Paragraph({ text: '', spacing: { line: 240, lineRule: 'AUTO' } })],
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
    }
  })
]

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Core builders (new API)
  DocWrapper,
  SectionWrapper,

  // Table builders
  Row,
  TableWrapper,

  // Paragraph / heading creators
  createParagraph,
  createTitle,
  createHeading,
  createNumberedHeading,
  createHeadingWithChildren,

  // List helpers
  bulletPoint,
  parseHtmlTags,
  parseHtmlLists,
  parseHtmlListTags,
  parseMarkdownLists,
  parseContentAsParagraphs,
  getNumberingConfig,

  // Legacy (backwards compatible)
  titleCell,
  formField
}
