[**Modul Ajar Generator**](../../../../README.md)

***

[Modul Ajar Generator](../../../../README.md) / [packages/handlers/handle-autofill-ai](../README.md) / Message

# Interface: Message

Defined in: [packages/handlers/handle-autofill-ai.js:8](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/handlers/handle-autofill-ai.js#L8)

## Properties

### content

> **content**: `string`

Defined in: [packages/handlers/handle-autofill-ai.js:10](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/handlers/handle-autofill-ai.js#L10)

The content of the message

***

### name?

> `optional` **name?**: `string`

Defined in: [packages/handlers/handle-autofill-ai.js:11](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/handlers/handle-autofill-ai.js#L11)

Optional name for tool/function messages

***

### role

> **role**: `"system"` \| `"user"` \| `"assistant"` \| `"tool"`

Defined in: [packages/handlers/handle-autofill-ai.js:9](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/handlers/handle-autofill-ai.js#L9)

The role of the message sender (excluding 'function' to avoid name requirement)

***

### tool\_call\_id?

> `optional` **tool\_call\_id?**: `string`

Defined in: [packages/handlers/handle-autofill-ai.js:12](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/handlers/handle-autofill-ai.js#L12)

Optional tool_call_id for tool messages
