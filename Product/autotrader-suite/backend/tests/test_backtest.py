import json

from server.engine.backtest import run_backtest
from server.models import RiskSettings


def test_run_backtest_replays_csv_without_llm(tmp_path):
    csv_path = tmp_path / "bars.csv"
    csv_path.write_text(
        "timestamp,code,open,high,low,close,volume,bid,ask,reference_price,news_halt,news_note\n"
        "2026-04-12T09:00:00,7203,249.0,249.4,248.7,249.1,700,249.0,249.1,249.0,false,\n"
        "2026-04-12T09:01:00,7203,249.1,249.7,249.0,249.5,800,249.4,249.5,249.4,false,\n"
        "2026-04-12T09:02:00,7203,249.5,250.1,249.3,249.8,900,249.7,249.8,249.7,false,\n"
        "2026-04-12T09:03:00,7203,249.8,250.4,249.6,250.0,1000,249.9,250.0,249.9,false,\n"
        "2026-04-12T09:04:00,7203,250.0,250.8,249.9,250.5,1500,250.4,250.5,250.0,false,\n"
        "2026-04-12T09:05:00,7203,250.5,251.1,250.2,250.9,1500,250.8,250.9,250.4,false,\n"
        "2026-04-12T09:06:00,7203,250.9,251.1,247.6,247.8,1800,247.7,247.8,248.0,false,\n",
        encoding="utf-8",
    )

    summary = run_backtest(csv_path, RiskSettings())

    assert summary["decision_engine"] == "rule_based"
    assert summary["bars_processed"] == 3
    assert summary["total_round_trips"] >= 1
    assert "total_realized_pnl" in summary
    assert json.dumps(summary)