# AutoTrader Suite

AutoTrader の canonical workspace です。backend、UI、VBA text source を `Product/autotrader-suite/` 配下に集約し、runtime workbook は repo root の `autotrader.xlsm` を使います。

## Canonical Paths

- backend: `Product/autotrader-suite/backend`
- UI: `Product/autotrader-suite/ui`
- VBA text source / generator: `Product/autotrader-suite/vba`
- runtime workbook: `autotrader.xlsm`
- operator runbook: `Product/autotrader-suite/RUNBOOK.md`

## Quick Start

1. backend 依存を用意し、必要なら `Product/autotrader-suite/backend/.env.example` を `.env` に複製して `GOOGLE_API_KEY` と `JQUANTS_API_KEY` を設定します。
2. backend を `Product/autotrader-suite/backend` で起動します。
3. UI で `Product/autotrader-suite/ui/.env.local.example` を `.env.local` に複製し、`NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL` を backend URL に合わせます。
4. UI を `Product/autotrader-suite/ui` で起動します。
5. workbook を `Product/autotrader-suite/vba/new-autotrader-workbook.ps1` で再生成し、必要なら Excel から `modTimer.StartTimer` を実行します。
6. live 前は `powershell -ExecutionPolicy Bypass -File .\Product\autotrader-suite\check-live-readiness.ps1` を実行し、`ok` または `warning` であることを確認します。

### Backend

```powershell
Push-Location "./Product/autotrader-suite/backend"
./.venv/Scripts/python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```

### UI

```powershell
Push-Location "./Product/autotrader-suite/ui"
npm run dev
```

### VBA Workbook

```powershell
powershell -ExecutionPolicy Bypass -File .\Product\autotrader-suite\vba\new-autotrader-workbook.ps1 -Force
```

## Operational Notes

- startup / shutdown / paper smoke / live go-no-go の canonical 手順は `Product/autotrader-suite/RUNBOOK.md` を使います。この README には要約だけを残します。
- live 前の local preflight は `Product/autotrader-suite/check-live-readiness.ps1` を使います。`blocked` は非ゼロ終了で、`warning` は exit 0 のまま注意事項だけを返します。
- browser live view は `/api/health` と `/api/settings` を Next.js proxy で参照しますが、`/ws` は browser から backend URL へ直接接続します。
- `poll_interval_sec` は backend settings の保持用です。実際の tick 送信間隔は workbook の `Control!B2` が正本です。
- `state.json` は backend root 配下を既定の保存先にし、cwd に依存しません。
- `settings.json` は backend root 配下に永続化され、`PUT /api/settings` の変更は再起動後も維持されます。
- J-Quants reference が stale の場合、execution は継続しますが health は degraded を維持します。
- live 発注を有効にするには workbook で `Run Mode=live`、`Order Mode=broker auto`、`Live Armed=TRUE` をそろえる必要があります。default は paper / stub only です。
- live 発注は MarketSpeed II RSS の注文関数と `RssOrderStatus` / `RssExecutionList` に依存します。実環境の発注可否は MarketSpeed II 側のログイン状態と RSS の `発注可` 状態に依存します。
- workbook には read-only の broker preflight があり、`modTimer.RunBrokerPreflight` と live 発注直前の両方で `RssCapacityList` を確認します。preflight が通らない場合、実注文は送らず stub に留めます。
- MarketSpeed II RSS の価格 feed は旧 `=RSS|...` 形式ではなく `RssMarket(...)` 系です。Market sheet の date/time/bid/ask は `現在日付` / `現在値時刻` / `最良買気配値` / `最良売気配値` を使い、workbook open 時に `%LOCALAPPDATA%\MarketSpeed2\Bin\rss` 配下の add-in を自動ロードして current session で有効化します。
- live 発注の約定反映は backend が返す `pending_execution_id` と一致した確認だけを 1 回だけ適用します。重複確認は duplicate として無害化されます。
- `AUTOTRADER_ALERT_WEBHOOK_URL` を設定すると、live 約定成功/失敗に加えて AI degraded、reference degraded、risk blocked の遷移時に webhook alert を送ります。
- backend / UI の live 表示は workbook がその tick で申告した設定状態です。実際の broker 応答結果は Log シートと Control!B15 を正本として確認します。

## Live Enablement

live 前は、まず `Product/autotrader-suite/RUNBOOK.md` の paper smoke を通します。

最低条件だけ書くと、live は workbook の `B10=live`、`B11=broker auto`、`B16=TRUE` に加えて、`B18=ready`、`B19` の実余力数値、dashboard health=`healthy` が揃ったときだけ許可します。詳細な go/no-go、shutdown、incident triage は runbook を正本とします。

## Verification

```powershell
Push-Location "./Product/autotrader-suite/backend"
./.venv/Scripts/python.exe -m pytest tests -q

Push-Location "../ui"
npx vitest run --reporter=verbose
npm run build

Pop-Location
Pop-Location

powershell -ExecutionPolicy Bypass -File .\validate.ps1
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Check
```

詳細は `Product/autotrader-suite/ui/README.md` と `Product/autotrader-suite/vba/README.md` を参照します。
