---
name: rag-design
routing_category: devops
description: "RAGパイプライン設計：チャンキング戦略・ベクトルDB選定・ハイブリッド検索・リランキング・RAGAS評価"
disable-model-invocation: true
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - cursor
---

# RAG Design

## 基本原則

- Retrieval品質がGeneration品質を決定する
- チャンク設計は文書構造と検索クエリの両方を考慮する
- ハイブリッド検索（Dense+Sparse）は単一手法より常に優れる
- 評価指標を先に定義し、改善ループを回す

## チャンキング戦略

- **固定サイズ**: 512〜1024 tokens、overlap 10〜20%（均一文書向き）
- **セマンティック**: 段落・見出し・文境界に基づく（構造化文書向き）
- **階層型**: 親チャンク（要約）+ 子チャンク（詳細）の2層（精度重視）
- **Small-to-Big**: 検索は小チャンクで行い、コンテキストは親チャンクで供給

## ベクトルDB選定

| 規模 | 推奨 | 理由 |
|------|------|------|
| PoC | Chroma | 組み込み・設定不要 |
| 中規模 | Qdrant | パフォーマンス・フィルタ機能 |
| 大規模 | Pinecone / Weaviate | マネージド・スケーラビリティ |
| 既存PG | pgvector | 追加インフラ不要 |

## ハイブリッド検索設計

- Dense: `text-embedding-3-large` または `bge-m3`（多言語対応）
- Sparse: BM25（キーワード完全一致に強い）
- Fusion: RRF（Reciprocal Rank Fusion）でスコア統合
- 日本語: `multilingual-e5-large` または `intfloat/multilingual-e5`

## リランキング手法

1. Cohere Rerank API / cross-encoder モデル
2. 上位20件を取得 → リランキング → 最終5件
3. LLM-as-Reranker（コスト高：複雑クエリのみ）

## RAG評価指標（RAGAS）

- **Faithfulness**: 生成が取得文脈に忠実か（幻覚検出）
- **Context Recall**: 正解情報が取得できているか
- **Answer Relevance**: 回答がクエリに関連するか
- **Context Precision**: 取得チャンクが必要十分か

## よくある失敗パターン

- チャンクが大きすぎてコンテキスト汚染が起きる
- ベクトル検索だけでキーワード一致クエリに対応できない
- 評価なしで改善していると思い込む
