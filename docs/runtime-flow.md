# Runtime Flow

This page describes the main request flow through the codebase.

## Home Page Flow

1. The browser requests `GET /`.
2. [apps/web/routes/home.js](../apps/web/routes/home.js) renders the EJS layout with runtime metadata.
3. `APP_API_BASE_URL` is normalized before the frontend scripts read it.
4. The page loads client-side JavaScript from `public/js/`.

## AI Autofill Flow

1. The client submits form text to `POST /autofill-ai`.
2. The route forwards the request body to [handleAutoFillAI](../packages/handlers/handle-autofill-ai.js).
3. The handler validates required fields and sends a prompt to [OpenAIWrapper](../packages/core/ai/openai-wrapper.js).
4. The route returns the rewritten text as JSON.

## DOCX Generation Flow

1. The client submits the lesson-plan payload to `POST /generate-docx`.
2. The route forwards the body to [handleGenerateDocx](../packages/handlers/handle-generate-docx.js).
3. The handler validates the request, builds the prompt, and asks OpenAI to generate JavaScript.
4. The generated code is cleaned with shared utilities and executed through [VMRunner](../packages/core/engine/vm-runner.js).
5. The VM receives DOCX helpers from [packages/scripts/docx/docx-api.js](../packages/scripts/docx/docx-api.js), [packages/scripts/docx/docx-config.js](../packages/scripts/docx/docx-config.js), [packages/scripts/docx/docx-cover-page.js](../packages/scripts/docx/docx-cover-page.js), and the shared credential object.
6. The route returns the resulting DOCX buffer as a download.

## Local Debugging Flow

When a generated `.docx` file needs inspection, the CLI helper under [scripts/cli/read-docx.js](../scripts/cli/read-docx.js) can list archive files, inspect XML, and show the document structure.
