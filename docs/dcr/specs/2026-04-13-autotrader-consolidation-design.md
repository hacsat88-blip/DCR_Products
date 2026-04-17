# AutoTrader Consolidation Design

> 対象: AutoTrader backend / dashboard / VBA source layout

## Goal

AutoTrader 関連の source of truth を 1 つの親フォルダへ集約し、runtime artifact と開発用 source を切り分けたまま保守しやすい構成へ移行する。

## Design Summary

- 集約先は `Product/autotrader-suite/` とする。
- backend は `Product/autotrader-suite/backend/`、dashboard は `Product/autotrader-suite/ui/`、VBA text source は `Product/autotrader-suite/vba/` に置く。
- repo root の `autotrader.xlsm` は environment-specific な runtime workbook のまま維持する。
- `.venv`、`node_modules`、`.next`、`.pytest_cache` のような runtime 依存は phase 1 では legacy path に残してよい。

## Phase 1 Scope

- source files と operational docs を新親フォルダへ寄せる
- root task と generator command を新 path に合わせる
- workbook generator を move-safe にする
- validation と smoke が新 path ベースで通ることを確認する

## Phase 1 Non-Goals

- legacy directory の完全削除
- runtime environment の再配置
- backend / frontend の機能変更
- workbook artifact の保存場所変更

## Target Layout

```text
Product/
└── autotrader-suite/
    ├── backend/
    ├── ui/
    └── vba/

autotrader.xlsm
```

## Operational Rules

- backend の起動・test 実行は `Product/autotrader-suite/backend/` を正本とする
- frontend の install・test・build は `Product/autotrader-suite/ui/` を正本とする
- workbook generator は `Product/autotrader-suite/vba/new-autotrader-workbook.ps1` を正本とする
- workbook smoke は shell association ではなく `EXCEL.EXE /x` と workbook full path attach を優先する

## Cleanup Outcome

- local backend runtime artifacts は `Product/autotrader-suite/backend/` 配下へ移設する
- legacy source directories は phase 2 cleanup で削除する
- historical path references は implementation plan など履歴文書に限定する
- destructive cleanup は canonical path の再検証と同じ change set で完了確認する

## Acceptance Criteria

- 主要 docs と task が `Product/autotrader-suite` を参照する
- workbook generator が新 path から repo root を正しく解決する
- backend test が `Product/autotrader-suite/backend` 起点で通る
- frontend test / build が `Product/autotrader-suite/ui` 起点で通る
- workbook generator と Excel smoke が `Product/autotrader-suite/vba` 起点で通る
- legacy directories を削除しても canonical path だけで運用できる
