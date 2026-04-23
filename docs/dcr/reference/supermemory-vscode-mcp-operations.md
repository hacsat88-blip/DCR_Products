# Supermemory VS Code MCP Operations

## Purpose

VS Code で supermemory を運用する際の最小設定と、サトシ開発向けの推奨運用を定義する。

## Minimal MCP Config

OAuth 利用:

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp"
    }
  }
}
```

API key 利用:

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "Authorization": "Bearer sm_your_api_key_here"
      }
    }
  }
}
```

## Recommended Project Scope

混線防止のため、project header を固定する。

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "x-sm-project": "satoshi-dev"
      }
    }
  }
}
```

## Runtime Behavior

### Session Start

1. context を取得
2. project_profile を先頭へ短文注入
3. 方針差分が大きい場合だけ Y/N 確認

### During Conversation

1. 通常要点は自動保存
2. 7カテゴリは保存確認
3. 重要な設計差分は guard event として記録

### Review Workflow

1. 過去方針を参照して観点を初期化
2. 実コードと検証結果を一次情報として判定
3. 判定理由を短文で残す

## User Prompts

省力モードでの表示文例:

- 通常保存:
  - 「要点をプロジェクトメモリに保存しました」
- 保存確認:
  - 「保存候補があります。保存しますか？ Y/N」
- 通常参照:
  - 「前回の関連セッション要点を参照しました」
- 参照確認:
  - 「関連履歴があります。今回参照しますか？ Y/N」

## Guardrail Rules

確認対象カテゴリ:

1. 秘密情報
2. 個人情報
3. 本番環境操作
4. 金銭、契約、法務判断
5. 重要方針変更
6. 改修方針変更
7. レビュー方針変更

## Incident Response

- 誤保存を検知したら forget を優先
- 重大誤参照が発生した場合は project scope を再確認
- 原因がルール不足なら spec に追記して再発防止

## Success Metrics

- 同一説明の再入力回数
- Y/N 発生率と承認率
- 誤保存の修正件数
- レビュー初動時間の短縮
