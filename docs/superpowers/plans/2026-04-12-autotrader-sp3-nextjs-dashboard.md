# AutoTrader SP-3: Next.js Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Product/autotrader-suite/ui に、SP-1 FastAPI の監視情報を 1 ページで可視化する監視中心の Next.js ダッシュボードを実装する。

**Architecture:** Next.js 14 App Router で単一ページの監視コンソールを作る。初期化は `GET /api/settings`、継続更新は `WS /ws` を使い、`useTraderSocket` が raw payload を受信し、`lib/trader-view-model.ts` が UI 向け ViewModel に正規化する。設定更新は Next.js API route の薄い proxy を経由し、常に `RiskSettings` 全量 PUT で送る。

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library

---

## Execution Prerequisites

- この実装は新規 frontend project の `package.json`、lockfile、Tailwind/Next/Vitest 設定を追加するため、実行時点では P3 承認対象として扱う。
- backend URL は `NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL` を単一の正本とし、REST proxy と WebSocket の両方で使う。既定値は `http://127.0.0.1:8000` とする。
- chart は重いライブラリを増やさず、PricePanel 内の SVG sparkline で済ませる。

## File Structure Map

| パス | 役割 |
|---|---|
| `Product/autotrader-suite/ui/package.json` | Next/Vitest scripts と最小依存関係 |
| `Product/autotrader-suite/ui/tsconfig.json` | TypeScript 設定 |
| `Product/autotrader-suite/ui/next.config.mjs` | Next.js 基本設定 |
| `Product/autotrader-suite/ui/postcss.config.mjs` | Tailwind/PostCSS 設定 |
| `Product/autotrader-suite/ui/tailwind.config.ts` | 監視コンソール用デザイントークン |
| `Product/autotrader-suite/ui/.eslintrc.json` | Next ESLint 設定 |
| `Product/autotrader-suite/ui/next-env.d.ts` | Next.js 型定義 |
| `Product/autotrader-suite/ui/vitest.config.ts` | jsdom + alias + setupFiles |
| `Product/autotrader-suite/ui/tests/setup.ts` | jest-dom と WebSocket/fetch テスト初期化 |
| `Product/autotrader-suite/ui/app/layout.tsx` | ルート layout と metadata |
| `Product/autotrader-suite/ui/app/page.tsx` | server component として client entry を返す composition のみ |
| `Product/autotrader-suite/ui/app/globals.css` | 背景、タイポ、panel utility |
| `Product/autotrader-suite/ui/app/api/settings/route.ts` | backend settings endpoint への薄い proxy |
| `Product/autotrader-suite/ui/components/DashboardClient.tsx` | `use client` 境界。socket hook と settings fetch を束ねる |
| `Product/autotrader-suite/ui/components/DashboardShell.tsx` | page 全体の grid 組み立て |
| `Product/autotrader-suite/ui/components/StatusHeader.tsx` | 接続状態、更新時刻、stale/waiting 表示 |
| `Product/autotrader-suite/ui/components/PricePanel.tsx` | 現在値、出来高、feed、sparkline |
| `Product/autotrader-suite/ui/components/PositionPanel.tsx` | 保有数、平均取得単価、損益 |
| `Product/autotrader-suite/ui/components/LatestActionCard.tsx` | latest event の意味づけ表示 |
| `Product/autotrader-suite/ui/components/AiLogPanel.tsx` | `buy/sell/hold` のイベントログ |
| `Product/autotrader-suite/ui/components/OrderHistory.tsx` | `buy/sell` のみの履歴 |
| `Product/autotrader-suite/ui/components/RiskSettingsAccordion.tsx` | 折りたたみ式設定フォーム |
| `Product/autotrader-suite/ui/hooks/useTraderSocket.ts` | WebSocket 接続状態と再接続管理 |
| `Product/autotrader-suite/ui/lib/trader-view-model.ts` | raw payload 検証、履歴生成、50件丸め |
| `Product/autotrader-suite/ui/lib/api.ts` | settings GET/PUT helper |
| `Product/autotrader-suite/ui/lib/constants.ts` | stale 閾値、history 件数、既定 URL |
| `Product/autotrader-suite/ui/types/trader.ts` | raw payload 型と ViewModel 型 |
| `Product/autotrader-suite/ui/README.md` | セットアップと backend 接続手順 |
| `Product/autotrader-suite/ui/.env.local.example` | `NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL` の例 |
| `Product/autotrader-suite/ui/tests/useTraderSocket.test.ts` | socket/reducer 系テスト |
| `Product/autotrader-suite/ui/tests/DashboardShell.test.tsx` | page/panel 表示統合テスト |
| `Product/autotrader-suite/ui/tests/RiskSettingsAccordion.test.tsx` | settings GET/PUT と auto/manual UX テスト |

