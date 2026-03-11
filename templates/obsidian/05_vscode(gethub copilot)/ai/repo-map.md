# Repo Map

Purpose:
Help the assistant understand the project structure and conventions
before proposing changes.

Behavior rules:
- infer the repository structure before suggesting edits
- prefer existing patterns instead of introducing new ones
- preserve architecture and naming conventions
- recommend minimal changes in the correct layer
- avoid cross-layer coupling unless redesign is requested

When uncertain:
- point to the most likely file or layer that should be inspected
- state assumptions explicitly

---

# Project Summary

Product:
Describe the product or system.

Main purpose:
What problem the system solves.

Tech stack:
List core technologies.

Runtime:
Example: Node / Python / JVM / Serverless

Package manager:
Example: npm / pnpm / yarn / pip / poetry

---

# Entrypoints

Web app:
Main frontend entry.

API:
Backend entry.

Worker / batch:
Background processes.

CLI / scripts:
Automation tools.

---

# Main Directories

src/
Main application source code.

app/
Application layer or framework entry.

components/
UI components.

features/
Feature modules.

services/
Domain or business logic.

lib/
Shared utilities.

tests/
Test suites.

docs/
Documentation.

scripts/
Automation scripts.

---

# Architecture Notes

Preferred layering:
Example: controller → service → repository

State management:
Example: Redux / Zustand / Context / server state

API client pattern:
Example: typed client / fetch wrapper / SDK

Validation pattern:
Example: zod / joi / class-validator

Error handling:
How errors propagate and are logged.

Testing strategy:
Example: unit / integration / e2e

---

# Change Rules

When modifying the codebase:

- prefer minimal diffs
- preserve existing naming conventions
- avoid introducing new dependencies without strong justification
- keep logic in the correct architectural layer
- avoid leaking infrastructure concerns into domain logic