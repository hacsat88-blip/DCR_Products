# Autotrader — 東証プライム短期売買アプリ

楽天証券 MarketSpeed II RSS を使ったローカルルール主導の短期売買アプリ。
Codex Advisor は売買判断ではなく、撤退判断・ログ分析・ルール改善メモだけを返す参謀として使う。

## 構成

```
Product/autotrader/
├── server/                    # Python FastAPI (SP-1延長 + SP-2a)
│   ├── main.py                # エントリーポイント
│   ├── capital_router.py      # 資金量→ティア切替
│   ├── technical_filter.py    # エントリー前フィルタ
│   ├── risk_guard.py          # 負けない仕様の核心
│   ├── codex_advisor.py       # Codex Advisor（助言・警告のみ、売買判断禁止）
│   └── tests/                 # pytest テスト群
├── vba/
│   └── AutoTrader.bas         # Excel VBA 発注 + パスワード自動入力 (SP-2b)
├── ui/                        # Next.js ダッシュボード (SP-3)
│   └── src/components/Dashboard.tsx
└── requirements.txt
```

## 起動方法

初心者向けの Excel 設定、Codex app-server、起動順序、注意点は
[Excel + Codex app-server 設定手順](docs/EXCEL_CODEX_APP_SERVER_SETUP.md) を参照。

API、Next.js ダッシュボード、Excel をまとめて起動する場合:

```bat
start_autotrader.bat
```

```bash
# Python サーバー
cd Product/autotrader
pip install -r requirements.txt
uvicorn server.main:app --reload --port 8000

# テスト実行
pytest server/tests/ -v

# Next.js UI（SP-3）
cd ui
npm install
npm run dev  # → http://localhost:3000
```

## Codex Advisor セットアップ

1. `codex login` を実行し、同じ Windows ユーザーの `~/.codex/auth.json` に認証を置く
2. `.env.example` を参考に、未追跡の `.env` またはユーザー環境変数へ `AUTOTRADER_CODEX_COMMAND=codex` を設定する
3. `AUTOTRADER_CODEX_MODEL` は空なら Codex CLI の既定モデルを使う。固定したい場合だけモデル名を入れる
4. Codex Advisor は `codex app-server --listen stdio://` を子プロセス起動して使う
5. Codex Advisor の失敗・タイムアウト時は新規建て禁止に倒す

`~/.codex/auth.json` は API key と同等に扱う。Git 管理、ログ出力、配布物への同梱は禁止。

Codex Advisor の返答は参考情報に限定する。`buy` / `sell` / `hold` や confidence は返さず、以下だけを返す。

```json
{
  "risk_state": "GREEN | YELLOW | RED",
  "should_stop_new_entries": true,
  "should_reduce_size": true,
  "reason": "短い理由",
  "rule_issue": "見つかったルール上の弱点",
  "improvement": "明日以降の改善案"
}
```

発注可否、停止、損切り、利確、当日終了は `RiskGuard` と VBA 側のローカルルールで決定する。

## VBA セットアップ（SP-2b）

1. `vba/AutoTrader.bas` を `autotrader.xlsm` にインポート
2. Excel で `SetupPassword()` を実行して取引パスワードを登録（XOR難読化で保存）
3. `OnPriceUpdate()` を MarketSpeed II RSS の5秒更新イベントに紐付け
4. 代替案: 楽天証券の「取引暗証番号省略設定」を有効化（最もシンプル）

`AutoTrader.bas` は VBA エディタのインポート向けに CP932 / Shift_JIS で保存する。UTF-8 のままインポートすると、日本語コメントや日本語メッセージが文字化けして構文エラーになることがある。

Codex Advisor 改修後は `.xlsm` 本体を直接更新していないため、最新の `vba/AutoTrader.bas` を再インポートすること。

## 負けない仕様（RiskGuard）

| ルール | 値 |
|------|-----|
| 1日最大損失 | -¥3,000 → 全ポジ強制決済 + 取引停止 |
| 利益目標 | +¥5,000 → 本日取引終了 |
| 1トレード損切り | -¥2,000 |
| リワード/リスク比 | 1.5以上のみエントリー |
| 同時保有上限 | 2銘柄 |
| 最大保有時間 | 60分（超過で時間切れ成行売り） |
| 新規エントリー禁止 | 14:50以降 |
| 連敗制限 | 2連敗で新規建て禁止 |
| app-server失敗時 | Codex Advisor エラー/タイムアウト時は新規建て禁止 |

## 資金量ティア（CapitalRouter）

| 余力 | ティア | 対象株 | 最大1注文 |
|-----|------|------|---------|
| ～50万円 | SMALL | 時価総額300億以下 | ¥100,000 |
| 50〜100万円 | MID | 時価総額1000億以下 | ¥200,000 |
| 100万円〜 | LARGE | 出来高上位大型株 | ¥300,000 |

## シミュレーションモード

`POST /api/simulation/on` で有効。発注直前で止めて、ローカルルールと Codex Advisor の警告ログを確認する。
最初の2週間はシミュレーションモードで動かすことを強く推奨。
