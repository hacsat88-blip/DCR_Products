from __future__ import annotations

import argparse
import json

from server.engine.backtest import run_backtest
from server.models import RiskSettings


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run deterministic AutoTrader backtest")
    parser.add_argument("csv_path", help="CSV path with minute bars")
    parser.add_argument("--min-five-bar-range-pct", type=float)
    parser.add_argument("--min-last-bar-volume-ratio", type=float)
    parser.add_argument("--max-reference-gap-pct", type=float)
    parser.add_argument("--max-spread-bps", type=float)
    parser.add_argument("--skip-open-minutes", type=int)
    parser.add_argument("--max-daily-loss-yen", type=int)
    parser.add_argument("--flat-before-close-minutes", type=int)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    overrides = {
        key: value
        for key, value in {
            "min_five_bar_range_pct": args.min_five_bar_range_pct,
            "min_last_bar_volume_ratio": args.min_last_bar_volume_ratio,
            "max_reference_gap_pct": args.max_reference_gap_pct,
            "max_spread_bps": args.max_spread_bps,
            "skip_open_minutes": args.skip_open_minutes,
            "max_daily_loss_yen": args.max_daily_loss_yen,
            "flat_before_close_minutes": args.flat_before_close_minutes,
        }.items()
        if value is not None
    }
    summary = run_backtest(args.csv_path, RiskSettings(**overrides))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())