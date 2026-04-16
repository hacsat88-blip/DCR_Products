import logging
import os
from pathlib import Path

from server.models import RiskSettings

_DEFAULT_SETTINGS_FILE = Path(__file__).resolve().parents[2] / "settings.json"
SETTINGS_FILE = Path(os.environ.get("AUTOTRADER_SETTINGS_FILE", _DEFAULT_SETTINGS_FILE))
logger = logging.getLogger(__name__)


def load_settings() -> RiskSettings:
    if not SETTINGS_FILE.exists():
        return RiskSettings()

    try:
        return RiskSettings.model_validate_json(SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("Invalid settings.json detected, falling back to defaults: %s", SETTINGS_FILE)
        return RiskSettings()


def save_settings(settings: RiskSettings) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = SETTINGS_FILE.with_suffix(".tmp")
    tmp_path.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
    tmp_path.replace(SETTINGS_FILE)