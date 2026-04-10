# S1 Next.js Full Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** README記載のPhase 5機能をNext.js版でフル実装・安定化し、S2（単一HTML自動抽出）へ渡せる実装境界と検証証跡を揃える。

**Architecture:** 既存の `UI -> store -> service/provider -> adapter` 構造を維持し、UI層から直接runtime依存へ触れない設計を徹底する。機能ごとに回帰テストを先に追加し、最小実装で緑化してから統合検証を行う。最後に抽出不能依存点マップを作成し、S2で差し替えるadapter境界を固定する。

**Tech Stack:** Next.js 14, TypeScript, Zustand, Vitest, Tailwind, Recharts/lightweight-charts

---

## File Structure (implementation map)

- Modify: `src/app/page.tsx`
  - タブ横断の配線、パネル間の整合、S1最終統合点
- Modify: `src/store/useStockStore.ts`, `src/store/slices/*.ts`, `src/store/useNavigatorStore.ts`
  - 状態正本、導線整合、429 retry/fallback/persistence整合
- Modify: `src/services/providers/*.ts`, `src/services/stockSearchService.ts`, `src/services/claudeSearchProvider.ts`
  - 取得結果の正規化、fallback/source/freshness整合
- Modify: `src/components/dashboard/*.tsx`, `src/components/stock/*.tsx`, `src/components/screener/*.tsx`, `src/components/navigator/*.tsx`, `src/components/ui/*.tsx`
  - UI上の表示整合と行動導線
- Modify/Test: `src/**/*.test.ts`, `src/**/*.test.tsx`
  - 重要導線回帰の自動化
- Update: `README.md`, `IMPLEMENTATION_NOTES.md`
  - 実際の挙動に合わせた運用説明
- Add: `docs/dcr/specs/dependency-map-s1.md`
  - S2引き渡し用の抽出不能依存点マップ（Next/API/env/browser依存）

---

### Task 1: Baseline audit and feature parity checklist

**Files:**
- Modify: `README.md`
- Add: `docs/dcr/specs/dependency-map-s1.md`
- Modify: `src/app/page.tsx`
- Test: `src/hooks/useDashboardDerived.test.tsx`

- [ ] **Step 1: Write the failing parity checklist test**

```ts
it("exposes all Phase 5 panels in the expected tabs", () => {
  const visiblePanels = getDashboardPanelKeys();
  expect(visiblePanels).toEqual(expect.arrayContaining([
    "ranking", "compare", "snapshot", "timeline", "export", "savedScreens", "navigator"
  ]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useDashboardDerived.test.tsx -t "Phase 5 panels"`  
Expected: FAIL with missing keys or expectation mismatch.

- [ ] **Step 3: Implement minimal wiring fixes in `src/app/page.tsx` / derived hooks**

```ts
const dashboardPanels = {
  ranking: true,
  compare: true,
  snapshot: true,
  timeline: true,
  export: true,
  savedScreens: true,
  navigator: true
} as const;
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/hooks/useDashboardDerived.test.tsx -t "Phase 5 panels"`  
Expected: PASS.

- [ ] **Step 5: Document dependency map draft**

