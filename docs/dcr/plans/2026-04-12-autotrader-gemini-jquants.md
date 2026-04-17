# AutoTrader Gemini Only And J-Quants Reference Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AutoTrader を Gemini only に統一しつつ、J-Quants 参照取得を backend と dashboard に実体化する。

**Architecture:** 売買判断の実行経路は Gemini のみを通し、Anthropic 依存と hybrid 合意ロジックを除去する。J-Quants は execution 価格とは別の reference snapshot として backend が非同期取得し、WebSocket payload と UI ViewModel を拡張して execution と reference を分離表示する。

**Tech Stack:** FastAPI, Pydantic v2, httpx, google-genai, pytest, Next.js 14, React 18, Vitest

---

### Task 1: Gemini only backend contract

**Files:**
- Modify: Product/autotrader-suite/backend/server/models.py
- Modify: Product/autotrader-suite/backend/server/main.py
- Modify: Product/autotrader-suite/backend/server/routes/price_feed.py
- Modify: Product/autotrader-suite/backend/server/engine/gemini_trader.py
- Modify: Product/autotrader-suite/backend/tests/test_price_feed.py
- Modify: Product/autotrader-suite/backend/tests/test_main.py
- Delete: Product/autotrader-suite/backend/server/engine/ai_trader.py
- Delete: Product/autotrader-suite/backend/tests/test_ai_trader.py
- Modify: Product/autotrader-suite/backend/requirements.txt
- Modify: Product/autotrader-suite/backend/requirements-lock.txt
- Modify: Product/autotrader-suite/backend/.env.example

- [ ] Step 1: 失敗する backend 契約テストを追加し、hybrid が通らないことと import が API key なしで成立することを固定する
- [ ] Step 2: 追加したテストだけを実行し、失敗を確認する
- [ ] Step 3: Gemini client を lazy 初期化へ変え、Anthropic 配線と hybrid 分岐を除去する
- [ ] Step 4: anthropic 依存、環境変数例、不要テストを整理する
- [ ] Step 5: backend 契約テストを再実行し、通過を確認する

### Task 2: J-Quants reference service and WS payload

**Files:**
- Create: Product/autotrader-suite/backend/server/engine/jquants_reference.py
- Modify: Product/autotrader-suite/backend/server/routes/price_feed.py
- Modify: Product/autotrader-suite/backend/server/routes/ws.py
- Modify: Product/autotrader-suite/backend/server/models.py
- Create: Product/autotrader-suite/backend/tests/test_jquants_reference.py
- Modify: Product/autotrader-suite/backend/tests/test_price_feed.py

- [ ] Step 1: J-Quants reference 取得の失敗系と成功系テストを書く
- [ ] Step 2: 参照取得後に execution 価格を維持したまま reference snapshot を payload に積む router テストを書く
- [ ] Step 3: httpx ベースの J-Quants client と小さな cache / timeout / missing key graceful degradation を実装する
- [ ] Step 4: execution 応答を遅くしないよう、reference fetch を非同期 publish として組み込む
- [ ] Step 5: backend の J-Quants 関連テストを再実行し、通過を確認する

### Task 3: Dashboard execution/reference split

**Files:**
- Modify: Product/autotrader-suite/ui/types/trader.ts
- Modify: Product/autotrader-suite/ui/lib/trader-view-model.ts
- Modify: Product/autotrader-suite/ui/components/PricePanel.tsx
- Modify: Product/autotrader-suite/ui/components/DashboardShell.tsx
- Modify: Product/autotrader-suite/ui/components/RiskSettingsAccordion.tsx
- Modify: Product/autotrader-suite/ui/tests/useTraderSocket.test.ts
- Modify: Product/autotrader-suite/ui/tests/DashboardShell.test.tsx
- Modify: Product/autotrader-suite/ui/tests/RiskSettingsAccordion.test.tsx

- [ ] Step 1: reference snapshot を含む payload 契約の失敗テストと UI 表示テストを書く
- [ ] Step 2: ai_mode を Gemini 固定にそろえるテストへ更新し、失敗を確認する
- [ ] Step 3: ViewModel と panel を execution / reference 分離表示へ実装する
- [ ] Step 4: settings UI を Gemini only 表示へそろえる
- [ ] Step 5: frontend テストを再実行し、通過を確認する

### Task 4: Integrated verification

**Files:**
- Modify: docs 変更が必要なら関連設計/計画ファイル

- [ ] Step 1: Product/autotrader-suite/backend の対象 pytest を実行する
- [ ] Step 2: Product/autotrader-suite/ui の対象 Vitest を実行する
- [ ] Step 3: Product/autotrader-suite/ui の build を実行する
- [ ] Step 4: ルートの validate.ps1 を実行する
- [ ] Step 5: 変更点と残リスクを整理する
