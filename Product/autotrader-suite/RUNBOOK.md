# AutoTrader Live Ops Runbook

AutoTrader の実運用は、execution 系を workbook、decisioning と health を backend、監視を dashboard が担当する前提で進める。

- workbook の正本: repo root の `autotrader.xlsm`
- broker / RSS の正本: MarketSpeed II
- operator 向け UI: `Product/autotrader-suite/ui`
- 最終的な broker 実行結果の正本: workbook の Log シートと `Control!B15`

## Roles

- Excel workbook: RSS 価格取得、broker preflight、live 発注ブリッジ
- backend: AI 判断、risk guard、shared health、WebSocket 配信
- dashboard: health、tick 状態、live / broker auto / armed の監視

## Startup Order

0. `powershell -ExecutionPolicy Bypass -File .\Product\autotrader-suite\check-live-readiness.ps1` を実行し、`blocked` が 0 件であることを確認する。
1. MarketSpeed II を起動し、手動ログインして RSS が `接続中`、発注系が `発注可` になっていることを確認する。
2. backend を起動する。
3. dashboard UI を起動する。
4. repo root の `autotrader.xlsm` を開く。
5. workbook open 後、`Control!B10=paper`、`Control!B11=stub only`、`Control!B16=FALSE` を確認する。
6. `Control!B18:B21` の preflight 表示と dashboard の health summary が読み出せることを確認する。

## Pre-Open Readiness

最初に local checker を実行する。

```powershell
powershell -ExecutionPolicy Bypass -File .\Product\autotrader-suite\check-live-readiness.ps1
```

- `ok`: local prerequisite は通過
- `warning`: local prerequisite は通過。ただし表示された warning を operator が確認する
- `blocked`: live / paper どちらも進めず、最初に blocker を解消する

### Workbook Checks

- `Control!B10`: 初期値は `paper`
- `Control!B11`: 初期値は `stub only`
- `Control!B13`: この session の tick が来たら更新される
- `Control!B14`: backend 応答後に更新される
- `Control!B15`: `-` を維持する。client/server error が出たら live は止める
- `Control!B16`: live arm switch。paper smoke が終わるまでは `FALSE`
- `Control!B18`: broker preflight status。live 前は `ready` 必須
- `Control!B19`: 実余力。live 前は数値必須
- `Control!B20`: broker checked at。current session の時刻であること
- `Control!B21`: broker message。`RssCapacityList ok` 系メッセージを確認する

### Dashboard Checks

- `status`: `healthy` が理想
- `ai_status`: `ready` 必須
- `reference_status`: `ready` が理想。degraded は live では止める
- `last_warning`: 直近 warning があれば内容を確認する
- connection state: `waiting-first-tick` は初回待ち、`stale` / `reconnecting` は live を止める
- mode summary: workbook 設定に応じて `paper` / `live`、`stub only` / `broker auto` / `armed` が一致すること

## Go / No-Go Matrix

| Signal | Paper | Live | Action |
| --- | --- | --- | --- |
| MarketSpeed II 未ログイン / RSS 未接続 | No-Go | No-Go | MarketSpeed II 側を復旧する |
| dashboard が health を読めない | No-Go | No-Go | backend / UI 到達性を復旧する |
| `waiting-first-tick` のまま | Wait | Wait | workbook tick 到着を待つ |
| `stale` / `reconnecting` | No-Go | No-Go | feed または socket を復旧する |
| `status=healthy`, `ai_status=ready`, `reference_status=ready` | Go | Go | 通常どおり進める |
| `ai_status=degraded` | Go | No-Go | paper のみ許可。live は止める |
| `reference_status=degraded` | Go | No-Go | advisory 不足。small live では止める |
| `last_warning` が advisory 系のみ | Go | Review | warning の種類を確認する |
| `Control!B15` が `-` 以外 | Review | No-Go | workbook/client error を解消する |
| `Control!B18<>ready` | Review | No-Go | broker preflight を再実行する |
| `Control!B19` が空欄 / 非数値 / 0 以下 | Review | No-Go | 余力取得を確認する |
| `Control!B20` が古い | Review | No-Go | preflight を current session で再実行する |
| `Control!B21` が異常メッセージ | Review | No-Go | RSS / broker 側を復旧する |

