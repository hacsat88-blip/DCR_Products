# Excel + Codex app-server 設定手順

この手順書は、Excel VBA を主体に自動売買を動かし、Codex app-server はリスク助言だけに使うための初心者向けセットアップです。

大事な前提として、Codex は発注者ではありません。買う、売る、保有する、損切りする、当日終了する、といった最終判断は VBA と FastAPI サーバー内のローカルルールだけで決めます。Codex app-server は「今日のリスク状態」「新規建てを止めるべきか」「明日以降の改善メモ」を返す参謀役です。

## 全体像

```
MarketSpeed II RSS
  ↓
Excel / VBA
  ↓  http://localhost:8000/api/price
Python FastAPI
  ↓
RiskGuard / TechnicalFilter / CapitalRouter
  ↓
Codex app-server（助言だけ）
  ↓
Excel が local action に従って発注
```

Codex app-server が失敗した場合、システムは安全側に倒します。つまり新規買いは止めます。

## 1. 事前に用意するもの

- Windows PC
- Excel デスクトップ版
- 楽天証券 MarketSpeed II
- MarketSpeed II RSS が使える状態
- Python
- Node.js / npm
- Codex CLI / Codex app
- このフォルダ: `C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader`

## 2. Codex app-server のログイン確認

PowerShell またはコマンドプロンプトを開きます。

```powershell
codex login
```

ログインが終わると、通常は次のファイルが作られます。

```text
C:\Users\<ユーザー名>\.codex\auth.json
```

この `auth.json` は API キーと同じくらい重要です。Git に入れたり、誰かに渡したり、スクリーンショットで見せたりしないでください。

動作確認として、次のコマンドで Codex が見つかるか確認します。

```powershell
where codex
```

何も表示されない場合は、Codex CLI が PATH に入っていません。その場合は Codex のインストールまたは PATH 設定を先に直します。

## 3. `.env` を設定する

`Product\autotrader` にある `.env.example` を参考に、同じフォルダへ `.env` を置きます。

最低限は以下で動きます。

```text
AUTOTRADER_CODEX_COMMAND=codex
AUTOTRADER_CODEX_MODEL=
AUTOTRADER_ADVISOR_TIMEOUT=3
AUTOTRADER_CODEX_CWD=
AUTOTRADER_DB_PATH=data/autotrader.db
```

各項目の意味は次の通りです。

| 項目 | 意味 |
|---|---|
| `AUTOTRADER_CODEX_COMMAND` | Codex CLI のコマンド名。通常は `codex` |
| `AUTOTRADER_CODEX_MODEL` | 空なら Codex 側の既定モデルを使う |
| `AUTOTRADER_ADVISOR_TIMEOUT` | Codex 助言を待つ秒数。失敗時は新規建て禁止 |
| `AUTOTRADER_CODEX_CWD` | app-server の作業フォルダ。空なら autotrader フォルダ |
| `AUTOTRADER_DB_PATH` | ログ保存用 SQLite DB |

`.env` は秘密情報やローカル設定を含むので、Git 管理しません。

## 4. Python サーバーを準備する

PowerShell で autotrader フォルダへ移動します。

```powershell
cd C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader
pip install -r requirements.txt
```

サーバーを起動します。

```powershell
python -m uvicorn server.main:app --port 8000
```

ブラウザで次を開き、JSON が表示されればサーバーは動いています。

```text
http://localhost:8000/api/status
```

## 5. UI ダッシュボードを準備する

別の PowerShell を開きます。

```powershell
cd C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader\ui
npm install
npm run dev
```

ブラウザで次を開きます。

```text
http://localhost:3000
```

ダッシュボードでは、損益、保有数、シミュレーション状態、Codex 助言、リスク警告を確認します。

## 6. まとめて起動する場合

通常は次のバッチを使えます。

```text
C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader\start_autotrader.bat
```

このバッチは次を順に行います。

1. `python`、`npm`、`codex` の有無を確認
2. FastAPI サーバーを `127.0.0.1:8000` で起動
3. API の応答を待機
4. Next.js ダッシュボード UI を `127.0.0.1:3000` で起動
5. UI の応答を待機
6. ブラウザでダッシュボードを開く
7. `autotrader.xlsm` を開く

止めるときは、次の停止バッチを使います。

```text
C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader\stop_autotrader.bat
```

