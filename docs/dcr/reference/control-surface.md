# DCR Control Surface Reference

この文書は、`.dcr/` と `docs/dcr/` を 1 つの運用面としてどう読み分けるかを固定するための stable reference です。

## Principle

`.dcr/` と `docs/dcr/` は論理的には同じ control surface ですが、責務が異なるため物理的には分けます。

- `.dcr/`
  - machine-readable config
  - phase、routing、composition、registry、deploy contract の正本
- `docs/dcr/`
  - human-readable governance
  - workflow、reference、spec、plan、運用メモの正本

このため、1 フォルダへ物理統合するより、参照順を統一する方が安全です。

## Read Order

1. ルールや config の実体を探すときは `.dcr/`
2. 意図、運用手順、配置判断を探すときは `docs/dcr/`
3. どちらを編集すべきか迷ったら `docs/dcr/instruction-governance.md`
4. repo 全体の置き場所判断は `docs/dcr/reference/repo-layout.md`

## Why They Stay Separate

- `deploy.ps1` は `.dcr/config.json` を直接参照する
- `.gitignore` は repo root の `.dcr/` だけを source-of-truth として track する
- `docs/dcr/` は README や tools/README から stable reference として参照される
- machine-readable path と human-readable path を分けることで、AI editor が「実行設定」と「説明文書」を混同しにくい

## Safe Editing Rule

- phase や registry や deploy contract を変えるなら `.dcr/`
- 手順、方針、設計判断を変えるなら `docs/dcr/`
- 両方に影響するなら、先に `docs/dcr/` で contract を明文化し、その後 `.dcr/` を更新する