# Project Structure

```text
modul-ajar-generator/
├─ .agents/                 # AI Agent logic and configurations
│  └─ skills/               # Discrete skill definitions for agents
├─ .pre-commit-config.yaml  # Git hooks for linting and code quality
├─ apps/                    # Application entry points (Monorepo Workspaces)
│  ├─ api/                  # Backend API service
│  ├─ web/                  # Frontend web application
│  └─ workers/              # Background job processors
├─ assets/                  # Build-time static assets and documentation media
├─ context/                 # System prompts and AI context definitions
├─ docs/                    # Technical documentation and guides
├─ packages/                # Shared internal libraries
│  ├─ core/                 # Business logic and domain entities
│  ├─ handlers/             # Shared agent/skill event handlers
│  ├─ scripts/              # Document processing (DOCX, PDF) engines
│  └─ utils/                # General-purpose helper functions
├─ public/                  # Static assets served at runtime (CSS, JS, images)
├─ resources/               # Source files for frontend processing
│  ├─ css/                  # Raw styles (Tailwind CSS source)
│  ├─ js/                   # Client-side logic
│  └─ views/                # EJS templates for server-side rendering
├─ scripts/                 # Maintenance and build-related scripts
├─ tests/                   # Unit, integration, and E2E test suites
└─ vercel.json              # Vercel deployment configuration
```

## Architecture Overview

At first glance, the structure might seem complex, but it is architected for **scalability, maintainability, and clean separation of concerns.** By keeping responsibilities clear, we ensure that the codebase remains manageable even as the project grows.

### The Monorepo Pattern
This project follows a **Monorepo** architecture, allowing us to manage multiple applications and shared libraries within a single repository. 

*   **Logic Reuse**: Core business logic and utilities reside in the `packages/` directory and are shared across all `apps/`.
*   **Isolated Dependencies**: Each sub-directory in `apps/` and `packages/` contains its own `package.json`. This allows `apps/web` to have different dependencies than `apps/api`, preventing version conflicts and keeping builds lean.
*   **Workspace Aliasing**: We use workspace aliasing for clean imports. Instead of messy relative paths like `../../packages/utils/math.js`, you can import shared code directly:
    ```javascript
    import { generatePDF } from '@repo/scripts/pdf-engine.js'
    import { formatData } from '@repo/utils/helpers,js'
    ```

### Core Components
*   **`apps/`**: The execution layer. Whether it's the REST API, the main Web UI, or a background Worker, each is treated as a first-class citizen.
*   **`packages/`**: The brain of the project. This is where the heavy lifting happens, from document generation logic to shared database schemas.
*   **`scripts/`**: Utility scripts for tasks reading docx files for helping the debugging process.
