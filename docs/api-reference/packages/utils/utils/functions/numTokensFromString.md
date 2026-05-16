[**Modul Ajar Generator**](../../../../README.md)

***

[Modul Ajar Generator](../../../../README.md) / [packages/utils/utils](../README.md) / numTokensFromString

# Function: numTokensFromString()

> **numTokensFromString**(`message`, `model?`): `number`

Defined in: [packages/utils/utils.js:110](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/utils/utils.js#L110)

Counts the number of tokens in a string using the specified model's tokenizer.

## Parameters

### message

`string`

The string to count tokens for

### model?

`TiktokenModel` = `'gpt-5'`

The OpenAI model to use for tokenization (e.g., "gpt-3.5-turbo")

## Returns

`number`

- The number of tokens in the string
