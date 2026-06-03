---
name: react-quality-gate
routing_category: devops
description: "React / Next.js / Expo / React Native / Vite / TanStack 系の UI コード変更後、commit 前、PR 前、またはユーザーが React 品質・hooks・effects・accessibility・performance・architecture・bundle size・agent-generated React の劣化を気にしているときに使う。React Doctor などの決定的スキャンを advisory gate として組み込み、score regression と重要診断を確認する。"
contract:
  preconditions:
    - "対象 repo または Product が React 系である"
    - "変更範囲、base branch、package manager、既存 lint/test/CI のいずれかが確認できる"
  postconditions:
    - "実行した React 品質チェック、結果、score regression の有無が残っている"
    - "React Doctor の結果を lint/test/accessibility/browser QA の代替にしていない"
    - "外部 CLI や CI action の導入は Product 単位で判断され、DCR 正本には自動 installer を混ぜていない"
  invariants:
    - "React Doctor は DCR の rule/skill/agent/orchestration を置換しない"
    - "新規 CI gate は最初 advisory で始め、false positive と所要時間を確認してから fail gate 化する"
    - "private code や機密 Product では score API を使わない設定を優先する"
composable:
  input_type: react-codebase
  output_type: quality-report
  chains_with:
    - dcr-pipeline
    - verification-before-completion
metadata:
  origin: millionco/react-doctor
  upstream_url: "https://github.com/millionco/react-doctor"
  upstream_path: "skills/react-doctor/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-25"
  adapted_from: "React Doctor skill and CLI pattern; DCR keeps only the React quality gate workflow, not the installer or runtime ownership."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - copilot
    - cursor
    - gemini-cli
---

# React Quality Gate

## 目的

React 系の実装後に、LLM が作りがちな hooks / effects / state / accessibility / performance / architecture の劣化を早めに検出する。

React Doctor は外部 diagnostic CLI として扱う。DCR の正本、agent routing、orchestration、CI 方針を置換しない。

## いつ使うか

- React / Next.js / Expo / React Native / Vite / TanStack の UI コードを変更した
- agent が生成した React に不安がある
- hooks、effects、state、memoization、bundle size、accessibility、security の劣化を見たい
- PR 前に React 専用の regression gate を足したい
- `dcr-pipeline` の前に静的な React 品質チェックを済ませたい

## 基本方針

1. 既存 repo の lint / typecheck / test を優先して確認する
2. React Doctor は追加の advisory scan として走らせる
3. 差分作業では full scan より diff scan を優先する
4. errors を先に直し、warnings は false positive と修正価値を分ける
5. score は補助指標にし、単独の合否条件にしない
6. private / security-sensitive repo では score API を避ける

## コマンド選択

ネットワークが必要な `npx` 実行は、環境の承認と Product の方針に従う。

### 差分 advisory scan

base branch が分かる場合:

```bash
npx react-doctor@0.2.5 . --verbose --diff main --no-score --fail-on none
```

base branch が不明な場合:

```bash
npx react-doctor@0.2.5 . --verbose --no-score --fail-on none
```

### commit / PR 前の強めの scan

false positive 傾向が把握済みの Product だけで使う:

```bash
npx react-doctor@0.2.5 . --verbose --diff main --no-score --fail-on error
```

`@latest` はローカル手動調査では許容できるが、CI や再現性が必要な検証では version pin を優先する。

## GitHub Actions 導入判断

React Doctor の GitHub Action は PR annotation と comment に向くが、root 共通 CI へ即導入しない。

| 判断 | 条件 |
|---|---|
| advisory only | 初回導入、false positive 未把握、Product が小さい |
| diff-only gate | React Product で PR 変更分だけ見たい |
| fail-on error | 既存診断の傾向が安定し、errors が実害に近い |
| skip | React ではない repo、CI 時間が厳しい、外部 CLI 実行が許可されない |

Action 側が内部で `npx react-doctor@latest` を使う可能性があるため、再現性が必要な環境では action の挙動を確認してから gate 化する。

## Agent install は使わない

`npx react-doctor@latest install` は各 agent 向け skill を配置するため便利だが、DCR では使わない。

理由:

- `.ai/catalog/skills/` が正本で、生成 mirror は `deploy.ps1` が管理する
- 自動 installer は Codex / Claude / Cursor / Copilot の差分を勝手に作りやすい
- upstream skill は短く有用だが、DCR では `react-quality-gate` として runtime-neutral に保持する

## 結果の読み方

- `error`: 修正または明示的な false positive 理由が必要
- `warning`: 影響範囲、修正コスト、既存規約との整合を見て優先度を決める
- score drop: 差分に起因するか確認する。score だけで失敗扱いにしない
- accessibility / security: automated scan の限界を明記し、必要なら専門 QA へつなぐ

## 他 skill とのつなぎ

- `dcr-pipeline`: lint / typecheck / browser QA / performance 測定と合わせて判断する
- `accessibility-auditor`: accessibility 診断は自動検査だけで完了扱いにしない

## 出力テンプレート

```markdown
REACT QUALITY GATE
- scope:
- commands:
- base branch:
- result:
- score regression:
- errors:
- warnings:
- false positives:
- follow-up QA:
```
