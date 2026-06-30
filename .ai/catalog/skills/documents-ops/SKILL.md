---
name: documents-ops
routing_category: documents
description: "Documents umbrella skill for docs, documentation updates, co-authoring, ADR, PRD to issues, domain glossary, ubiquitous language, API docs, diagrams, canvas/static design, Word/docx, PDF, PowerPoint/pptx/slides, spreadsheets/xlsx/csv/tsv, X/Twitter research, and document artifact workflows. Use this as the active DCR documents entrypoint; former narrow documents skills remain deprecated aliases. OpenAI Documents, Presentations, and Spreadsheets runtime skills are the baseline for file manipulation."
contract:
  preconditions:
    - "document, artifact, diagram, research, spreadsheet, slide, PDF, Word, or documentation task is requested"
  postconditions:
    - "the task is routed to the correct document lane without activating many narrow skills"
    - "file-producing work records the generated artifact path or verification evidence"
  invariants:
    - "do not edit generated mirrors as the source of truth"
    - "when public or current external facts matter, verify them from current sources"
    - "for Office/PDF/spreadsheet work, prefer the configured OpenAI runtime skill or bundled workspace dependency over ad hoc parsing"
composable:
  input_type: document-brief
  output_type: document-artifact-or-plan
  chains_with:
    - writing-plans
    - dcr-pipeline
    - verification-before-completion
metadata:
  origin: DCR local
  imported_at: "2026-05-28"
  adapted_from: "DCR documents skill umbrella for OpenAI Skills baseline slimming."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - cursor
---
absorbs:
  - adr-management
  - api-docs-automation
  - architecture-diagram-generator
  - canvas-design
  - doc-coauthoring
  - docs-update
  - docx
  - pdf
  - pptx
  - prd-to-issues
  - ubiquitous-language
  - x-research
  - xlsx
---

# Documents Ops

OpenAI Skills baseline へのスリム化では、文書・図解・Office/PDF/Spreadsheet 系の細かい skill を個別発火せず、この umbrella で受ける。旧 skill は本文を参照用に残し、routing は `documents-ops` を優先する。

`writing-plans` は OpenAI Superpowers と DCR `docs/dcr/plans` overlay の exact overlap として active のまま残す。

## Lanes

| Lane | Former skills | 用途 |
|---|---|---|
| Docs and Governance | `docs-update`, `doc-coauthoring`, `adr-management`, `prd-to-issues`, `ubiquitous-language` | README, specs, ADR, PRD, GitHub issues, glossary, domain language |
| API and Architecture | `api-docs-automation`, `architecture-diagram-generator` | OpenAPI docs, architecture diagrams, data flow, deployment diagrams |
| Visual Artifacts | `canvas-design` | posters, static visual design, PNG/PDF outputs |
| Office and Files | `docx`, `pdf`, `pptx`, `xlsx` | Word, PDF, slide deck, spreadsheet, CSV/TSV tasks |
| Research | `x-research` | X/Twitter public sentiment and discourse research |

## Baseline Mapping

| Artifact type | Baseline |
|---|---|
| Word / general documents | OpenAI primary runtime `documents` |
| Slides / decks / PowerPoint | OpenAI primary runtime `presentations` |
| Spreadsheets / CSV / TSV | OpenAI primary runtime `spreadsheets` |
| DCR planning docs | `writing-plans` active overlay |

## Flow

1. Identify the lane and output artifact type.
2. Prefer the official runtime skill or bundled workspace dependency when files must be created or edited.
3. If updating repo docs, edit source-of-truth docs first and regenerate mirrors only through deploy.
4. If the task depends on external/public/current facts, verify with current sources before summarizing.
5. Finish with artifact path, command evidence, or reader-facing verification.

## Output Template

```markdown
DOCUMENTS OPS
- lane:
- artifact:
- source material:
- action:
- output path:
- verification:
```
