# Product Local AI Overlay

このディレクトリは optional です。product-local overlay 用の source-of-truth が本当に必要な時だけ使います。

## Allowed

- `rules/`
- `skills/`
- `agents/`

## When To Create

- product-local の rule / skill / agent source を実際に運用する時
- root `deploy.ps1` とは別に、明示的な local loader か workflow を用意した時
- 単なる将来候補ではなく、active な用途がある時

## Not Allowed

- generated mirror
- editor-specific output
- root DCR core を恒久的に置き換えるための複製

shared 化が必要な asset だけ root の `.ai/assets/rules/`, `.ai/assets/skills/`, `.ai/assets/agents/` へ昇格します。

active な asset が無い段階では、このディレクトリ自体を作らないか、README だけを境界マーカーとして置けば十分です。
