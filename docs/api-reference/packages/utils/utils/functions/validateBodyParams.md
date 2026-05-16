[**Modul Ajar Generator**](../../../../README.md)

***

[Modul Ajar Generator](../../../../README.md) / [packages/utils/utils](../README.md) / validateBodyParams

# Function: validateBodyParams()

> **validateBodyParams**(`body`, ...`requiredParams`): `object`

Defined in: [packages/utils/utils.js:125](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/utils/utils.js#L125)

Validates that all required parameters are present in the request body.

## Parameters

### body

`Record`\<`string`, `any`\>

The request body

### requiredParams

...`string`[]

The required parameter names

## Returns

`object`

- An object containing a boolean indicating validity and an error message (if applicable)

### message

> **message**: `string` \| `null`

### status

> **status**: `boolean`