## Task 1: Workspace Bootstrap And Smoke Shell

**Files:**
- Create: `Product/autotrader-suite/ui/package.json`
- Create: `Product/autotrader-suite/ui/tsconfig.json`
- Create: `Product/autotrader-suite/ui/next.config.mjs`
- Create: `Product/autotrader-suite/ui/postcss.config.mjs`
- Create: `Product/autotrader-suite/ui/tailwind.config.ts`
- Create: `Product/autotrader-suite/ui/.eslintrc.json`
- Create: `Product/autotrader-suite/ui/next-env.d.ts`
- Create: `Product/autotrader-suite/ui/vitest.config.ts`
- Create: `Product/autotrader-suite/ui/tests/setup.ts`
- Create: `Product/autotrader-suite/ui/app/layout.tsx`
- Create: `Product/autotrader-suite/ui/app/page.tsx`
- Create: `Product/autotrader-suite/ui/app/globals.css`
- Create: `Product/autotrader-suite/ui/README.md`
- Create: `Product/autotrader-suite/ui/.env.local.example`
- Test: `Product/autotrader-suite/ui/tests/DashboardShell.test.tsx`

- [ ] **Step 1: Create the project manifest and scripts**

Create `Product/autotrader-suite/ui/package.json` with this baseline:

```json
{
  "name": "autotrader-ui",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "next": "^14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^22.7.7",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.0",
    "jsdom": "^29.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.3",
    "vitest": "^4.1.2"
  }
}
```

- [ ] **Step 2: Add Next/Tailwind/Vitest config files**

Mirror the repo’s existing frontend conventions and shared TypeScript/Tailwind patterns, but keep this app smaller. Include:

```ts
// Product/autotrader-suite/ui/next.config.mjs
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

```ts
// Product/autotrader-suite/ui/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname)
    }
  }
});
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npm install
```

Expected: `package-lock.json` is created and install exits `0`.

- [ ] **Step 4: Write the failing smoke test for the shell**

Create `Product/autotrader-suite/ui/tests/DashboardShell.test.tsx` with the smallest first assertion:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

test("shows waiting status before first tick", () => {
  render(<HomePage />);
  expect(screen.getByText("AutoTrader Dashboard")).toBeInTheDocument();
  expect(screen.getByText("waiting-first-tick")).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the smoke test to verify it fails**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/DashboardShell.test.tsx
```

Expected: FAIL because `app/page.tsx` or shell elements do not exist yet.

- [ ] **Step 6: Create the minimal shell implementation**

Add `app/layout.tsx`, `app/globals.css`, and `app/page.tsx` with a minimal placeholder page:

```tsx
// Product/autotrader-suite/ui/app/page.tsx
export default function HomePage(): JSX.Element {
  return (
    <main>
      <h1>AutoTrader Dashboard</h1>
      <p>waiting-first-tick</p>
    </main>
  );
}
```

Also create `README.md` and `.env.local.example` now so later tasks only extend them.

