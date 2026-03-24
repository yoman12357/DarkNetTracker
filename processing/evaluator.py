from __future__ import annotations

from collections import Counter

from models import EvaluationSummary, RankedPath, RawEvent, RegionEstimate


def evaluate_estimates(
    raw_events: list[RawEvent],
    ranked_paths: list[RankedPath],
    estimates: list[RegionEstimate],
) -> EvaluationSummary:
    suspicious_entry_regions = [
        event.region_hint
        for event in raw_events
        if event.label == "suspicious" and event.node_type == "ENTRY"
    ]
    true_origin_region = (
        Counter(suspicious_entry_regions).most_common(1)[0][0]
        if suspicious_entry_regions
        else None
    )

    suspicious_sessions = {
        event.session_id
        for event in raw_events
        if event.label == "suspicious"
    }
    correctly_estimated_sessions = 0
    if true_origin_region is not None:
        for path in ranked_paths:
            if path.session_id in suspicious_sessions and path.entry_region == true_origin_region:
                correctly_estimated_sessions += 1

    total_suspicious_paths = sum(1 for path in ranked_paths if path.session_id in suspicious_sessions)
    predicted_origin_region = estimates[0].region if estimates else None
    session_accuracy = (
        correctly_estimated_sessions / total_suspicious_paths
        if total_suspicious_paths
        else 0.0
    )

    return EvaluationSummary(
        suspicious_sessions=len(suspicious_sessions),
        correctly_estimated_sessions=correctly_estimated_sessions,
        session_accuracy=round(session_accuracy, 6),
        true_origin_region=true_origin_region,
        predicted_origin_region=predicted_origin_region,
    )
