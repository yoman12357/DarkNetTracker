from __future__ import annotations

from models import (
    CorrelationCandidate,
    EvaluationSummary,
    FeatureEvent,
    RankedPath,
    RawEvent,
    RegionEstimate,
)


def render_report(
    raw_events: list[RawEvent],
    features: list[FeatureEvent],
    correlations: list[CorrelationCandidate],
    ranked_paths: list[RankedPath],
    estimates: list[RegionEstimate],
    evaluation: EvaluationSummary,
    config,
) -> str:
    lines: list[str] = []
    lines.append("Traffic Correlation-Based Location Estimation")
    lines.append("=" * 48)
    lines.append("")
    lines.append("Summary")
    lines.append("-" * 48)
    lines.append(f"Raw events:        {len(raw_events)}")
    lines.append(f"Feature events:    {len(features)}")
    lines.append(f"Correlations:      {len(correlations)}")
    lines.append(f"Ranked paths:      {len(ranked_paths)}")
    lines.append(f"Score threshold:   {config.score_threshold:.2f}")
    lines.append(f"Top-K paths:       {config.top_k_paths}")
    lines.append("")
    lines.append("Top Estimated Regions")
    lines.append("-" * 48)

    if not estimates:
        lines.append("No estimates available.")
    else:
        for estimate in estimates[:5]:
            lines.append(
                f"{estimate.region:>3}  confidence={estimate.confidence * 100:6.2f}%"
                f"  support={estimate.support:6.3f}  paths={estimate.path_count}"
            )

    lines.append("")
    lines.append("Evaluation")
    lines.append("-" * 48)
    lines.append(f"Suspicious sessions:        {evaluation.suspicious_sessions}")
    lines.append(
        f"Session path accuracy:      {evaluation.session_accuracy * 100:6.2f}%"
    )
    lines.append(
        f"True suspicious origin:     {evaluation.true_origin_region or 'N/A'}"
    )
    lines.append(
        f"Predicted top origin:       {evaluation.predicted_origin_region or 'N/A'}"
    )

    lines.append("")
    lines.append("Top Correlated Paths")
    lines.append("-" * 48)

    if not ranked_paths:
        lines.append("No correlated paths passed the threshold.")
    else:
        for path in ranked_paths[: config.top_k_paths]:
            lines.append(
                f"{path.entry_node_id} -> {path.middle_node_id} -> {path.exit_node_id}"
                f"  score={path.path_score:.3f}"
                f"  origin={path.entry_region}"
                f"  session={path.session_id}"
                f"  kind={path.path_kind}"
                f"  suspicious={'yes' if path.suspicious else 'no'}"
            )

    lines.append("")
    lines.append("Top Hop Correlations")
    lines.append("-" * 48)
    if not correlations:
        lines.append("No hop correlations passed the threshold.")
    else:
        for candidate in correlations[:8]:
            lines.append(
                f"{candidate.left_node_type}->{candidate.right_node_type}"
                f"  {candidate.left_node_id} -> {candidate.right_node_id}"
                f"  score={candidate.final_score:.3f}"
                f"  dt={candidate.time_delta:.3f}"
                f"  ds={candidate.size_delta}"
                f"  session={'match' if candidate.session_match else 'mix'}"
            )

    return "\n".join(lines)
