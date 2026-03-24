from __future__ import annotations

import json
import csv
from pathlib import Path
from typing import Iterable


def read_jsonl(path: Path) -> list[dict]:
    payloads: list[dict] = []
    with path.open() as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            payloads.append(json.loads(stripped))
    return payloads


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")


def read_csv_rows(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            parsed: dict[str, object] = {}
            for key, value in row.items():
                if key in {"timestamp"}:
                    parsed[key] = float(value)
                elif key in {"packet_size", "sequence_no"}:
                    parsed[key] = int(value)
                else:
                    parsed[key] = value
            rows.append(parsed)
    return rows
