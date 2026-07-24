---
name: dcr-generated-mirror-drift
routing_category: devops
description: "DCR repo の generated mirror / tracked entrypoint drift を診断する。`deploy.ps1`、`deploy.ps1 -Check`、GitHub Actions の generated-entrypoint failure、`.codex/agents`、`.claude/agents`、`.cursor/`、AGENTS/CLAUDE の同期ずれが出たときに使う。"
contract:
  preconditions:
    - "deploy/check/CI/git status のいずれかに生成物 drift や mirror tracking の症状がある"
  postconditions:
    - "症状、正本か生成物か、最小再現コマンド、修正先、検証コマンドが分かる"
  invariants:
    - "generated mirror を正本として手編集しない"
    - "削除前に destination-only か source-of-truth かを分類する"
composable:
  input_type: failure
  output_type: diagnosis
  chains_with:
    - systematic-debugging
    - verification-before-completion
    - documents-ops
metadata:
  origin: local-codex-sessions
  adapted_from: "runtime memory skill for generated mirror drift plus May 2026 DCR mirror/CI cleanup rollouts"
  imported_at: "2026-05-24"
runtime_targets:
  - codex
  - claude
  - cursor
---

# DCR Generated Mirror Drift

## 目的

DCR repo の正本 (`.ai/core`, `.ai/routing`, `.ai/catalog`, `.ai/adapters`) と、Mac triad の generated mirror / tracked entrypoint のズレを短時間で分類する。

この skill は修正そのものより先に、どこを直すべきかを確定するために使う。`.codex/agents` や `.claude/agents` などの生成先を見つけても、そこを正本として編集しない。

## Trigger

- `Deploy verification failed`
- `deploy.ps1 -Check` が `[EXTRA]`, `[MISSING]`, `[DRIFT]` を出す
- GitHub Actions の `Check generated entrypoint drift` が失敗する
- `Generated tracked entrypoints are stale.`
- `Generated tracked mirrors are stale.`
- `.cursor/`, `AGENTS.md`, `CLAUDE.md` が生成後に dirty になる
- `.codex/agents`, `.claude/agents`, tracked entrypoint の扱いが怪しい

## 初動

1. 症状と実行コマンドをそのまま控える。
2. まず narrow check を使う。
   - Cursor entrypoint: `.\deploy.ps1 -Target cursor` 後に `git status --short .cursor .cursorignore`
   - 全体: `.\deploy.ps1 -Check`
   - tracked entrypoint: `.github/workflows/validate.yml` の対象ファイルを確認
3. 該当 path を分類する。
   - source-of-truth: `.ai/core`, `.ai/routing`, `.ai/catalog`, `.ai/adapters`, generator scripts
   - generated mirror: `.codex/agents`, `.claude/agents`, `.cursor`
   - tracked generated entrypoint: `AGENTS.md`, `CLAUDE.md`, `.cursor`, routing indexes
4. source に無い destination-only item は、昇格するか stale residue として消すかを判断する。

## 診断表

| Symptom | Likely cause | First check | Fix target |
|---|---|---|---|
| `[EXTRA] ... exists only in destination` | destination-only mirror residue | `deploy.ps1 -Check` | deploy cleanup logic or generated mirror |
| `Generated tracked entrypoints are stale.` | tracked entrypoint regenerated with different content/newline | CI log, `git status --short`, `git ls-files --eol` | adapter / generator, not entrypoint by hand |
| Generated mirror is missing from a clean checkout | mirror is ignored or untracked | `git ls-files .codex/agents .claude/agents .cursor` | `.gitignore`, Git index, and adapter |
| Removed tool still appears | hidden mirror or cache residue | hidden-aware search/enumeration | sync logic with `-Force`, or explicit residue cleanup |

## Output

Always report in this compact shape:

```markdown
DCR MIRROR DRIFT
- symptom:
- source or mirror:
- minimal repro:
- fix target:
- verification:
```

## Verification

Choose the smallest relevant set, then broaden only when needed:

```powershell
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Target cursor
pwsh -ExecutionPolicy Bypass -File .\validate.ps1
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1
pwsh -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

If a recursive cleanup is needed, verify the resolved target path stays under the intended mirror or workspace before deleting.
