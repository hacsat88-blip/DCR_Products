---
name: structured-output
routing_category: devops
description: "LLM構造化出力設計：Pydantic/Zodスキーマ・JSON mode・Structured Outputs・バリデーション・型安全パース"
disable-model-invocation: true
---

# Structured Output

## 基本原則

- LLMの自由テキスト出力を直接パースしない（必ずスキーマで強制する）
- スキーマはドキュメントを兼ねる（フィールド説明を必ず書く）
- バリデーション失敗時のリトライロジックを設計に含める

## 手法の使い分け

| 手法 | 用途 | プロバイダ |
|------|------|-----------|
| JSON mode | 単純なJSON出力 | OpenAI, Anthropic |
| Structured Outputs | 厳密なスキーマ強制 | OpenAI gpt-4o以降 |
| Tool use / Function calling | ツール呼び出し形式 | 全主要プロバイダ |
| Instructor ライブラリ | Pydantic統合 | 全プロバイダ対応 |

## Pydantic スキーマ設計（Python）

```python
from pydantic import BaseModel, Field
from typing import Literal

class AnalysisResult(BaseModel):
    """コード分析の結果"""
    severity: Literal["low", "medium", "high", "critical"]
    issue_type: str = Field(description="問題の種類（例: security, performance）")
    description: str = Field(description="問題の詳細説明")
    line_number: int | None = Field(default=None, description="問題のある行番号")
    suggested_fix: str = Field(description="修正提案")
```

## Zod スキーマ設計（TypeScript）

```typescript
import { z } from "zod";

const AnalysisResult = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  issueType: z.string().describe("問題の種類"),
  description: z.string().describe("問題の詳細説明"),
  lineNumber: z.number().nullable().optional(),
  suggestedFix: z.string().describe("修正提案"),
});
```

## バリデーションエラーハンドリング

```python
import instructor
from anthropic import Anthropic

client = instructor.from_anthropic(Anthropic())

try:
    result = client.chat.completions.create(
        model="claude-opus-4-5",
        response_model=AnalysisResult,
        max_retries=3,  # バリデーション失敗時に自動リトライ
        messages=[{"role": "user", "content": prompt}],
    )
except instructor.exceptions.InstructorRetryException as e:
    # 3回失敗後のフォールバック処理
    handle_fallback(e)
```

## スキーマのバージョン管理

- スキーマ変更は後方互換を保つ（フィールド追加 OK、削除 NG）
- Breaking change はメジャーバージョンアップ
- 古いスキーマはDeprecation期間を設けてから削除

## 実装チェックリスト

- [ ] 全フィールドに `description` を設定
- [ ] `Optional` フィールドにはデフォルト値を設定
- [ ] バリデーション失敗のリトライ回数を設定（推奨: 3回）
- [ ] 最終失敗時のフォールバック処理を実装
- [ ] スキーマをAPIドキュメントと同期