`Review` は、その場で原因を確認してから operator が再判定する状態を意味する。small live の初回 smoke では、`Review` を実質 `No-Go` として扱う。

## Paper Smoke Before Live

1. `Control!B10=paper`、`Control!B11=stub only`、`Control!B16=FALSE` を確認する。
2. 対象銘柄を `Market!A2` に設定する。
3. `modTimer.RunBrokerPreflight` を実行し、`Control!B18:B21` を更新する。
4. `modTimer.StartTimer` を開始する。
5. 次を確認する。
   - `Control!B13` が current session の timestamp に更新される
   - `Control!B14` が backend 応答で更新される
   - `Control!B15` が `-` のまま
   - dashboard が `waiting-first-tick` を抜け、`stale` にならない
6. Log シートに `BUY_STUB` / `SELL_STUB` または `hold` 相当の記録が流れることを確認する。
7. `modTimer.StopTimer` を実行して 1 回停止確認する。

paper smoke が通らない限り live に進まない。

## Live Go / No-Go Decision

live に進んでよいのは、次をすべて満たしたときだけ。

1. paper smoke が同じ session で通っている
2. dashboard health が `healthy`
3. `ai_status=ready`
4. `reference_status=ready`
5. `Control!B15=-`
6. `Control!B18=ready`
7. `Control!B19` が十分な実余力を示す数値
8. `Control!B20` が current session の時刻
9. `Control!B21` が `RssCapacityList ok` 系メッセージ

## Live Enablement

1. `Control!B10` を `live` に変更する。
2. `Control!B11` を `broker auto` に変更する。
3. `Control!B16` はまだ `FALSE` のままにする。
4. `modTimer.RunBrokerPreflight` を再実行する。
5. dashboard が `live` と `broker auto` を反映し、health が `healthy` のままなことを確認する。
6. 最後に `Control!B16=TRUE` にする。

## First Small Live Smoke

1. 数量は最小に寄せる。
2. `modTimer.StartTimer` を開始する。
3. workbook Log と dashboard を同時に監視する。
4. 正常時は Log に `BUY_LIVE` / `SELL_LIVE` が出て、reason に `RSS order confirmed` が残る。
5. 異常時は Log に `*_LIVE_ERROR` が出るか、`Control!B15` に error が残るので、その場で live を止める。

## Shutdown Order

1. `modTimer.StopTimer` を実行する。
2. `Control!B16=FALSE` に戻す。
3. 必要なら `Control!B10=paper`、`Control!B11=stub only` に戻す。
4. dashboard で新規 tick が止まったことを確認する。
5. workbook を閉じる。
6. UI と backend を停止する。

## Emergency Stop

優先順は次のとおり。

1. `modTimer.StopTimer`
2. `Control!B16=FALSE`
3. workbook close
4. MarketSpeed II 側で注文状態を確認する
5. backend / UI は最後に止める

## Incident Triage

### `Market!B2:G2` が `#NAME?`

- MarketSpeed II RSS add-in が current session に読み込めていない可能性が高い
- workbook を開き直し、MarketSpeed II を先に起動する
- それでも解消しない場合は workbook 再生成または VBA 再同期を疑う

### `Control!B18=degraded` または `Control!B19=-`

- `modTimer.RunBrokerPreflight` を再実行する
- MarketSpeed II のログイン状態と `発注可` を確認する
- `Control!B21` のメッセージを最初に確認する

### dashboard が `stale` または `reconnecting`

- backend が動いているか確認する
- workbook timer が止まっていないか確認する
- socket 経路ではなく Excel 側の tick 停止の可能性も切り分ける

### `Control!B15` に error が残った

- live は止める
- Log シートの直近行と `Control!B21` を確認する
- `paper` / `stub only` に戻して再度 paper smoke からやり直す