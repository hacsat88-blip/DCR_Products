---
name: codex-app-server-integration
routing_category: devops
description: "Codex app-server 組み込み設計。codex CLI、app-server、JSON-RPC over stdio、auth.json、BYO ChatGPT subscription、SDK/exec/app-serverの使い分け、GUI/バックエンド連携、timeout/fail-closed/sandbox/approval/schema drift を扱う時は必ず使う。"
disable-model-invocation: true
contract:
  preconditions:
    - "Codex app-server、codex CLI、または ChatGPT subscription 認証をアプリから利用する"
    - "SDK / exec / app-server の選定、設計レビュー、運用手順、または実装修正が必要"
  postconditions:
    - "SDK / exec / app-server の選定理由が用途軸で説明されている"
    - "auth.json、OSユーザー境界、外部公開禁止、ログ出力禁止の扱いが明確"
    - "JSON-RPC stdio、timeout、プロセス終了、schema drift、fail-closed の実装リスクを確認している"
  invariants:
    - "Codex app-server をHTTP公開や共有サービスとして素で晒さない"
    - "~/.codex/auth.json、API key、OAuth token をGit、ログ、成果物に入れない"
    - "app-server の出力を最終実行権限に直結させず、重要操作はローカルルールまたは承認で制御する"
composable:
  input_type: implementation-plan
  output_type: integration-checklist
  chains_with:
    - structured-output
    - streaming-design
    - security-scan
    - documents-ops
metadata:
  origin: local-dcr
  reference_url: "https://note.com/masa_wunder/n/n53f45b621510"
  imported_at: "2026-05-17"
  adapted_from: "Codex app-server integration lessons from autotrader and public app-server implementation notes; no external code imported."
  model_neutral: true
  runtime_targets:
    - codex
    - claude
    - cursor
    - copilot
    - gemini-cli
---

# Codex App-Server Integration

## 目的

Codex app-server を、アプリ内の安全な補助エンジンとして組み込むための設計・実装・レビュー手順をまとめる。

この skill は Codex 開発で最も強く効くが、DCR 共通資産として他の CLI/IDE でも読めるようにする。Codex 以外の環境では、実行ではなく設計レビュー、移植判断、チェックリストとして使う。

## 使い分け

| 方式 | 向いている用途 | 避ける用途 |
|---|---|---|
| `codex exec` | CI、cron、単発要約、ワンショット変換 | 進捗表示、承認往復、長い対話 |
| SDK | Node/Python など同一ランタイム内の関数呼び出し | GUIから言語非依存に双方向制御したい場合 |
| app-server | GUI、デスクトップアプリ、別言語クライアント、streaming、承認往復 | HTTP公開、単純なワンショット、低遅延の同期制御 |

app-server は `codex` CLI に同梱される JSON-RPC 2.0 over stdio の子プロセス入口として扱う。

```powershell
codex app-server --listen stdio://
```

## 認証境界

- `codex login` 済みの OS ユーザーで起動する。
- 認証実体は通常 `~/.codex/auth.json` にある。
- `stdio://` 運用では、境界は OS ユーザー、プロセス権限、ローカルファイル権限で考える。
- WebSocket transport には `--ws-auth` や token/secret オプションがあるが、マルチテナント公開基盤として扱わない。
- `auth.json` は API key と同等に扱い、Git、ログ、スクリーンショット、配布物へ出さない。

配布アプリでは、作者が `auth.json` を預からない。ユーザー本人が `codex login` し、アプリはローカル子プロセスとして `codex` を spawn する。

## 基本実装チェック

1. `where codex` / `which codex` で CLI が見つかるか確認する。
2. `~/.codex/auth.json` の存在だけ確認し、中身を読まない・出力しない。
3. `codex app-server --listen stdio://` を子プロセスで起動する。
4. stdin へ 1 行 1 JSON の JSON-RPC request を書く。
5. stdout だけを protocol stream として読む。
6. stderr はログ扱いにし、JSONとしてパースしない。
7. request id と response id を対応付ける。
8. notification と server request を response と混同しない。
9. timeout と transport close を必ず実装する。
10. 終了時は子プロセスを terminate/kill する。

