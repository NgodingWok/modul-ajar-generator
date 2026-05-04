# Shared Packages

The reusable code in this repository lives in `packages/`.

## `packages/core`

The core package exports the AI and execution primitives from [packages/core/index.js](../packages/core/index.js).

- [OpenAIWrapper](../packages/core/ai/openai-wrapper.js) wraps the OpenAI client, manages default system context, and provides a `chat()` helper.
- [VMRunner](../packages/core/engine/vm-runner.js) runs generated JavaScript inside a sandboxed VM context and reports the result through a callback.

## `packages/handlers`

The handlers package exports request-level business logic from [packages/handlers/index.js](../packages/handlers/index.js).

- [handleAutoFillAI](../packages/handlers/handle-autofill-ai.js) validates the request body and asks the model to rewrite or complete educational text.
- [handleGenerateDocx](../packages/handlers/handle-generate-docx.js) validates the form payload, generates code with OpenAI, executes the generated code in the VM, and returns a DOCX buffer.

## `packages/utils`

The utilities package exports shared helpers from [packages/utils/index.js](../packages/utils/index.js).

Notable helpers include:

- `validateBodyParams`
- `extractCodeFromMarkdownFence`
- `removeImportRequire`
- `removeCodeBlocksFromMarkdown`
- `convertNumToRoman`
- `numTokensFromString`
- `getEnvPath`
- `loadContexts`

## `scripts/cli`

The CLI package exports a DOCX inspection helper from [scripts/cli/index.js](../scripts/cli/index.js).

It is used for local debugging and for inspecting generated Word files with `JSZip`.
