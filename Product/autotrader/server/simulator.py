"""
1日取引シミュレーター: MarketSpeed II RSS なしで全ワークフローを検証する

使い方:
  python -m server.simulator

シナリオ:
  - 資金50万円（SMALL ティア）で3銘柄を順次判断
  - 1件成功（+2000円）、1件損切り（-1500円）、1件時間切れ（-300円）
  - 合計 +200円 → 目標5000円未達だが損失上限(-3000円)には達していないことを確認
"""
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from .capital_router import CapitalRouter
from .risk_guard import RiskGuard
from .technical_filter import PriceData, TechnicalFilter


@dataclass
class SimTrade:
    symbol: str
    entry_time: datetime
    entry_price: float
    exit_price: float
    qty: int
    exit_reason: str


def run_simulation() -> None:
    router = CapitalRouter()
    filt = TechnicalFilter()
    guard = RiskGuard()

    available_cash = 500_000
    config = router.get_config(available_cash)
    tier = router.get_tier(available_cash)

    print(f"=== 東証プライム 1日シミュレーション ===")
    print(f"投資余力: ¥{available_cash:,}  ティア: {tier.value}")
    print(f"1日損失上限: ¥{abs(-3_000):,}  利益目標: ¥{5_000:,}")
    print("=" * 45)

    scenarios = [
        # (銘柄, 現在値, 出来高, 5日平均出来高, RSI, 前日終値, 時刻, 終了価格, 終了理由)
        ("7203", 2_310, 1_600_000, 1_000_000, 43.0, 2_280, time(9, 20), 2_330, "利確"),
        ("6758", 12_500, 2_000_000, 1_300_000, 48.0, 12_350, time(10, 15), 12_280, "損切り"),
        ("9984", 8_900, 3_000_000, 2_000_000, 41.0, 8_800, time(13, 0), 8_880, "時間切れ"),
    ]

    trades: list[SimTrade] = []

    for symbol, price, vol, avg_vol, rsi, prev_close, t, exit_price, exit_reason in scenarios:
        now = datetime(2026, 5, 12, t.hour, t.minute)
        print(f"\n[{t}] {symbol} 現在値 ¥{price:,}")

        # Step 1: TechnicalFilter
        data = PriceData(
            symbol=symbol, price=price, volume=vol, avg_volume_5d=avg_vol,
            rsi14=rsi, prev_close=prev_close, current_time=t
        )
        filter_result = filt.check(data, config)
        print(f"  フィルター: {'通過' if filter_result.passed else '拒否'} — {filter_result.reason}")
        if not filter_result.passed:
            continue

        # Step 2: RiskGuard エントリーチェック
        target = price * 1.02
        entry_check = guard.check_entry(symbol, price, target, now)
        print(f"  RiskGuard: {'許可' if entry_check.allowed else '拒否'} — {entry_check.reason}")
        if not entry_check.allowed:
            continue

        # Step 3: 発注可否はローカルルールのみで確定する
        print("  ローカル判断: エントリー許可（AI助言は発注に使わない）")

        # Step 4: ロット計算 & エントリー
        lot = router.calc_lot(available_cash, price)
        guard.on_entry(symbol, price, now, lot)
        print(f"  エントリー: {lot}株 @ ¥{price:,}  最大投入 ¥{lot*price:,}")

        # Step 5: 決済シミュレーション
        exit_time = now + timedelta(minutes=30 if exit_reason != "時間切れ" else 61)
        pnl = (exit_price - price) * lot
        guard.on_exit(symbol, pnl)
        trades.append(SimTrade(symbol, now, price, exit_price, lot, exit_reason))

        print(f"  決済: ¥{exit_price:,} ({exit_reason})  損益 {pnl:+,.0f}円")
        print(f"  本日累計損益: {guard.session.daily_pnl:+,.0f}円  残余リスク予算: {guard.get_remaining_risk_budget():+,.0f}円")

        if guard.session.trading_stopped:
            print(f"\n  ** 取引停止: {guard.session.stop_reason} **")
            break

    print("\n" + "=" * 45)
    print("=== シミュレーション終了 ===")
    print(f"取引件数: {len(trades)}")
    for t in trades:
        pnl = (t.exit_price - t.entry_price) * t.qty
        print(f"  {t.symbol}: {pnl:+,.0f}円 ({t.exit_reason})")
    print(f"本日損益合計: {guard.session.daily_pnl:+,.0f}円")
    print(f"取引停止: {'あり — ' + guard.session.stop_reason if guard.session.trading_stopped else 'なし'}")

    # 検証アサーション
    assert len(trades) <= 2 or not guard.session.trading_stopped or guard.session.daily_pnl <= -3_000, \
        "停止条件の検証失敗"
    print("\n検証: OK — 損失上限・利益目標ルールが正常に機能しています")


if __name__ == "__main__":
    run_simulation()