## JSON-RPC stdio ルール

- 改行区切りで 1 メッセージ。
- JSON文字列内に生の改行を入れない。
- request: `{"jsonrpc":"2.0","id":1,"method":"...","params":{...}}`
- response: `{"jsonrpc":"2.0","id":1,"result":{...}}` または `error`
- notification: `{"jsonrpc":"2.0","method":"...","params":{...}}`
- app-server からの承認 request には、その method に合った result を返す。

reader と writer は分ける。同期 `readline()` を直接 hot path に置くと、UIやAPIサーバ全体が固まる。

## Timeout と fail-closed

重要操作に app-server を挟む場合、timeout 後の既定動作を先に決める。

| 用途 | timeout時の推奨 |
|---|---|
| ドキュメント生成 | ユーザーに再試行を促す |
| コードレビュー補助 | レビューなしとして継続可否を明示 |
| 発注、支払い、削除など重要操作 | 実行しない / 新規操作を止める |
| GUIプレビュー | fallback表示にする |

app-server の返答を「最終権限」にしない。重要操作はローカルルール、既存の業務ルール、または人間の承認で決める。

## Sandbox と approval

- 自動処理では `approvalPolicy: never` と read-only sandbox を優先する。
- ファイル変更やコマンド実行を許す場合は、UI側に明確な承認導線を作る。
- 承認 request は method ごとに schema が違う可能性があるため、実体 schema を確認する。
- 権限を広げる時は、何を読めるか、何を書けるか、ネットワークに出るかを文書化する。

## Schema drift 対策

公式ドキュメント、記事、既存実装だけで固定しない。実装時点の CLI が出す schema を確認する。

```powershell
codex app-server generate-json-schema --out .tmp/codex-app-server-schema
```

実験的な method / field も使う可能性がある場合は、次も確認する。

```powershell
codex app-server generate-json-schema --experimental --out .tmp/codex-app-server-schema-experimental
```

確認する項目:

- method 名
- params の field 名
- approval response の形
- notification の delta field
- output schema 指定方法
- sandbox / approvalPolicy の field 名

schema をコード生成に使う場合は、生成物を正本にしない。正本は設計文書と手書きの安全ルール、生成物は検証材料として扱う。

## Review Checklist

- [ ] SDK / exec / app-server の選定理由が用途に合っている
- [ ] `auth.json` をログ・Git・例外メッセージに出していない
- [ ] app-server を素の HTTP サービスとして公開していない
- [ ] stdout と stderr を分離している
- [ ] request / response / notification / server request を分けて処理している
- [ ] timeout が実際に効く実装になっている
- [ ] 子プロセス終了時に pending request が解放される
- [ ] app-server 失敗時の fallback が安全側
- [ ] 重要操作の最終判断を app-server の返答だけに委ねていない
- [ ] 実体 schema を確認する導線がある
- [ ] README や運用手順に `codex login` と `auth.json` の注意がある

## DCR での扱い

- この skill の正本は `.ai/catalog/skills/codex-app-server-integration/SKILL.md`。
- `.codex/agents/`、`.agents/skills/` などの generated mirror を正本として編集しない。
- 共通化する場合は `.ai/catalog` に追加し、deploy/check で各 runtime へ反映する。
- Codex 以外の runtime では、app-server 実行ではなく設計・レビューの知識として使う。

## Example: 安全な助言用途

app-server にリスク分析や改善提案を依頼するのはよい。

```json
{
  "risk_state": "YELLOW",
  "reason": "連敗と損失上限接近",
  "improvement": "次回から2連敗で新規建てを止める"
}
```

ただし、この返答だけで発注、支払い、削除、デプロイを実行しない。実行可否はローカルルールまたは人間の承認で決める。
