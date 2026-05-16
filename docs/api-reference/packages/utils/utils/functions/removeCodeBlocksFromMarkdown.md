[**Modul Ajar Generator**](../../../../README.md)

***

[Modul Ajar Generator](../../../../README.md) / [packages/utils/utils](../README.md) / removeCodeBlocksFromMarkdown

# Function: removeCodeBlocksFromMarkdown()

> **removeCodeBlocksFromMarkdown**(`markdown`): `string`

Defined in: [packages/utils/utils.js:63](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/utils/utils.js#L63)

Removes markdown code blocks and inline code from a markdown string.
Note: This removes MARKDOWN code blocks (e.g., from markdown with embedded code),
NOT pure code files. If the entire content is a code block, will return empty string.

## Parameters

### markdown

`string`

Markdown content with embedded code blocks

## Returns

`string`

- Markdown with code blocks removed
