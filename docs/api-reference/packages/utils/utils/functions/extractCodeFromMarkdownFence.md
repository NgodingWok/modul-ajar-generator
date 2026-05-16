[**Modul Ajar Generator**](../../../../README.md)

***

[Modul Ajar Generator](../../../../README.md) / [packages/utils/utils](../README.md) / extractCodeFromMarkdownFence

# Function: extractCodeFromMarkdownFence()

> **extractCodeFromMarkdownFence**(`code`): `string`

Defined in: [packages/utils/utils.js:79](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/utils/utils.js#L79)

Cleans code extracted from markdown code blocks.
Removes the enclosing backticks while preserving inner content.
Use this when the entire input is a markdown code block.

## Parameters

### code

`string`

Code wrapped in markdown fences (```...```)

## Returns

`string`

- Code content without fence markers
