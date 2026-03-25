from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from capture.replay import run_replay
from capture.simulate import generate_simulated_events
from config import AppConfig
from processing.correlator import correlate_hops
from processing.estimator import estimate_regions
from processing.evaluator import evaluate_estimates
from processing.features import extract_features
from processing.graph import build_ranked_paths


def run_case(raw_events, config: AppConfig) -> dict[str, float | str | int]:
    features = extract_features(raw_events)
    correlations = correlate_hops(features, config)
    ranked_paths = build_ranked_paths(correlations, config)
    estimates = estimate_regions(ranked_paths, config)
    evaluation = evaluate_estimates(raw_events, ranked_paths, estimates)

    return {
        "raw_events": len(raw_events),
        "correlations": len(correlations),
        "ranked_paths": len(ranked_paths),
        "top_region": estimates[0].region if estimates else "N/A",
        "top_confidence": round(estimates[0].confidence, 4) if estimates else 0.0,
        "session_accuracy": round(evaluation.session_accuracy, 4),
    }


def main() -> None:
    config = AppConfig()
    seeds = list(range(1, 11))
    simulation_runs = [
        run_case(generate_simulated_events(20, config, seed=seed), config) for seed in seeds
    ]
    replay_run = run_case(run_replay(Path("tests/sample_data/replay_dataset.jsonl"), config), config)

    avg_accuracy = sum(run["session_accuracy"] for run in simulation_runs) / len(simulation_runs)
    de_hit_rate = sum(1 for run in simulation_runs if run["top_region"] == "DE") / len(simulation_runs)

    summary = {
        "simulation": {
            "runs": len(simulation_runs),
            "average_session_accuracy": round(avg_accuracy, 4),
            "top_region_de_hit_rate": round(de_hit_rate, 4),
            "results": simulation_runs,
        },
        "replay": replay_run,
    }

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