- [ ] **Step 7: Run the smoke test to verify it passes**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/DashboardShell.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit the scaffold**

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発"
git add Product/autotrader-suite/ui
git commit -m "feat(autotrader-ui): bootstrap Next.js dashboard workspace"
```

## Task 2: Implement Raw Contract Normalization And Socket State

**Files:**
- Create: `Product/autotrader-suite/ui/types/trader.ts`
- Create: `Product/autotrader-suite/ui/lib/constants.ts`
- Create: `Product/autotrader-suite/ui/lib/trader-view-model.ts`
- Create: `Product/autotrader-suite/ui/hooks/useTraderSocket.ts`
- Test: `Product/autotrader-suite/ui/tests/useTraderSocket.test.ts`

- [ ] **Step 1: Write the failing tests for payload normalization**

Create `Product/autotrader-suite/ui/tests/useTraderSocket.test.ts` with pure contract-first coverage before hook details:

```ts
import { describe, expect, test } from "vitest";
import { reduceTraderState } from "@/lib/trader-view-model";

test("reference hold stays in ai log but not in order history", () => {
  const next = reduceTraderState(undefined, {
    type: "state_update",
    ts: "2026-04-12T10:30:05",
    price: { code: "7203", current: 250, volume: 10000, feed_role: "reference", feed_source: "jquants_free" },
    position: { qty: 0, avg_cost: 0, pnl: 0, pnl_pct: 0 },
    last_action: { action: "hold", qty: 0, reason: "参照フィード受信", at: "10:30:05" },
    risk: {
      limit_per_order: 100000,
      stop_loss_pct: 3,
      max_qty_per_order: 100,
      poll_interval_sec: 5,
      ai_mode: "gemini",
      trading_mode: "conservative",
      available_cash: 290000,
      execution_feed: "rakuten_rss",
      reference_feed: "jquants_light",
      prioritize_manual_price_band: true,
      manual_price_min: 100,
      manual_price_max: 500,
      max_daily_orders: null,
      max_concurrent_positions: null,
      suggested_price_min: 100,
      suggested_price_max: 290,
      effective_price_min: 100,
      effective_price_max: 500,
      effective_max_daily_orders: 3,
      effective_max_concurrent_positions: 1
    }
  });

  expect(next.aiEventHistory).toHaveLength(1);
  expect(next.orderHistory).toHaveLength(0);
  expect(next.latestEvent.feedRole).toBe("reference");
});
```

Use the live backend contract from `guard.settings.model_dump()` as the fixture source of truth. Do not shrink the `risk` payload in tests.

Also add tests for:

- `waiting-first-tick` initial state
- malformed payload rejection
- 50 件 history trim
- stale state after 15 seconds
- close/error 後に 5 秒待って再接続すること

- [ ] **Step 2: Run the reducer/socket tests to verify they fail**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/useTraderSocket.test.ts
```

Expected: FAIL because trader types, reducer, and hook do not exist.

- [ ] **Step 3: Implement raw types and constants**

Create `types/trader.ts` with separate raw and UI types:

```ts
export interface RawTraderPayload { /* backend contract */ }
export interface TraderViewModel { /* UI state */ }
export type ConnectionState = "waiting-first-tick" | "connected" | "reconnecting" | "stale";
```

Create `lib/constants.ts` with:

```ts
export const DEFAULT_SERVER_BASE_URL = process.env.NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL ?? "http://127.0.0.1:8000";
export const SOCKET_STALE_MS = 15_000;
export const SOCKET_RECONNECT_MS = 5_000;
export const MAX_EVENT_HISTORY = 50;
```

- [ ] **Step 4: Implement the reducer and hook**

`lib/trader-view-model.ts` should own validation and history rules:

```ts
export function reduceTraderState(prev: TraderViewModel | undefined, raw: RawTraderPayload): TraderViewModel {
  // validate shape
  // build latestEvent with feed metadata
  // append aiEventHistory
  // append orderHistory only for buy/sell
  // trim both histories to MAX_EVENT_HISTORY
}
```

`hooks/useTraderSocket.ts` should only manage socket lifecycle:

