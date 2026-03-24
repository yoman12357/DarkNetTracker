from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    time_threshold: float = 0.6
    size_threshold: int = 160
    time_weight: float = 0.45
    size_weight: float = 0.35
    sequence_weight: float = 0.20
    score_threshold: float = 0.70
    top_k_paths: int = 8
    logs_dir: Path = Path("logs")
    raw_log_path: Path = Path("logs/raw_events.jsonl")
    feature_log_path: Path = Path("logs/features.jsonl")
    correlation_log_path: Path = Path("logs/correlations.jsonl")
    estimate_log_path: Path = Path("logs/estimates.jsonl")
    suspicious_path_score: float = 0.82
    suspicious_region_bias: float = 1.18
    partial_path_penalty: float = 0.88
    capture_time_threshold_multiplier: float = 1.8
    capture_size_threshold_multiplier: float = 1.5
    capture_score_threshold: float = 0.62
    replay_speed: float = 1.0
    stage_order: tuple[str, ...] = ("ENTRY", "MIDDLE", "EXIT")
    region_priors: dict[str, float] = field(
        default_factory=lambda: {
            "NL": 1.00,
            "DE": 1.00,
            "FR": 1.00,
            "SE": 1.00,
            "PL": 1.00,
            "US": 1.00,
            "SG": 1.00,
        }
    )
