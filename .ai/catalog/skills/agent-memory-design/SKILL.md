---
name: agent-memory-design
routing_category: devops
description: "マルチエージェント記憶設計：過去判断・関連ファイル履歴・採用/非採用ポリシーを必要時に検索し、決定・理由・検証だけを保存する runtime memory 設計。agentmemory など外部 memory backend は DCR 正本を置換せず補完として扱う。"
disable-model-invocation: true
contract:
  preconditions:
    - "過去判断、関連ファイル履歴、採用/非採用ポリシー、または複数 agent 間の引き継ぎが判断品質に影響する"
  postconditions:
    - "利用可能な runtime memory がある場合、着手前に関連する過去判断を検索している"
    - "作業完了後に保存する場合、決定・理由・検証結果だけに絞っている"
  invariants:
    - ".ai/catalog / .ai/book / repo内 artifact を正本とし、runtime memory は補助検索として扱う"
    - "secret、PII、ログ全文、中間推論、未公開の外部共有不可データは保存しない"
composable:
  input_type: context
  output_type: memory-policy
  chains_with:
    - governance-ops
    - harness-audit
metadata:
  origin: rohitg00/agentmemory
  upstream_url: "https://github.com/rohitg00/agentmemory"
  upstream_paths:
    - "README.md"
  upstream_license: "Apache-2.0"
  imported_at: "2026-05-12"
  adapted_from: "MCP/REST runtime memory pattern; no agentmemory server, npm package, hooks, or database imported."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - cursor
    - windsurf
    - copilot
    - opencode
    - gemini-cli
---

# Agent Memory Design

## 基本原則

- 記憶は目的別に層を分けて設計する
- 全てを記憶しようとすると検索品質が落ちる（選択的保存）
- セッションをまたぐ情報と一時的な情報を混在させない
- runtime memory は DCR 正本の置換ではなく、着手前の recall と完了後の小さな保存に使う

## DCR Runtime Memory Bridge

agentmemory のような MCP/REST memory backend が利用可能な環境では、`pied-piper` の前後に薄く挟む。
memory backend が無い環境では、通常どおり `.ai/catalog`、`.ai/book`、docs、git history を読む。

```text
user request
  -> pied-piper routing
  -> memory preflight (optional)
  -> canonical DCR source check
  -> work / review / implementation
  -> verification
  -> memory save (optional, small)
```

### Natural Language Triggers

ユーザーが長い指示を書かなくても、次の言い方なら memory preflight を検討する。

| Trigger | Search intent |
|---|---|
| `これどう？` / `サトシ開発目線で` | 既存方針、過去の類似判断、置換リスク |
| `入れる価値ある？` / `導入して` | 採用/非採用ポリシー、provenance、既存重複 |
| `前と同じ観点で` / `過去判断も踏まえて` | 直近の比較軸、レビュー観点、決定履歴 |
| `また同じエラー` / `前にもあった` | 障害原因、検証済みコマンド、再発防止 |
| `このファイル消していい？` | 関連ファイル履歴、正本/生成物境界、保護対象 |

### Search Before Work

利用可能なら `memory_smart_search` 相当で次を短く検索する。

- この repo の過去の同種タスク
- 関連ファイルの過去判断
- 既存の採用/非採用ポリシー
- 以前通った検証コマンド、失敗原因、残リスク

検索結果は **DCR 正本より優先しない**。矛盾した場合は `.ai/catalog`、`.ai/book`、repo 内 artifact、現在の git 状態を優先する。

### Save After Work

保存する場合は `memory_save` 相当で次だけに絞る。

- 決定: 採用 / 非採用 / 試験導入 / 保留
- 理由: 既存 DCR との関係、置換リスク、補完価値
- 検証: 実行コマンド、結果、未検証ならその理由
- 再利用条件: どんな自然言語 trigger で次回 recall すべきか

保存しない:

- secret、API key、token、個人情報
- ログ全文、巨大 diff、中間推論
- その場限りの失敗出力
- `.ai/catalog` や `.ai/book` に書くべき正本情報そのもの

## agentmemory の位置づけ

- 役割: Codex / Claude / Cursor / Windsurf などの runtime をまたぐ共有 memory backend
- 採用形態: optional external capability pack
- DCR との関係: `.ai/catalog`、`.ai/book`、docs の正本を補助する検索・保存層
- 禁止: agentmemory の hook、DB、server、npm runtime をこの repo の正本として直接取り込まない
- 導入条件: MCP/REST memory server の運用、secret 除外、保存粒度、削除手順を確認してから有効化する

## 記憶の4層アーキテクチャ

| 層 | 種別 | ライフタイム | 実装 |
|----|------|------------|------|
| Sensory | 直近入力（画像・音声） | 秒単位 | インメモリ |
| Short-term | 現在セッション | セッション中 | コンテキストウィンドウ |
| Long-term | 知識・事実 | 永続 | ベクトルDB |
| Episodic | 過去の会話・行動 | 長期（pruning対象） | PostgreSQL + ベクトルDB |

## 長期記憶（ベクトルDB）実装

```python
# 保存すべき情報の例
- ユーザーの好み・スタイル
- 過去の決定とその理由
- ドメイン知識の断片
- エラーパターンと解決策

# 保存しない情報
- 中間的な計算結果
- 一時的なコンテキスト
- 個人情報（プライバシー）
```

## セッション状態の永続化

- Redis: 短期セッション（TTL 24h）・高速読み書き
- PostgreSQL: 長期状態・トランザクション保証
- スキーマ例:
  ```sql
  sessions(id, agent_id, created_at, state_json)
  tool_calls(id, session_id, tool_name, args, result, timestamp)
  ```

## ツール呼び出し履歴の管理

- 全ツール呼び出しをログ（tool名・引数・結果・latency）
- 同じ引数での重複呼び出しをキャッシュで防ぐ
- 失敗したツール呼び出しは理由と共に記録

## 記憶の優先度付けと整理

- 重要度スコア: アクセス頻度 × 最終アクセス時刻 × 明示的フラグ
- ガベージコレクション: スコア下位10%を月次削除
- Compression: 古いエピソード記憶は要約して圧縮保存
- Privacy: PII は暗号化または自動マスキング後に保存

## 実装チェックリスト

- [ ] 記憶の層ごとにストレージを分離
- [ ] TTL・容量上限の設定
- [ ] 記憶の検索精度をRAGASで評価
- [ ] 記憶への書き込みに非同期処理を使用
- [ ] プライバシーポリシーとの整合確認