```ts
export function useTraderSocket() {
  // open WebSocket
  // receive raw payload
  // hand off to reduceTraderState
  // mark reconnecting on close/error
  // schedule reconnect after SOCKET_RECONNECT_MS
  // mark stale after SOCKET_STALE_MS without updates
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/useTraderSocket.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the socket foundation**

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発"
git add Product/autotrader-suite/ui
git commit -m "feat(autotrader-ui): add trader socket state model"
```

## Task 3: Build The Monitoring Console UI

**Files:**
- Create: `Product/autotrader-suite/ui/components/DashboardClient.tsx`
- Create: `Product/autotrader-suite/ui/components/DashboardShell.tsx`
- Create: `Product/autotrader-suite/ui/components/StatusHeader.tsx`
- Create: `Product/autotrader-suite/ui/components/PricePanel.tsx`
- Create: `Product/autotrader-suite/ui/components/PositionPanel.tsx`
- Create: `Product/autotrader-suite/ui/components/LatestActionCard.tsx`
- Create: `Product/autotrader-suite/ui/components/AiLogPanel.tsx`
- Create: `Product/autotrader-suite/ui/components/OrderHistory.tsx`
- Modify: `Product/autotrader-suite/ui/app/page.tsx`
- Modify: `Product/autotrader-suite/ui/app/globals.css`
- Test: `Product/autotrader-suite/ui/tests/DashboardShell.test.tsx`

- [ ] **Step 1: Extend the failing UI tests**

Split `tests/DashboardShell.test.tsx` into three deterministic cases with separate mocked hook states:

```tsx
test("shows waiting-first-tick empty state", () => {
  // expect waiting-first-tick
  // expect 未取得 in PositionPanel
  // expect PricePanel placeholder
  // expect LatestActionCard to show 初回データ待機
});

test("shows execution feed and latest execution event", () => {
  // expect rakuten_rss and execution
  // expect current price and populated position
});

test("shows reference latest event but keeps hold out of order history", () => {
  // expect 参照 badge on latest event
  // expect hold reason in AiLogPanel
  // expect OrderHistory to exclude the hold row
});
```

Use mocked hook output so the page test stays deterministic.

- [ ] **Step 2: Run the dashboard test to verify it fails**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/DashboardShell.test.tsx
```

Expected: FAIL because panels and feed badges do not exist yet.

- [ ] **Step 3: Implement shell and panels**

Build the page around an explicit client boundary:

```tsx
// Product/autotrader-suite/ui/app/page.tsx
import { DashboardClient } from "@/components/DashboardClient";

export default function HomePage(): JSX.Element {
  return <DashboardClient />;
}
```

```tsx
// Product/autotrader-suite/ui/components/DashboardClient.tsx
"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { useTraderSocket } from "@/hooks/useTraderSocket";

export function DashboardClient(): JSX.Element {
  const trader = useTraderSocket();
  return <DashboardShell trader={trader} />;
}
```

Implementation rules:

- `StatusHeader` shows `waiting-first-tick`, `reconnecting`, `stale`, or `connected`
- `PricePanel` shows feed role/source and renders an SVG sparkline from recent price points
- `PricePanel` shows a placeholder state before the first tick instead of fake numbers
- `PositionPanel` shows `未取得` before first tick, not fake zeros
- `LatestActionCard` shows feed badges so reference hold is not mistaken for executable signal
- `LatestActionCard` shows `起動中` or `初回データ待機` before the first tick
- `AiLogPanel` shows all event types
- `OrderHistory` renders only `buy` and `sell`

- [ ] **Step 4: Implement the monitoring-console styles**

Add compact but readable utilities to `app/globals.css` using the dark-console direction from the repo’s other dashboard, without copying its whole theme. Define variables for:

```css
:root {
  --canvas: #091018;
  --panel: rgba(255,255,255,0.04);
  --border-subtle: rgba(148,163,184,0.12);
  --accent-cyan: #5eead4;
  --accent-gain: #22c55e;
  --accent-loss: #ef4444;
}
```

- [ ] **Step 5: Run the dashboard test to verify it passes**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/DashboardShell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the dashboard UI**

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発"
git add Product/autotrader-suite/ui
git commit -m "feat(autotrader-ui): add monitoring dashboard panels"
```

