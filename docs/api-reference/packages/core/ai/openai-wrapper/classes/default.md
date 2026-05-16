[**Modul Ajar Generator**](../../../../../README.md)

***

[Modul Ajar Generator](../../../../../README.md) / [packages/core/ai/openai-wrapper](../README.md) / default

# Class: default

Defined in: [packages/core/ai/openai-wrapper.js:26](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L26)

OpenAIWrapper is a simple wrapper around the OpenAI API to manage contexts and generate responses.

## Example

```ts
const wrapper = new OpenAIWrapper('your-api-key')
 wrapper.loadContextsFromDir('./contexts')
 const response = await wrapper.chat('Hello, model!')
 console.log(response)
```

## Note

Make sure to set the OPENAI_API_KEY and OPENAI_MODEL environment variables before using this class.

## Constructors

### Constructor

> **new default**(`apiKey`, `model?`, `baseURL?`): `OpenAIWrapper`

Defined in: [packages/core/ai/openai-wrapper.js:43](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L43)

Creates an instance of OpenAIWrapper.

#### Parameters

##### apiKey

`string`

Your OpenAI API key

##### model?

`string` = `'gpt-4.1-2025-04-14'`

The model to use

##### baseURL?

`string` \| `null`

The base URL for the OpenAI API

#### Returns

`OpenAIWrapper`

## Accessors

### baseURL

#### Get Signature

> **get** **baseURL**(): `string` \| `null`

Defined in: [packages/core/ai/openai-wrapper.js:63](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L63)

Gets the base URL for the OpenAI API.

##### Returns

`string` \| `null`

***

### client

#### Get Signature

> **get** **client**(): `OpenAI`

Defined in: [packages/core/ai/openai-wrapper.js:88](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L88)

Gets the OpenAI client instance.

##### Returns

`OpenAI`

***

### context

#### Get Signature

> **get** **context**(): [`Message`](../interfaces/Message.md)[]

Defined in: [packages/core/ai/openai-wrapper.js:96](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L96)

Gets the default context.

##### Returns

[`Message`](../interfaces/Message.md)[]

#### Set Signature

> **set** **context**(`context`): `void`

Defined in: [packages/core/ai/openai-wrapper.js:104](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L104)

Sets the default context.

##### Parameters

###### context

[`Message`](../interfaces/Message.md)[]

##### Returns

`void`

***

### model

#### Get Signature

> **get** **model**(): `string`

Defined in: [packages/core/ai/openai-wrapper.js:71](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L71)

Gets the model.

##### Returns

`string`

#### Set Signature

> **set** **model**(`model`): `void`

Defined in: [packages/core/ai/openai-wrapper.js:79](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L79)

Sets the model.

##### Parameters

###### model

`string`

##### Returns

`void`

## Methods

### addContext()

> **addContext**(...`contexts`): `void`

Defined in: [packages/core/ai/openai-wrapper.js:115](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L115)

Adds one or more context objects to the existing default context.

#### Parameters

##### contexts

...[`Message`](../interfaces/Message.md)[]

#### Returns

`void`

***

### chat()

> **chat**(`messages`): `Promise`\<`string`\>

Defined in: [packages/core/ai/openai-wrapper.js:173](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L173)

Send a chat message to the OpenAI model with the loaded contexts.

#### Parameters

##### messages

`string` \| `string`[] \| [`Message`](../interfaces/Message.md)[]

#### Returns

`Promise`\<`string`\>

#### Throws

***

### loadContext()

> **loadContext**(`filePath`): `void`

Defined in: [packages/core/ai/openai-wrapper.js:151](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L151)

Loads a context from a file and adds it to the default context as a system message.

#### Parameters

##### filePath

`string`

#### Returns

`void`

***

### loadContextsFromDir()

> **loadContextsFromDir**(`pathDir`): `void`

Defined in: [packages/core/ai/openai-wrapper.js:126](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/ai/openai-wrapper.js#L126)

Load context(s) from a directory.

#### Parameters

##### pathDir

`string`

#### Returns

`void`
