import json

from ..codex_advisor import AdvisorContext, CodexAdvisor


def make_context():
    return AdvisorContext(
        date="2026-05-12",
        daily_target_profit=5000,
        max_daily_loss=3000,
        trade_count=4,
        daily_pnl=-2200,
        consecutive_losses=2,
        rules_triggered=["loss_streak_warning", "near_daily_loss_limit"],
        recent_trades=[],
    )


def test_parse_accepts_only_advisory_fields():
    advisor = CodexAdvisor()
    advice = advisor._parse(json.dumps({
        "risk_state": "YELLOW",
        "should_stop_new_entries": True,
        "should_reduce_size": True,
        "reason": "連敗と損失上限接近",
        "rule_issue": "連敗時の制限が弱い",
        "improvement": "2連敗で新規建てを止める",
    }, ensure_ascii=False))

    data = advice.to_dict()
    assert data["risk_state"] == "YELLOW"
    assert "action" not in data
    assert "confidence" not in data


def test_review_api_failure_returns_fail_safe(monkeypatch):
    advisor = CodexAdvisor()
    monkeypatch.setattr(
        advisor,
        "_run_app_server_turn",
        lambda _: (_ for _ in ()).throw(RuntimeError("boom")),
    )

    advice = advisor.review(make_context())

    assert advice.api_error
    assert advice.risk_state == "RED"
    assert advice.should_stop_new_entries
    assert "app-server" in advice.reason


def test_review_uses_app_server_text(monkeypatch):
    advisor = CodexAdvisor()
    monkeypatch.setattr(advisor, "_run_app_server_turn", lambda _: json.dumps({
        "risk_state": "GREEN",
        "should_stop_new_entries": False,
        "should_reduce_size": False,
        "reason": "問題なし",
        "rule_issue": "なし",
        "improvement": "記録継続",
    }, ensure_ascii=False))

    advice = advisor.review(make_context())

    assert not advice.api_error
    assert advice.risk_state == "GREEN"


class FakeProc:
    stdin = None

    def poll(self):
        return None


class StaticReader:
    def __init__(self, messages):
        self._lines = [json.dumps(m, ensure_ascii=False) + "\n" for m in messages]

    def readline(self, _deadline):
        if not self._lines:
            return None
        return self._lines.pop(0)


def test_turn_text_prefers_delta_over_completed_full_text():
    advisor = CodexAdvisor()
    body = json.dumps({
        "risk_state": "GREEN",
        "should_stop_new_entries": False,
        "should_reduce_size": False,
        "reason": "問題なし",
        "rule_issue": "なし",
        "improvement": "記録継続",
    }, ensure_ascii=False)
    reader = StaticReader([
        {
            "jsonrpc": "2.0",
            "method": "item/agentMessage/delta",
            "params": {"threadId": "thread-1", "delta": body},
        },
        {
            "jsonrpc": "2.0",
            "method": "item/completed",
            "params": {"threadId": "thread-1", "item": {"text": body}},
        },
        {
            "jsonrpc": "2.0",
            "method": "turn/completed",
            "params": {"threadId": "thread-1"},
        },
    ])

    text = advisor._read_turn_text(FakeProc(), reader, "thread-1")

    assert text == body
    assert advisor._parse(text).risk_state == "GREEN"