## Task 4: Add Settings Proxy And Minimal Edit UX

**Files:**
- Create: `Product/autotrader-suite/ui/lib/api.ts`
- Create: `Product/autotrader-suite/ui/app/api/settings/route.ts`
- Create: `Product/autotrader-suite/ui/components/RiskSettingsAccordion.tsx`
- Modify: `Product/autotrader-suite/ui/components/DashboardShell.tsx`
- Modify: `Product/autotrader-suite/ui/types/trader.ts`
- Test: `Product/autotrader-suite/ui/tests/RiskSettingsAccordion.test.tsx`

- [ ] **Step 1: Write the failing settings tests**

Create `tests/RiskSettingsAccordion.test.tsx` covering four critical contracts:

```tsx
test("loads settings via GET and renders effective values", async () => {
  // mock fetch GET /api/settings
  // expect limit_per_order, stop_loss_pct, max_qty_per_order, poll_interval_sec,
  // ai_mode, trading_mode, manual band fields, and read-only feed rows to appear
  // expect ai_mode choices to be only gemini and hybrid
  // expect Auto labels for both nullable overrides
  // expect effective values such as "実効値 3" and "実効値 1" to appear
});

test("sends full payload on PUT and preserves hidden fields", async () => {
  // change available_cash only
  // expect PUT body still contains ai_mode, execution_feed, reference_feed
});

test("auto mode sends null for nullable overrides", async () => {
  // set max_daily_orders and max_concurrent_positions to Auto
  // expect both payload values === null
});

test("keeps draft values when PUT fails", async () => {
  // mock failing PUT
  // edit available_cash
  // expect the edited draft to remain visible after the error
});
```

- [ ] **Step 2: Run the settings tests to verify they fail**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/RiskSettingsAccordion.test.tsx
```

Expected: FAIL because API helpers and component do not exist.

- [ ] **Step 3: Implement the API helper and proxy route**

Create `lib/api.ts`:

```ts
export async function fetchSettings(): Promise<RiskSettingsResponse> {
  const res = await fetch("/api/settings", { cache: "no-store" });
  if (!res.ok) throw new Error("settings fetch failed");
  return res.json();
}

export async function updateSettings(payload: RiskSettingsResponse): Promise<RiskSettingsResponse> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("settings update failed");
  return res.json();
}
```

Create `app/api/settings/route.ts` as a thin proxy to `${NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL}/api/settings` for both GET and PUT.

- [ ] **Step 4: Implement the accordion form**

Rules:

- load canonical settings on mount
- keep non-editable fields in form state for full PUT
- render the accordion closed by default
- `ai_mode` must expose exactly two options: `gemini` and `hybrid`
- show `Auto` / `Manual` toggles for nullable overrides
- render effective values next to override controls
- render editable controls for `limit_per_order`, `stop_loss_pct`, `max_qty_per_order`, `poll_interval_sec`, `ai_mode`, `trading_mode`, `available_cash`, `prioritize_manual_price_band`, `manual_price_min`, `manual_price_max`, `max_daily_orders`, `max_concurrent_positions`
- render `execution_feed` and `reference_feed` as read-only display rows
- disable the form when initial GET fails
- keep edited draft values visible on PUT failure and update canonical UI only after PUT success

- [ ] **Step 5: Run the settings tests to verify they pass**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npx vitest run tests/RiskSettingsAccordion.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the settings workflow**

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発"
git add Product/autotrader-suite/ui
git commit -m "feat(autotrader-ui): add settings proxy and accordion editor"
```

## Task 5: Final Wiring, Docs, And Verification

