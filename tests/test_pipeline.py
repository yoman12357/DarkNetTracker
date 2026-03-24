from __future__ import annotations

import unittest
from pathlib import Path

from capture.replay import run_replay
from capture.simulate import generate_simulated_events
from config import AppConfig
from processing.correlator import correlate_hops
from processing.estimator import estimate_regions
from processing.evaluator import evaluate_estimates
from processing.features import extract_features
from processing.graph import build_ranked_paths


class PipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = AppConfig()

    def test_simulation_pipeline_produces_estimate(self) -> None:
        raw_events = generate_simulated_events(16, self.config, seed=7)
        features = extract_features(raw_events)
        correlations = correlate_hops(features, self.config)
        ranked_paths = build_ranked_paths(correlations, self.config)
        estimates = estimate_regions(ranked_paths, self.config)
        evaluation = evaluate_estimates(raw_events, ranked_paths, estimates)

        self.assertTrue(raw_events)
        self.assertTrue(features)
        self.assertTrue(correlations)
        self.assertTrue(ranked_paths)
        self.assertTrue(estimates)
        self.assertEqual(estimates[0].region, "DE")
        self.assertGreaterEqual(evaluation.session_accuracy, 0.5)

    def test_replay_pipeline_produces_stable_top_region(self) -> None:
        dataset = Path("tests/sample_data/replay_dataset.jsonl")
        raw_events = run_replay(dataset, self.config)
        features = extract_features(raw_events)
        correlations = correlate_hops(features, self.config)
        ranked_paths = build_ranked_paths(correlations, self.config)
        estimates = estimate_regions(ranked_paths, self.config)
        evaluation = evaluate_estimates(raw_events, ranked_paths, estimates)

        self.assertEqual(estimates[0].region, "DE")
        self.assertGreater(estimates[0].confidence, 0.30)
        self.assertEqual(evaluation.true_origin_region, "DE")
        self.assertEqual(evaluation.predicted_origin_region, "DE")

    def test_csv_replay_matches_jsonl_replay(self) -> None:
        jsonl_events = run_replay(Path("tests/sample_data/replay_dataset.jsonl"), self.config)
        csv_events = run_replay(Path("tests/sample_data/replay_dataset.csv"), self.config)

        self.assertEqual(len(jsonl_events), len(csv_events))
        self.assertEqual(jsonl_events[0].session_id, csv_events[0].session_id)
        self.assertEqual(jsonl_events[-1].node_id, csv_events[-1].node_id)


if __name__ == "__main__":
    unittest.main()
