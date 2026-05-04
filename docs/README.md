[project-structure]: project-structure.md
[installation]: installation.md
[deploy-vercel]: deploy/vercel.md
[api-reference]: api-reference.md
[codebase-overview]: codebase-overview.md
[applications]: applications.md
[shared-packages]: shared-packages.md
[runtime-flow]: runtime-flow.md

# Project Documentation

Welcome to the official documentation. This guide provides comprehensive information on how to set up, deploy, and navigate the codebase. Please review each section to ensure a smooth development experience.

## Table of Contents

*   **[Project Structure][project-structure]**  
    An in-depth look at the architecture, directory organization, and the reasoning behind our monorepo design.
    
*   **[Installation Guide][installation]**  
    Step-by-step instructions to get the project up and running in your local development environment.
    
*   **[Deployment to Vercel][deploy-vercel]**  
    Quick and manual procedures for deploying the application to Vercel's edge infrastructure.

*   **[Codebase Overview][codebase-overview]**  
    A map of the main runtime entry points, shared packages, and request flow.

*   **[Applications][applications]**  
    How the API and web apps start, which middleware they register, and which routes they expose.

*   **[Shared Packages][shared-packages]**  
    What lives in `packages/`, what each module exports, and how the shared logic is reused.

*   **[Runtime Flow][runtime-flow]**  
    The request lifecycle from the browser to the handlers, AI wrapper, VM runner, and DOCX output.

*   **[API Reference][api-reference]**  
    Detailed documentation of the backend API endpoints, request/response formats, and usage examples. (Auto-generated from JSDoc comments in the codebase with `npm run docs`)