Add `docs/dcr/specs/dependency-map-s1.md` with sections:
- Next route依存
- env依存
- browser API依存
- adapterで隔離済み依存

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/hooks/useDashboardDerived.test.tsx README.md docs/dcr/specs/dependency-map-s1.md
git commit -m "test/feat: add S1 parity baseline and dependency map"
```

---

### Task 2: Search/filter/compare/detail flow hardening

**Files:**
- Modify: `src/components/screener/SearchBar.tsx`
- Modify: `src/components/screener/FilterPanel.tsx`
- Modify: `src/components/dashboard/RankingBoard.tsx`
- Modify: `src/components/stock/StockCard.tsx`
- Modify: `src/components/stock/StockDetailDrawer.tsx`
- Test: `src/components/ui/DataFreshnessBadge.test.tsx`
- Test: `src/lib/__tests__/stockPresentation.test.ts`

- [ ] **Step 1: Add failing test for compare limit and UI sync**

```ts
it("prevents adding a 5th compare item and keeps existing selection", () => {
  const next = addToCompare(["9424", "2337", "4477", "4419"], "8306");
  expect(next).toEqual(["9424", "2337", "4477", "4419"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/stockPresentation.test.ts -t "5th compare"`  
Expected: FAIL.

- [ ] **Step 3: Implement minimal compare guard and UI feedback**

```ts
if (!selected && compareSelection.length >= 4) {
  return; // UI shows limit badge + disabled action
}
```

- [ ] **Step 4: Add failing test for hydration-safe freshness label**

```ts
it("renders stable SSR markup before client time is known", () => {
  expect(renderToString(<DataFreshnessBadge kind="price" timestamp={ts} />))
    .toContain("価格 更新済み");
});
```

- [ ] **Step 5: Run targeted tests and implement minimal fix**

Run:  
`npx vitest run src/components/ui/DataFreshnessBadge.test.tsx src/lib/__tests__/stockPresentation.test.ts`  
Expected: FAIL then PASS after fix.

- [ ] **Step 6: Add failing test for Claude hook failure -> catalog fallback**

```ts
it("falls back to catalog when claude hook throws", async () => {
  globalThis.__STOCK_MONITOR_CLAUDE_SEARCH__ = async () => {
    throw new Error("claude unavailable");
  };
  const result = await stockSearchService.search("トヨタ");
  expect(result.error).toContain("claude unavailable");
  expect(result.results.length).toBeGreaterThan(0);
});
```

- [ ] **Step 7: Run fallback test and implement minimal fix**

Run: `npx vitest run src/services/claudeSearchProvider.test.ts -t "falls back to catalog"`  
Expected: FAIL then PASS.

- [ ] **Step 8: Add failing test for ranking/action-lane shared evaluator**

```ts
it("uses the same evaluated action in ranking and action lane", () => {
  const ranked = deriveRankingRows(stocks);
  const lanes = deriveActionLanes(stocks);
  expect(ranked.map((s) => s.evaluatedAction).sort())
    .toEqual(lanes.flatMap((lane) => lane.items.map((s) => s.evaluatedAction)).sort());
});
```

- [ ] **Step 9: Run evaluator consistency test and implement minimal fix**

Run: `npx vitest run src/hooks/useDashboardDerived.test.tsx -t "same evaluated action"`  
Expected: FAIL then PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/screener/SearchBar.tsx src/components/screener/FilterPanel.tsx src/components/dashboard/RankingBoard.tsx src/components/stock/StockCard.tsx src/components/stock/StockDetailDrawer.tsx src/components/ui/DataFreshnessBadge.test.tsx src/lib/__tests__/stockPresentation.test.ts src/services/claudeSearchProvider.ts src/services/claudeSearchProvider.test.ts src/hooks/useDashboardDerived.test.tsx
git commit -m "test/feat: harden search filter compare detail flows"
```

---

### Task 3: Snapshot/timeline/saved-screen/export-import integrity

**Files:**
- Modify: `src/store/useStockStore.ts`
- Modify: `src/components/dashboard/SnapshotPanel.tsx`
- Modify: `src/components/dashboard/SavedScreenPanel.tsx`
- Modify: `src/components/dashboard/ExportPanel.tsx`
- Modify: `src/components/dashboard/ImportPanel.tsx`
- Modify: `src/types/archive.ts`
- Test: `src/lib/__tests__/importValidator.test.ts`
- Test: `src/lib/__tests__/filters.test.ts`

- [ ] **Step 1: Add failing test for snapshot capture integrity**

```ts
it("preserves captureId and captureSource through export/import", () => {
  const exported = exportSnapshots(seedSnapshots);
  const imported = importSnapshots(exported);
  expect(imported[0]).toMatchObject({ captureId: expect.any(String), captureSource: "manual" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/importValidator.test.ts -t "captureId"`  
Expected: FAIL.

- [ ] **Step 3: Implement minimal schema/migration fix**

```ts
captureId: row.captureId ?? buildCaptureId(row.checkedAt),
captureSource: row.captureSource ?? "manual"
```

- [ ] **Step 4: Add failing test for saved-screen restore parity**

```ts
expect(restored).toMatchObject({
  filters: expectedFilters,
  sortKey: expectedSort,
  rankingSortKey: expectedRankingSort,
  compareSelection: expectedCompare
});
```

- [ ] **Step 5: Run targeted tests and green them**

Run:  
`npx vitest run src/lib/__tests__/importValidator.test.ts src/lib/__tests__/filters.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/useStockStore.ts src/components/dashboard/SnapshotPanel.tsx src/components/dashboard/SavedScreenPanel.tsx src/components/dashboard/ExportPanel.tsx src/components/dashboard/ImportPanel.tsx src/types/archive.ts src/lib/__tests__/importValidator.test.ts src/lib/__tests__/filters.test.ts
git commit -m "test/feat: enforce snapshot and saved-screen integrity"
```

---

### Task 4: Alert and navigator reliability completion

**Files:**
- Modify: `src/store/useNavigatorStore.ts`
- Modify: `src/components/navigator/NavigatorSetupModal.tsx`
- Modify: `src/components/navigator/cooldown.ts`
- Modify: `src/store/slices/alertSlice.ts`
- Modify: `src/lib/alertEngine.ts`
- Test: `src/store/useNavigatorStore.test.ts`
- Test: `src/components/navigator/cooldown.test.ts`
- Test: `src/lib/__tests__/alertEngine.test.ts`

- [ ] **Step 1: Add failing test for full-step retry propagation and cooldown validity**

```ts
it.each([1,2,3])("keeps retry state on step %i rate limit", async (step) => {
  const state = await runPipelineWith429At(step);
  expect(state.retryState?.reason).toBe("rate_limit");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useNavigatorStore.test.ts -t "rate limit"`  
Expected: FAIL.

- [ ] **Step 3: Implement minimal catch-path and parse hardening**

```ts
const retry = err instanceof NavigatorStepError ? err.retry : null;
const retryAtMs = parseRetryAtMs(retry?.retryAt);
```

- [ ] **Step 4: Add failing test for alert baseline suppression regression**

```ts
expect(newEventsAfterConfigChange).toHaveLength(0);
```

- [ ] **Step 5: Add failing integration test for alert CRUD + priority/dueDate reflection**

```ts
it("reflects priority and dueDate after rule create/update/delete", () => {
  const created = createRule({ priority: "high", dueDate: "2026-05-01" });
  const updated = updateRule(created.id, { priority: "critical" });
  expect(updated.priority).toBe("critical");
  expect(getAlertCenterRows()).toContainEqual(expect.objectContaining({ dueDate: "2026-05-01" }));
  deleteRule(created.id);
  expect(getRuleById(created.id)).toBeUndefined();
});
```

- [ ] **Step 6: Run targeted tests and green them**

Run:  
`npx vitest run src/store/useNavigatorStore.test.ts src/components/navigator/cooldown.test.ts src/lib/__tests__/alertEngine.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/useNavigatorStore.ts src/components/navigator/NavigatorSetupModal.tsx src/components/navigator/cooldown.ts src/store/slices/alertSlice.ts src/lib/alertEngine.ts src/store/useNavigatorStore.test.ts src/components/navigator/cooldown.test.ts src/lib/__tests__/alertEngine.test.ts
git commit -m "test/feat: complete navigator and alert reliability"
```

---

### Task 5: Provider/source/freshness/fallback consistency

**Files:**
- Modify: `src/services/providers/compositeProvider.ts`
- Modify: `src/services/providers/types.ts`
- Modify: `src/lib/dataSourceStatus.ts`
- Modify: `src/components/dashboard/DataQualityRibbon.tsx`
- Modify: `src/components/dashboard/SummaryBar.tsx`
- Modify: `src/components/dashboard/NikkeiCandlestickChart.tsx`
- Test: `src/services/providers/compositeProvider.test.ts`
- Test: `src/hooks/useNikkeiOhlc.test.tsx`
- Test: `src/lib/__tests__/dataSourceStatus.test.ts`

- [ ] **Step 1: Add failing tests for source label correctness and fallback reason rendering**

```ts
expect(stock.fundamentalsSourceLabel).toBe("AV");
expect(view.fallbackReason).toContain("補助データ");
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npx vitest run src/services/providers/compositeProvider.test.ts src/lib/__tests__/dataSourceStatus.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement minimal normalization fixes**

```ts
fundamentalsSourceLabel: fundamental ? normalizeSourceLabel(fundamental.sourceLabel, "C") : "M";
```

- [ ] **Step 4: Add failing test for freshness/state consistency in chart hook**

```ts
expect(result.current.dataStatus).toBe("fallback");
expect(result.current.source).toBe("alpha_vantage");
```

- [ ] **Step 5: Run targeted tests and green them**

Run:  
`npx vitest run src/services/providers/compositeProvider.test.ts src/hooks/useNikkeiOhlc.test.tsx src/lib/__tests__/dataSourceStatus.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/services/providers/compositeProvider.ts src/services/providers/types.ts src/lib/dataSourceStatus.ts src/components/dashboard/DataQualityRibbon.tsx src/components/dashboard/SummaryBar.tsx src/components/dashboard/NikkeiCandlestickChart.tsx src/services/providers/compositeProvider.test.ts src/hooks/useNikkeiOhlc.test.tsx src/lib/__tests__/dataSourceStatus.test.ts
git commit -m "test/feat: normalize provider source freshness fallback states"
```

---

### Task 6: Final verification and S2 handoff package

**Files:**
- Modify: `docs/dcr/specs/dependency-map-s1.md`
- Modify: `README.md`
- Modify: `IMPLEMENTATION_NOTES.md`

- [ ] **Step 1: Update dependency-map with verified extraction blockers**

```md
## Extraction blockers (S1 verified)
- Next route dependency: ...
- Secret/env dependency: ...
- Browser API dependency: ...
```

- [ ] **Step 2: Run full repository validation**

Run:
```bash
npm run lint
npm run test
npm run build
```
Expected: all pass (lint may include known warning only).

- [ ] **Step 3: Capture verification summary in implementation notes**

```md
- S1 verification: lint/test/build passed
- Critical path checks: search/compare/retry/fallback/export-import
```

- [ ] **Step 4: Commit**

```bash
git add docs/dcr/specs/dependency-map-s1.md README.md IMPLEMENTATION_NOTES.md
git commit -m "docs: finalize S1 handoff package for S2 extraction"
```

---

## Execution order and dependencies

1. Task 1
2. Task 2 + Task 3（並列可）
3. Task 4 + Task 5（並列可）
4. Task 6

## Skills to reference during execution

- `@tdd-workflow` for each task
- `@verification-before-completion` before Task 6 finalization
- `@subagent-driven-development` for parallel task execution

