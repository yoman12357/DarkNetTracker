from __future__ import annotations

import argparse

from service import run_pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Traffic correlation-based location estimation simulator."
    )
    parser.add_argument(
        "--mode",
        choices=("simulate", "replay", "pcap", "live"),
        default="simulate",
        help="Choose between synthetic traffic generation, replay analysis, PCAP analysis, and live capture.",
    )
    parser.add_argument(
        "--dataset",
        default="tests/sample_data/replay_dataset.jsonl",
        help="JSONL dataset path used in replay mode.",
    )
    parser.add_argument(
        "--sessions",
        type=int,
        default=18,
        help="Number of simulated sessions in simulate mode.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=7,
        help="Deterministic seed for reproducible simulations.",
    )
    parser.add_argument(
        "--write-logs",
        action="store_true",
        help="Write raw, feature, correlation, and estimate logs to ./logs.",
    )
    parser.add_argument(
        "--interface",
        default="any",
        help="Interface name for live capture mode.",
    )
    parser.add_argument(
        "--capture-seconds",
        type=int,
        default=8,
        help="Live capture duration in seconds.",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=None,
        help="Override the number of ranked paths shown in the report.",
    )
    return parser.parse_args()


def main() -> int:
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
    print(result["report"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
