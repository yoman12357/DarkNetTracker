from __future__ import annotations

from pathlib import Path

from config import AppConfig
from models import RawEvent
from utils.io import read_csv_rows, read_jsonl


def run_replay(dataset_path: Path, config: AppConfig) -> list[RawEvent]:
    del config
    if dataset_path.suffix.lower() == ".csv":
        payloads = read_csv_rows(dataset_path)
    else:
        payloads = read_jsonl(dataset_path)
    return [RawEvent(**payload) for payload in payloads]
