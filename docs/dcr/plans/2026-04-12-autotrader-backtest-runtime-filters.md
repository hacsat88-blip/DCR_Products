# AutoTrader Backtest And Runtime Filters Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** APIキー不要の deterministic backtest、runtime リスク可視化、板・スプレッド・ニュース急変フィルタを AutoTrader に追加する。

**Architecture:** live decisioning は Gemini のまま維持し、backtest は rule-based engine を別経路で実装する。runtime 指標は RiskGuard の state を WebSocket payload に追加し、dashboard で可視化する。execution request には optional bid/ask/news halt を載せ、VBA source から backend まで end-to-end で揃える。

**Tech Stack:** FastAPI, Pydantic v2, pytest, Next.js 14, Vitest, Excel VBA

---

### Task 1: Extend Market Request And Runtime Snapshot

**Files:**
- Modify: `Product/autotrader/server/models.py`
- Modify: `Product/autotrader/server/engine/risk_guard.py`
- Modify: `Product/autotrader/server/routes/ws.py`
- Modify: `Product/autotrader/tests/test_models.py`
- Modify: `Product/autotrader/tests/test_ws.py`

- [x] Add optional bid/ask/news halt fields to request contract and runtime snapshot fields for daily realized pnl, consecutive losses, cooldown, and entry block reason.
- [x] Write/adjust failing tests for model validation and websocket payload.
- [x] Implement minimal model + guard snapshot support.
- [x] Run targeted pytest.

### Task 2: Add Deterministic Backtest Path

**Files:**
- Create: `Product/autotrader/server/engine/rule_based_trader.py`
- Create: `Product/autotrader/server/engine/backtest.py`
- Create: `Product/autotrader/server/backtest_runner.py`
- Create: `Product/autotrader/tests/test_rule_based_trader.py`
- Create: `Product/autotrader/tests/test_backtest.py`

- [x] Write failing tests for breakout/exit behavior and summary metrics.
- [x] Implement rule-based trader using TradeSetup metrics.
- [x] Implement backtest replay and summary aggregation without LLM calls.
- [x] Add CLI entry for CSV-driven execution.
- [x] Run targeted pytest.

### Task 3: Add Spread/Open/News Filters End-To-End

**Files:**
- Modify: `Product/autotrader/server/engine/trade_setup.py`
- Modify: `Product/autotrader/server/engine/risk_guard.py`
- Modify: `Product/autotrader/server/routes/price_feed.py`
- Modify: `Product/autotrader/tests/test_trade_setup.py`
- Modify: `Product/autotrader/tests/test_risk_guard.py`
- Modify: `Product/autotrader/tests/test_price_feed.py`
- Modify: `Product/autotrader-vba/src/modConfig.bas`
- Modify: `Product/autotrader-vba/src/modHTTP.bas`
- Modify: `Product/autotrader-vba/src/modTimer.bas`
- Modify: `Product/autotrader-vba/workbook-layout.md`

- [x] Add failing tests for skip-open, max spread, and news halt buy blocking.
- [x] Implement spread/open/news setup derivation and guard rules.
- [x] Extend VBA payload builder to send optional bid/ask/news halt fields.
- [x] Update workbook layout docs.
- [x] Run targeted pytest.

### Task 4: Expose Runtime Risk Metrics In Dashboard

**Files:**
- Modify: `Product/autotrader-ui/types/trader.ts`
- Modify: `Product/autotrader-ui/lib/trader-view-model.ts`
- Create: `Product/autotrader-ui/components/RiskRuntimePanel.tsx`
- Modify: `Product/autotrader-ui/components/DashboardShell.tsx`
- Modify: `Product/autotrader-ui/tests/useTraderSocket.test.ts`
- Modify: `Product/autotrader-ui/tests/DashboardShell.test.tsx`

- [x] Write failing UI tests for runtime risk metrics rendering and payload parsing.
- [x] Implement runtime risk panel and wire it into dashboard shell.
- [x] Run frontend tests and build.

### Task 5: Final Verification And Docs Sync

**Files:**
- Modify: `docs/superpowers/specs/2026-04-12-autotrading-design.md`
- Modify: `Product/autotrader/.env.example`

- [x] Update docs to state that live Gemini needs `GOOGLE_API_KEY`, while backtest does not.
- [x] Run `pytest` for touched backend suites.
- [x] Run `npm run test -- tests/traderDisplay.test.ts tests/RiskSettingsAccordion.test.tsx tests/DashboardShell.test.tsx tests/useTraderSocket.test.ts`.
- [x] Run `next build`.
- [x] Run `./validate.ps1` and `deploy.ps1 -Check`.

## Verification Results

- Backend targeted suite: `72 passed`
- Backend integration: `6 passed`
- Frontend regression: `19 passed`
- Next.js build: success
- `validate.ps1`: `603 passed, 0 failed`
- `deploy.ps1 -Check`: OK