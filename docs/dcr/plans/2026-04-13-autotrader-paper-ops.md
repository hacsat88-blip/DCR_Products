# AutoTrader Paper Ops Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 実発注を有効化せずに、AutoTrader を paper-trading 運用しやすい状態まで仕上げる。

**Architecture:** backend に read-only health state と health endpoint を追加し、frontend は WebSocket 状態と health 状態を分離表示する。VBA は Control シートの運用セルを増やし、auto-start、last tick、last action、last error を operator が直接確認できるようにする。

**Tech Stack:** FastAPI, Pydantic v2, pytest, Next.js 14, Vitest, Excel VBA

---

### Task 1: Add Backend Paper Ops Health Contract

**Files:**
- Create: `Product/autotrader-suite/backend/server/engine/paper_ops.py`
- Create: `Product/autotrader-suite/backend/server/routes/health.py`
- Modify: `Product/autotrader-suite/backend/server/engine/gemini_trader.py`
- Modify: `Product/autotrader-suite/backend/server/engine/jquants_reference.py`
- Modify: `Product/autotrader-suite/backend/server/models.py`
- Modify: `Product/autotrader-suite/backend/server/main.py`
- Modify: `Product/autotrader-suite/backend/server/routes/price_feed.py`
- Create: `Product/autotrader-suite/backend/tests/test_health.py`
- Modify: `Product/autotrader-suite/backend/tests/test_main.py`

- [ ] Write failing backend tests for `GET /api/health` startup state, degraded state, and execution tick updates.
- [ ] Implement the minimal health model, runtime state owner, and `GET /api/health` route.
- [ ] Wire Gemini and J-Quants readiness transitions into the shared health state.
- [ ] Wire price processing to update `last_price_tick_at`, `last_price_code`, `ai_status`, `reference_status`, and `last_warning`.
- [ ] Run `pytest tests/test_health.py tests/test_main.py tests/test_price_feed.py -q`.

### Task 2: Expose Health State In Dashboard

**Files:**
- Create: `Product/autotrader-suite/ui/app/api/health/route.ts`
- Create: `Product/autotrader-suite/ui/hooks/useTraderHealth.ts`
- Create: `Product/autotrader-suite/ui/components/PaperOpsSummary.tsx`
- Modify: `Product/autotrader-suite/ui/types/trader.ts`
- Modify: `Product/autotrader-suite/ui/components/DashboardClient.tsx`
- Modify: `Product/autotrader-suite/ui/components/DashboardShell.tsx`
- Modify: `Product/autotrader-suite/ui/components/StatusHeader.tsx`
- Create: `Product/autotrader-suite/ui/tests/useTraderHealth.test.ts`
- Modify: `Product/autotrader-suite/ui/tests/DashboardShell.test.tsx`

- [ ] Write failing frontend tests for healthy waiting state, stale but reachable state, unreachable health state, ai degraded, and reference degraded rendering.
- [ ] Implement health proxy polling and UI summary for paper mode, stub only, last tick, and degraded warnings.
- [ ] Keep existing socket reducer behavior intact while merging health state into dashboard rendering.
- [ ] Run `npm run test -- tests/DashboardShell.test.tsx tests/useTraderHealth.test.ts tests/useTraderSocket.test.ts`.

### Task 3: Finish Workbook Operator Surface

**Files:**
- Modify: `Product/autotrader-suite/vba/src/modConfig.bas`
- Modify: `Product/autotrader-suite/vba/src/modHTTP.bas`
- Modify: `Product/autotrader-suite/vba/src/modTimer.bas`
- Modify: `Product/autotrader-suite/vba/src/ThisWorkbook.cls`
- Modify: `Product/autotrader-suite/vba/workbook-layout.md`
- Modify: `Product/autotrader-suite/vba/README.md`

- [ ] Add exact Control sheet row constants for run mode, order mode, auto start, last tick, last action, and last error.
- [ ] Extend `modHTTP.PostPrice` to surface non-200 failures as operator-visible server errors without changing order semantics.
- [ ] Keep workbook cell ownership in `modTimer`, with `modHTTP` only returning transport/result data.
- [ ] Update `modTimer` and `ThisWorkbook` so auto-start is config-driven and A13-A15 update exactly per spec.
- [ ] Update workbook docs to match the canonical text source.
- [ ] Manually smoke: verify auto-start true/false, request-timestamp based Last Tick At, Last Action updates, and Last Error retention after non-200.

### Task 4: Final Verification And Docs Sync

**Files:**
- Modify: `Product/autotrader-suite/ui/README.md`

- [ ] Run backend full suite: `pytest tests -q`.
- [ ] Run frontend regression: `npm run test -- tests/traderDisplay.test.ts tests/RiskSettingsAccordion.test.tsx tests/DashboardShell.test.tsx tests/useTraderSocket.test.ts tests/useTraderHealth.test.ts`.
- [ ] Run frontend build: `npm run build`.
- [ ] Run `powershell -ExecutionPolicy Bypass -File ./validate.ps1`.
- [ ] Run `powershell -ExecutionPolicy Bypass -File ./deploy.ps1 -Check`.
