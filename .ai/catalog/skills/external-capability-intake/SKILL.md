---
name: external-capability-intake
routing_category: governance
description: "外部の Skill / Agent / MCP / CLI / workflow repo を提示され、サトシ開発の共通資産正本へ取り込むか、概念だけ取り込むか、改修不可の外部正本として扱うか、または skip するかを判断するときに使う。GitHub repo、skills pack、agent pack、plugin、external capability、導入価値、格上げ、Superpowers 型運用、改修不可の正本という相談では必ず使う。"
contract:
  preconditions:
    - "ユーザーが外部 repo / tool / skill pack / agent pack / MCP / CLI の導入価値を相談している"
    - "現在の DCR source-of-truth、既存 skill/rule/agent、generated mirror 境界を確認できる"
  postconditions:
    - "候補が skip / concept-import / selective-source-import / immutable-upstream / external-tool-poc に分類されている"
    - "DCR の共通資産正本へ入れる場合も、外部 repo の丸ごとコピーと generated mirror 直接編集を避けている"
    - "immutable-upstream はローカル改修不可、provenance 記録、drift/update 確認の扱いが明確になっている"
  invariants:
    - "外部 repo を DCR の control plane や source-of-truth の置換として扱わない"
    - "generated mirror、user-level installer、runtime cache を正本化しない"
    - "secret、認証設定、外部公開、依存関係追加、MCP/API 設定変更は別承認まで行わない"
composable:
  input_type: external-capability
  output_type: adoption-decision
  chains_with:
    - harness-audit
    - repo-boundary-hygiene
    - architecture-zoom-out
    - verification-before-completion
metadata:
  origin: DCR local
  imported_at: "2026-05-31"
  adapted_from: "May 2026 DCR external repo evaluation pattern for skills, agents, MCP tools, immutable upstream packs, and selective concept imports."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - cursor
---

# External Capability Intake

## 目的

外部の Skill / Agent / MCP / CLI / workflow repo を見たときに、勢いで DCR 正本へコピーしない。

現在の `.ai/catalog` / `.ai/kernel` / `.ai/book` / docs / git 状態を優先し、外部候補を次のどれかへ分類する。

| Decision | 意味 |
|---|---|
| `skip` | 既存方針で十分、または品質・安全・保守コストに見合わない |
| `concept-import` | 考え方だけを DCR docs / skill / rule に薄く反映する |
| `selective-source-import` | DCR の正本として小さく再設計し、provenance 付きで取り込む |
| `immutable-upstream` | Superpowers 型。外部 upstream を改修不可の正本として扱い、DCR には運用方針と drift/update check だけ置く |
| `external-tool-poc` | skill 正本ではなく MCP / CLI / runtime tool 候補。非破壊確認と PoC 後に判断する |

## いつ使うか

- ユーザーが GitHub repo を提示し、「サトシ開発に入れる価値ある？」と聞いた
- Skill / Agent / plugin / MCP / CLI / workflow pack の導入相談
- `共通資産正本に取り込む`, `概念を取り込む`, `格上げ`, `改修不可の正本`, `Superpowers みたいに扱う` という話
- 既存 DCR skill / rule / agent と外部 pack の重複を見たいとき

## 調査順

1. 現在の repo artifact を確認する。
   - `git status --short --branch`
   - `rg -uu -n "<repo名|作者|主要語>" README.md .ai docs tools Product`
   - 関連する `.ai/catalog/skills/*/SKILL.md`、`.ai/routing/integration.md`、`README.md`
2. runtime memory が該当する場合は、過去判断を補助情報として見る。
3. 外部 repo は公式 README / docs / release / license を確認する。最新性が必要なら web で確認する。
4. 既存 DCR の正本・generated mirror・user-level managed target と衝突しないか見る。
5. 次の decision table で分類する。

## 判断基準

### `skip`

選ぶ条件:

- 既存 AGENTS / kernel / editing constraints で十分カバー済み
- 似た skill がすでに active または deprecated successor へ統合済み
- 導入すると trigger、agent persona、installer、runtime 設定が二重化する
- 保守・検証コストが便益を上回る

### `concept-import`

選ぶ条件:

- 原則や checklist は有用だが、外部 repo の runtime / installer / slash command は不要
- DCR の既存 skill / docs に 1-3 行足せば十分
- 外部 repo をコピーすると control plane が増える

導入先:

- `.ai/routing/integration.md`
- `README.md`
- 既存 `.ai/catalog/skills/<skill>/SKILL.md`
- 必要なら `harness-audit` の External Capability Audit 表

### `selective-source-import`

選ぶ条件:

- DCR に未充足の reusable workflow がある
- 外部内容をそのままではなく、DCR の承認、PowerShell、正本/生成物境界、検証ゲートに合わせて再設計できる
- provenance、license、upstream URL、adapted_from を frontmatter に残せる

禁止:

- 外部 repo 全体を `.ai/catalog` に丸ごとコピーする
- installer が作る generated mirror を正本として commit する
- Claude / Cursor / Copilot など特定 runtime の slash command 前提をそのまま入れる

### `immutable-upstream`

選ぶ条件:

- 外部 pack が十分に有用で、DCR 側で改修すると追随不能・保守不能になりやすい
- upstream の設計、更新、公式導入方法を尊重する方が安全
- DCR には local overlay より、導入場所、更新方法、改修禁止、drift check を置く方がよい

扱い:

- 外部 upstream / plugin cache / dedicated checkout を正本とし、DCR では改修しない
- DCR の `.ai/catalog` へコピーして正本化しない
- 必要なら `tools/check-external-<name>.ps1` のような read-only drift/update check を追加する
- README / unified-integration / harness-audit に provenance と運用境界を明記する
- 更新は upstream fast-forward または公式 update path を優先する

例:

- `Superpowers`: DCR に取り込まず、外部公式パッケージとして扱う

### `external-tool-poc`

選ぶ条件:

- 候補が skill / agent 正本ではなく MCP、CLI、indexer、runtime service、browser/tool integration である
- 設定変更、依存関係、user-level config、外部通信、cache/index 生成を伴う

扱い:

- まず `--print-config`、dry-run、docs 確認などの非破壊確認を使う
- インストール、MCP config 変更、PATH 変更、`.codegraph/` などの index 生成は別承認まで行わない
- PoC は Product / repo 単位で限定し、DCR 共通正本には結果と方針だけを戻す

## 出力テンプレート

```markdown
EXTERNAL CAPABILITY INTAKE
- candidates:
- current DCR coverage:
- decision:
- why:
- source-of-truth impact:
- generated/user-level impact:
- security/config impact:
- recommended action:
- verification:
```

複数候補のときは、次の表も出す。

```markdown
| Candidate | Current state | Decision | Action |
|---|---|---|---|
```

## 実装する場合の最小手順

1. `README.md` と `.ai/routing/integration.md` に境界を明記する。
2. 既存 skill に自然な home があればそこへ薄く追加する。なければ新しい DCR skill を作る。
3. `harness-audit` の External Capability Audit 表へ候補を追加する。
4. skill を追加した場合は `tools/generate-routing-index.ps1 -SkillsOutputPath .ai/catalog/skills/_SKILLS_ROUTING_INDEX.md` を実行する。
5. `deploy.ps1`、`deploy.ps1 -Check`、`validate.ps1` で generated mirror と構造を確認する。

## Review hints

- `immutable-upstream` と言いながら `.ai/catalog` にコピーしていないか
- `concept-import` のはずが installer / dependency / MCP config を追加していないか
- `selective-source-import` に provenance と DCR adaptation 理由があるか
- `external-tool-poc` が PoC 前に user-level config を書き換えていないか
