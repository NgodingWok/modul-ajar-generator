[**Modul Ajar Generator**](../../../../README.md)

***

[Modul Ajar Generator](../../../../README.md) / [packages/utils/utils](../README.md) / getEnvPath

# Function: getEnvPath()

> **getEnvPath**(`filename?`): `string` \| `null`

Defined in: [packages/utils/utils.js:167](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/utils/utils.js#L167)

Gets the path to the .env file, checking both the current working directory and the project root. This allows for flexibility in where the .env file can be located, accommodating different deployment and development setups.

## Parameters

### filename?

`string` = `'.env'`

The name of the .env file to look for (default is '.env')

## Returns

`string` \| `null`

- The path to the .env file, or null if not found
