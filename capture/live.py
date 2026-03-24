from __future__ import annotations

import shutil
import subprocess

from capture.pcap import _extract_tshark_rows, rows_to_events
from models import RawEvent


def capture_live_events(interface_name: str, capture_seconds: int) -> list[RawEvent]:
    if shutil.which("tshark") is None:
        raise RuntimeError("tshark is required for live capture but was not found")

    rows = _extract_tshark_rows(
        [
            "tshark",
            "-i",
            interface_name,
            "-a",
            f"duration:{capture_seconds}",
        ]
    )
    return rows_to_events(rows)
