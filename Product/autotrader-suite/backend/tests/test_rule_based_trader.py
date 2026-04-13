from datetime import datetime

from server.engine.rule_based_trader import RuleBasedTrader
from server.engine.trade_setup import TradeSetup
from server.models import OHLCBar, Position, PriceRequest, RiskSettings


def build_request(price: float = 250.0) -> PriceRequest:
    return PriceRequest(
        code="7203",
        price=price,
        volume=10000,
        ohlc=[
            OHLCBar(o=249.0, h=249.4, l=248.7, c=249.1, v=700),
            OHLCBar(o=249.1, h=249.7, l=249.0, c=249.5, v=800),
            OHLCBar(o=249.5, h=250.1, l=249.3, c=249.8, v=900),
            OHLCBar(o=249.8, h=250.4, l=249.6, c=250.0, v=1000),
            OHLCBar(o=250.0, h=250.8, l=249.9, c=250.5, v=1500),
        ],
        timestamp=datetime(2026, 4, 12, 10, 0, 0),
    )


def build_setup(**overrides) -> TradeSetup:
    values = {
        "five_bar_high": 250.8,
        "five_bar_low": 248.7,
        "five_bar_range_pct": 1.2,
        "last_bar_volume_ratio": 1.6,
        "reference_gap_pct": 1.0,
        "price_position_in_range": 0.85,
        "breakout_above_prev_high": True,
        "breakdown_below_prev_low": False,
        "spread_bps": 8.0,
        "minutes_from_session_open": 20,
        "news_halt": False,
        "news_note": None,
    }
    values.update(overrides)
    return TradeSetup(**values)


def test_rule_based_trader_buys_on_breakout_with_no_position():
    trader = RuleBasedTrader()
    decision = trader.decide(build_request(), Position(), RiskSettings(), build_setup())

    assert decision.action == "buy"
    assert decision.qty > 0


def test_rule_based_trader_sells_on_breakdown_when_holding():
    trader = RuleBasedTrader()
    position = Position(code="7203", qty=100, avg_cost=248.0, pnl=-300.0, pnl_pct=-1.2)
    decision = trader.decide(
        build_request(price=247.5),
        position,
        RiskSettings(),
        build_setup(
            breakout_above_prev_high=False,
            breakdown_below_prev_low=True,
            price_position_in_range=0.2,
        ),
    )

    assert decision.action == "sell"
    assert decision.qty == 100


def test_rule_based_trader_holds_without_breakout_confirmation():
    trader = RuleBasedTrader()
    decision = trader.decide(
        build_request(),
        Position(),
        RiskSettings(),
        build_setup(breakout_above_prev_high=False, price_position_in_range=0.55),
    )

    assert decision.action == "hold"