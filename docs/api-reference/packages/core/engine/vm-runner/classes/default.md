[**Modul Ajar Generator**](../../../../../README.md)

***

[Modul Ajar Generator](../../../../../README.md) / [packages/core/engine/vm-runner](../README.md) / default

# Class: default

Defined in: [packages/core/engine/vm-runner.js:28](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L28)

Runs JavaScript code safely inside a sandboxed VM context.

## Example

```ts
const runner = new VMRunner(
    'return 1 + 1',
    {},
    (err, result) => {
      if (err) return console.error(err)
      console.log(result) // 2
    }
  )
  runner.run()
```

## Constructors

### Constructor

> **new default**(`code`, `shared?`, `callback?`): `VMRunner`

Defined in: [packages/core/engine/vm-runner.js:45](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L45)

Creates a new VMRunner instance.

#### Parameters

##### code

`string`

The JavaScript code to run (async function body style)

##### shared?

[`ContextObject`](../type-aliases/ContextObject.md) = `{}`

Variables/functions to inject into the VM

##### callback?

[`VMCallback`](../type-aliases/VMCallback.md) \| `null`

Error-first callback for results

#### Returns

`VMRunner`

## Properties

### callback

> **callback**: [`VMCallback`](../type-aliases/VMCallback.md) \| `null` = `null`

Defined in: [packages/core/engine/vm-runner.js:34](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L34)

***

### code

> **code**: `string` \| `null` = `null`

Defined in: [packages/core/engine/vm-runner.js:30](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L30)

***

### context

> **context**: [`ContextObject`](../type-aliases/ContextObject.md) \| `null` = `null`

Defined in: [packages/core/engine/vm-runner.js:36](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L36)

***

### shared

> **shared**: [`ContextObject`](../type-aliases/ContextObject.md) \| `null` = `null`

Defined in: [packages/core/engine/vm-runner.js:32](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L32)

## Methods

### addContext()

> **addContext**(...`contexts`): `void`

Defined in: [packages/core/engine/vm-runner.js:144](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L144)

Adds extra variables into the VM context before running.

#### Parameters

##### contexts

...[`ContextObject`](../type-aliases/ContextObject.md)[]

Objects to merge into the VM context

#### Returns

`void`

***

### run()

> **run**(): `void`

Defined in: [packages/core/engine/vm-runner.js:76](https://github.com/GTPSHAX/modul-ajar-generator/blob/42ec3258b61b6f10fbbc19c487d848a7d8aaf16f/packages/core/engine/vm-runner.js#L76)

Runs the code inside the VM and calls the callback with the result.

#### Returns

`void`
