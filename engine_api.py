from __future__ import annotations

import argparse
import json
import logging
import sys

from service import run_pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Structured analysis API bridge")
    parser.add_argument("--mode", choices=("simulate", "replay", "pcap", "live"), required=True)
    parser.add_argument("--dataset")
    parser.add_argument("--sessions", type=int, default=18)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--top-k", type=int, default=8)
    parser.add_argument("--write-logs", action="store_true")
    parser.add_argument("--interface", default="any")
    parser.add_argument("--capture-seconds", type=int, default=8)
    return parser.parse_args()


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stderr,
    )
    try:
        args = parse_args()
        result = run_pipeline(
            mode=args.mode,
            dataset=args.dataset,
            sessions=args.sessions,
            seed=args.seed,
            top_k=args.top_k,
            write_logs=args.write_logs,
            interface=args.interface,
            capture_seconds=args.capture_seconds,
        )
        print(json.dumps(result))
        return 0
    except Exception as exc:  # pragma: no cover - bridge safety
        logging.exception("Engine API execution failed")
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
