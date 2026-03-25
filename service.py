from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any

from capture.replay import run_replay
from capture.live import capture_live_events
from capture.pcap import load_pcap_events
from capture.simulate import generate_simulated_events
from config import AppConfig
from processing.correlator import correlate_hops
from processing.estimator import estimate_regions
from processing.evaluator import evaluate_estimates
from processing.features import extract_features
from processing.graph import build_ranked_paths
from ui.terminal import render_report
from utils.io import write_jsonl


def _build_protocol_summary(raw_events: list[Any]) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for event in raw_events:
        protocol = getattr(event, "protocol", "") or "UNKNOWN"
        counts[protocol] = counts.get(protocol, 0) + 1

    total = sum(counts.values()) or 1
    summary = [
        {
            "protocol": protocol,
            "count": count,
            "share": round((count / total) * 100, 2),
        }
        for protocol, count in counts.items()
    ]
    summary.sort(key=lambda item: (-item["count"], item["protocol"]))
    return summary[:12]


def run_pipeline(
    *,
    mode: str,
    dataset: str | None = None,
    sessions: int = 18,
    seed: int = 7,
    top_k: int | None = None,
    write_logs: bool = False,
    interface: str | None = None,
    capture_seconds: int = 8,
) -> dict[str, Any]:
    config = AppConfig(top_k_paths=top_k or AppConfig().top_k_paths)

    if mode == "replay":
        if not dataset:
            raise ValueError("dataset is required in replay mode")
        raw_events = run_replay(Path(dataset), config)
    elif mode == "pcap":
        if not dataset:
            raise ValueError("dataset is required in pcap mode")
        raw_events = load_pcap_events(Path(dataset))
    elif mode == "live":
        raw_events = capture_live_events(interface or "any", capture_seconds)
    elif mode == "simulate":
        raw_events = generate_simulated_events(
            session_count=sessions,
            config=config,
            seed=seed,
        )
    else:
        raise ValueError(f"unsupported mode: {mode}")

    features = extract_features(raw_events)
    correlations = correlate_hops(features, config)
    ranked_paths = build_ranked_paths(correlations, config)
    estimates = estimate_regions(ranked_paths, config)
    evaluation = evaluate_estimates(raw_events, ranked_paths, estimates)

    if write_logs:
        write_jsonl(config.raw_log_path, (event.to_dict() for event in raw_events))
        write_jsonl(config.feature_log_path, (event.to_dict() for event in features))
        write_jsonl(
            config.correlation_log_path,
            (candidate.to_dict() for candidate in correlations),
        )
        write_jsonl(config.estimate_log_path, (estimate.to_dict() for estimate in estimates))

    report = render_report(
        raw_events,
        features,
        correlations,
        ranked_paths,
        estimates,
        evaluation,
        config,
    )

    return {
        "meta": {
            "mode": mode,
            "dataset": dataset,
            "sessions": sessions,
            "seed": seed,
            "topK": config.top_k_paths,
            "scoreThreshold": config.score_threshold,
            "interface": interface,
            "captureSeconds": capture_seconds,
        },
        "summary": {
            "rawEvents": len(raw_events),
            "featureEvents": len(features),
            "correlations": len(correlations),
            "rankedPaths": len(ranked_paths),
        },
        "estimates": [estimate.to_dict() for estimate in estimates],
        "evaluation": evaluation.to_dict(),
        "paths": [path.to_dict() for path in ranked_paths],
        "correlations": [candidate.to_dict() for candidate in correlations[:40]],
        "rawEvents": [event.to_dict() for event in raw_events[:100]],
        "protocolSummary": _build_protocol_summary(raw_events),
        "report": report,
    }


def run_pipeline_to_terminal(**kwargs: Any) -> str:
    return run_pipeline(**kwargs)["report"]