ブラウザや Excel を開きたくない場合は、PowerShell から次のように起動できます。

```powershell
.\start_autotrader.ps1 -NoBrowser -NoExcel
```

## 7. Excel ブックの安全設定

Excel 側でマクロが動くようにします。

1. Excel を開く
2. `ファイル` → `オプション`
3. `トラスト センター`
4. `トラスト センターの設定`
5. `マクロの設定`
6. 自分のローカル検証中だけ、VBA マクロを実行できる設定にする

毎回警告が出る場合は、`Product\autotrader` フォルダを信頼できる場所に追加します。

1. `トラスト センターの設定`
2. `信頼できる場所`
3. `新しい場所の追加`
4. `C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader` を追加

この設定は自分の PC 内の開発フォルダに限定してください。ダウンロード直後の不明な Excel ファイルを無条件で信頼しないでください。

## 8. VBA を Excel に入れる

`.xlsm` 本体は自動更新していません。コード変更後は、次のファイルを Excel に再インポートします。

```text
C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader\vba\AutoTrader.bas
```

手順:

1. `autotrader.xlsm` を開く
2. `Alt + F11` で VBA エディタを開く
3. 左側のプロジェクトで対象ブックを選ぶ
4. 既存の `AutoTrader` モジュールがあれば削除または置き換え
5. `ファイル` → `ファイルのインポート`
6. `vba\AutoTrader.bas` を選ぶ
7. 保存する

`AutoTrader.bas` は VBA インポート用に CP932 / Shift_JIS で保存しています。UTF-8 で保存し直すと、日本語コメントや日本語メッセージが文字化けしてエラーになることがあります。

`ThisWorkbook.cls` には、ブックを開いたときに `StartAutoTrader`、閉じるときに `StopAutoTrader` を呼ぶ処理があります。自動起動が不要な場合は、VBA エディタで `Workbook_Open` の呼び出しを外します。

## 9. Excel シートを用意する

### `WatchList` シート

VBA は `WatchList` シートを読みます。

| 列 | 内容 | 例 |
|---|---|---|
| A | 銘柄コード | `7203` |
| B | 現在値 | `2310` |
| C | 出来高 | `1500000` |
| D | 前日終値 | `2280` |
| G | サーバーが返した action | VBA が書き込み |
| H | 最終更新時刻 | VBA が書き込み |

MarketSpeed II RSS から A-D 列へ値が入るようにします。B-D 列に数値が入っていないと、正しい判定ができません。

### `Config` シート

`Config` シートの `B1` に利用可能資金を入れます。

```text
Config!B1 = 600000
```

この値で SMALL / MID / LARGE の資金ティアが決まります。

### `Secure` シート

`Secure` シートは `SetupPassword()` 実行時に自動作成されます。取引パスワードを簡易難読化して保存します。

これは強い暗号化ではありません。PC 自体のロック、Excel ファイルの管理、証券口座側の安全設定を優先してください。

## 10. 取引パスワードを登録する

Excel の VBA エディタまたはマクロ一覧から次を実行します。

```vb
SetupPassword
```

初回だけ取引パスワードを入力します。

楽天証券側で「取引暗証番号省略設定」を使う場合は、このパスワード入力処理を使わない運用もできます。その場合でも、最初は必ずシミュレーションで確認してください。

## 11. 起動順序

初回は手動で順番に起動する方が原因を切り分けやすいです。

1. MarketSpeed II を起動してログイン
2. RSS が Excel に値を流せる状態にする
3. `python -m uvicorn server.main:app --port 8000` を起動
4. `http://localhost:8000/api/status` を確認
5. `npm run dev` で UI を起動
6. `http://localhost:3000` を確認
7. Excel の `WatchList` と `Config` を確認
8. Excel で `StartAutoTrader` を実行

慣れてきたら `start_autotrader.bat` でまとめて起動できます。

## 12. シミュレーションモード

初期状態はシミュレーションモードです。シミュレーション中は、サーバーが `buy` / `sell` を返しても VBA は発注しません。

UI のボタン、または次の API で切り替えます。

```text
POST http://localhost:8000/api/simulation/on
POST http://localhost:8000/api/simulation/off
```

最初の 2 週間は `on` のまま、ログと Codex 助言を確認する運用を推奨します。

## 13. Codex app-server はいつ呼ばれるか

