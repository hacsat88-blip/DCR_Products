# Autotrader — 東証プライム短期売買アプリ

楽天証券 MarketSpeed II RSS を使った AI 自動売買アプリ。

## 構成

```
Product/autotrader/
├── server/                    # Python FastAPI (SP-1延長 + SP-2a)
│   ├── main.py                # エントリーポイント
│   ├── capital_router.py      # 資金量→ティア切替
│   ├── technical_filter.py    # エントリー前フィルタ
│   ├── risk_guard.py          # 負けない仕様の核心
│   ├── ai_trader.py           # Claude API 売買判断
│   └── tests/                 # pytest テスト群
├── vba/
│   └── AutoTrader.bas         # Excel VBA 発注 + パスワード自動入力 (SP-2b)
├── ui/                        # Next.js ダッシュボード (SP-3)
│   └── src/components/Dashboard.tsx
└── requirements.txt
```

## 起動方法

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

## VBA セットアップ（SP-2b）

1. `vba/AutoTrader.bas` を `autotrader.xlsm` にインポート
2. Excel で `SetupPassword()` を実行して取引パスワードを登録（XOR難読化で保存）
3. `OnPriceUpdate()` を MarketSpeed II RSS の5秒更新イベントに紐付け
4. 代替案: 楽天証券の「取引暗証番号省略設定」を有効化（最もシンプル）

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

## 資金量ティア（CapitalRouter）

| 余力 | ティア | 対象株 | 最大1注文 |
|-----|------|------|---------|
| ～50万円 | SMALL | 時価総額300億以下 | ¥100,000 |
| 50〜100万円 | MID | 時価総額1000億以下 | ¥200,000 |
| 100万円〜 | LARGE | 出来高上位大型株 | ¥300,000 |

## シミュレーションモード

`POST /api/simulation/on` で有効。発注直前で止めてAI判断精度を確認する。
最初の2週間はシミュレーションモードで動かすことを強く推奨。
