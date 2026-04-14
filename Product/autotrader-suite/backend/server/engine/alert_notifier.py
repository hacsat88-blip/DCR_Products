from __future__ import annotations

import asyncio
import json
import logging
import os
from urllib import request

logger = logging.getLogger(__name__)


class AlertNotifier:
    def __init__(self, webhook_url: str | None = None, timeout_sec: float = 3.0):
        resolved = webhook_url if webhook_url is not None else os.environ.get("AUTOTRADER_ALERT_WEBHOOK_URL", "")
        self._webhook_url = resolved.strip() or None
        self._timeout_sec = timeout_sec

    async def notify(self, message: str) -> bool:
        if not self._webhook_url:
            return False

        try:
            await asyncio.to_thread(self._post_message, message)
        except Exception:
            logger.warning("Alert webhook post failed", exc_info=True)
            return False

        return True

    def _post_message(self, message: str) -> None:
        payload = json.dumps({"text": message}).encode("utf-8")
        req = request.Request(
            self._webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=self._timeout_sec) as response:
            response.read()