**Files:**
- Modify: `Product/autotrader-suite/ui/app/page.tsx`
- Modify: `Product/autotrader-suite/ui/README.md`
- Modify: `Product/autotrader-suite/ui/.env.local.example`
- Modify: `Product/autotrader-suite/ui/tests/DashboardShell.test.tsx`
- Modify: `Product/autotrader-suite/ui/tests/useTraderSocket.test.ts`
- Modify: `Product/autotrader-suite/ui/tests/RiskSettingsAccordion.test.tsx`

- [ ] **Step 1: Add the final integrated assertions**

Before final verification, ensure the test set includes:

- `DashboardShell.test.tsx`: `feed_role` / `feed_source` visible in PricePanel
- `useTraderSocket.test.ts`: stale after 15s, reconnects after 5s, malformed payload ignored
- `RiskSettingsAccordion.test.tsx`: GET failure disables form and PUT failure keeps draft state

- [ ] **Step 2: Run the full frontend test suite**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npm run test
```

Expected: all Vitest tests pass.

- [ ] **Step 3: Run lint**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npm run lint
```

Expected: no ESLint errors.

- [ ] **Step 4: Run production build**

Run:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 5: Run a live backend contract smoke**

Use three terminals.

Terminal A:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/backend"
./.venv/Scripts/python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```

Terminal B:

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発/Product/autotrader-suite/ui"
npm run dev
```

Terminal C:

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/settings"
```

Expected: settings JSON is returned through the Next.js proxy.

Then verify PUT forwarding through the proxy:

```powershell
$settings = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/settings"
$settings.available_cash = 280000
$settings.max_daily_orders = $null
$settings.max_concurrent_positions = $null
$updated = $settings | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Put -Uri "http://127.0.0.1:3000/api/settings" -ContentType "application/json" -Body $updated
```

Expected: response JSON reflects `available_cash = 280000` and keeps hidden fields such as `ai_mode`, `execution_feed`, and `reference_feed` intact.

Then send one execution tick and one reference tick to the backend:

```powershell
$body = @{
  code = "7203"
  price = 250.0
  volume = 10000
  ohlc = @(@{ o = 248.0; h = 251.0; l = 247.5; c = 250.0; v = 50000 })
  timestamp = "2026-04-12T10:30:05"
  feed_role = "execution"
  feed_source = "rakuten_rss"
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/price" -ContentType "application/json" -Body $body

$refBody = @{
  code = "7203"
  price = 251.0
  volume = 11000
  ohlc = @(@{ o = 249.0; h = 252.0; l = 248.5; c = 251.0; v = 51000 })
  timestamp = "2026-04-12T10:31:05"
  feed_role = "reference"
  feed_source = "jquants_free"
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/price" -ContentType "application/json" -Body $refBody
```

In the browser at `http://127.0.0.1:3000`, verify:

- 初回は `waiting-first-tick`
- execution tick 後に `rakuten_rss` / `execution` が見える
- reference tick 後に latest event に `参照` 表示が出る
- `OrderHistory` には `buy/sell` だけが残る

- [ ] **Step 6: Update local usage docs**

Extend `README.md` with:

- install and run steps
- required backend prerequisite: SP-1 server on port 8000
- `NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL` override
- what `waiting-first-tick` and `stale` mean operationally

- [ ] **Step 7: Commit the verified SP-3 slice**

```bash
Push-Location "c:/Users/hacsa/Desktop/サトシ開発"
git add Product/autotrader-suite/ui
git commit -m "feat(autotrader-ui): ship SP-3 monitoring dashboard"
```

## Verification Checklist

- [ ] `Product/autotrader-suite/ui` が Next.js アプリとして起動できる
- [ ] `/api/settings` proxy が backend settings と疎通する
- [ ] `WS /ws` の execution/reference event を区別表示できる
- [ ] `LatestActionCard` が reference hold を誤って実行判断に見せない
- [ ] `OrderHistory` が `buy/sell` のみを表示する
- [ ] nullable override が `Auto -> null` で送信される
- [ ] WebSocket が close/error 後に 5 秒で再接続する
- [ ] `npm run test` が通る
- [ ] `npm run lint` が通る
- [ ] `npm run build` が通る