このアプリでは、Codex app-server は Python サーバーから子プロセスとして呼ばれます。

内部的には次のコマンド相当です。

```powershell
codex app-server --listen stdio://
```

Excel が直接 Codex を呼ぶわけではありません。

Excel は `localhost:8000/api/price` へ価格を送ります。Python サーバーがローカルルールを確認し、新規エントリー候補のときだけ Codex Advisor にリスク助言を聞きます。

Codex が返してよいのは次の形式だけです。

```json
{
  "risk_state": "GREEN",
  "should_stop_new_entries": false,
  "should_reduce_size": false,
  "reason": "短い理由",
  "rule_issue": "見つかったルール上の弱点",
  "improvement": "明日以降の改善案"
}
```

Codex の返答に `buy`、`sell`、`hold`、`confidence` は使いません。

## 14. 安全ルール

このアプリは、利益を最大化するよりも大きく負けないことを優先します。

| 状況 | 動作 |
|---|---|
| API エラー | VBA 側で `hold` に倒す |
| Codex app-server エラー | 新規建て禁止 |
| Codex timeout | 新規建て禁止 |
| 1日最大損失到達 | 取引停止 |
| 2連敗 | 新規建て禁止 |
| 利益目標到達 | 原則本日終了 |
| 14:50 以降 | 新規エントリー禁止 |
| 保有中の損切り条件到達 | エントリー用フィルタより優先して売り |

Codex の助言が GREEN でも、ローカルルールが止めたら発注しません。

## 15. よくあるトラブル

### `http://localhost:8000/api/status` が開けない

Python サーバーが起動していません。

```powershell
cd C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader
python -m uvicorn server.main:app --port 8000
```

### Excel がずっと `hold` になる

次を確認します。

- シミュレーションモードが `on` ではないか
- `WatchList` の A-D 列に値が入っているか
- `Config!B1` に利用可能資金が入っているか
- 14:50 以降ではないか
- 2連敗や日次損失で新規建て禁止になっていないか
- Codex app-server エラーで新規建て禁止になっていないか

### `WatchList` の H 列時刻が5秒ごとに変わらない

次を確認します。

- 最新の `vba\AutoTrader.bas` を Excel に再インポートしたか
- Excel で `StartAutoTrader` を実行したか
- `WatchList` の A 列に銘柄コードが入っているか
- 空白行や A 列が空の行を見ていないか
- マクロ実行中に VBA エラー画面で止まっていないか

H 列は、A 列に銘柄コードが入っている行だけ更新します。API や Codex Advisor が失敗しても、該当行は `hold` に倒して H 列の時刻を更新します。

### Codex app-server エラーになる

次を確認します。

```powershell
where codex
codex login
```

さらに、次のファイルがあるか確認します。

```text
C:\Users\<ユーザー名>\.codex\auth.json
```

`AUTOTRADER_ADVISOR_TIMEOUT=3` が短すぎる場合は、まず `5` から `10` に伸ばして様子を見ます。ただし、長くしすぎると価格更新のリズムに合わなくなります。

### MarketSpeed II に発注できない

次を確認します。

- MarketSpeed II が起動しているか
- ログイン済みか
- RSS が有効か
- 取引暗証番号省略設定を使うか、`SetupPassword()` を済ませたか
- 最初は必ずシミュレーションで発注直前まで確認したか

### マクロが動かない

Excel のトラストセンター設定、ファイルのブロック解除、信頼できる場所を確認します。

## 16. 本番前チェックリスト

- [ ] `http://localhost:8000/api/status` が開ける
- [ ] `http://localhost:3000` が開ける
- [ ] `codex login` 済み
- [ ] `.codex\auth.json` を外部に出していない
- [ ] `.env` が Git 管理されていない
- [ ] Excel の `WatchList` A-D 列に値が入る
- [ ] `Config!B1` に利用可能資金が入っている
- [ ] `SetupPassword()` または証券側の暗証番号省略設定を確認済み
- [ ] まずシミュレーションモードでログ確認済み
- [ ] Codex 助言だけで発注しない設計を理解済み

## 17. 停止方法

Excel 側:

```vb
StopAutoTrader
```

サーバー側:

起動中の PowerShell / コマンドプロンプトで `Ctrl+C` を押します。

強制終了する前に、MarketSpeed II 側の未約定注文と保有状況を必ず確認してください。
