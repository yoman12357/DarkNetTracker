from __future__ import annotations

import unittest

from capture.simulate import generate_simulated_events
from config import AppConfig
from processing.correlator import correlate_hops
from processing.estimator import estimate_regions
from processing.evaluator import evaluate_estimates
from processing.features import extract_features
from processing.graph import build_ranked_paths


class BenchmarkRegressionTests(unittest.TestCase):
    def test_simulation_accuracy_is_stable_across_multiple_seeds(self) -> None:
        config = AppConfig()
        seeds = range(1, 11)
        top_region_hits = 0
        session_accuracies: list[float] = []

        for seed in seeds:
            raw_events = generate_simulated_events(20, config, seed=seed)
            features = extract_features(raw_events)
            correlations = correlate_hops(features, config)
            ranked_paths = build_ranked_paths(correlations, config)
            estimates = estimate_regions(ranked_paths, config)
            evaluation = evaluate_estimates(raw_events, ranked_paths, estimates)

            if estimates and estimates[0].region == "DE":
                top_region_hits += 1
            session_accuracies.append(evaluation.session_accuracy)

        average_accuracy = sum(session_accuracies) / len(session_accuracies)

        self.assertGreaterEqual(top_region_hits, 8)
        self.assertGreaterEqual(average_accuracy, 0.60)


if __name__ == "__main__":
    unittest.main()
