from __future__ import annotations

from collections import defaultdict

from config import AppConfig
from models import CorrelationCandidate, FeatureEvent


def correlate_hops(
    features: list[FeatureEvent],
    config: AppConfig,
) -> list[CorrelationCandidate]:
    grouped: dict[str, list[FeatureEvent]] = defaultdict(list)
    for event in features:
        grouped[event.node_type].append(event)

    correlations: list[CorrelationCandidate] = []
    stage_pairs = [("ENTRY", "MIDDLE"), ("MIDDLE", "EXIT")]

    for left_type, right_type in stage_pairs:
        left_events = sorted(grouped[left_type], key=lambda item: item.timestamp)
        right_events = sorted(grouped[right_type], key=lambda item: item.timestamp)

        for left in left_events:
            for right in right_events:
                if right.timestamp < left.timestamp:
                    continue

                capture_like = left.direction == "captured" and right.direction == "captured"
                effective_time_threshold = (
                    config.time_threshold * config.capture_time_threshold_multiplier
                    if capture_like
                    else config.time_threshold
                )
                effective_size_threshold = int(
                    round(
                        config.size_threshold * config.capture_size_threshold_multiplier
                        if capture_like
                        else config.size_threshold
                    )
                )
                effective_score_threshold = (
                    config.capture_score_threshold if capture_like else config.score_threshold
                )

                time_delta = round(right.timestamp - left.timestamp, 6)
                if time_delta > effective_time_threshold:
                    break

                size_delta = abs(right.packet_size - left.packet_size)
                if size_delta > effective_size_threshold:
                    continue

                sequence_gap = abs(right.sequence_no - left.sequence_no)
                if right.sequence_no != left.sequence_no + 1:
                    continue

                # Normalize observed deltas so the weighted score remains meaningful
                # across realistic timing and packet-size ranges.
                time_similarity = 1 / (1 + (time_delta / effective_time_threshold))
                size_similarity = 1 / (1 + (size_delta / effective_size_threshold))
                sequence_similarity = 1 / (1 + sequence_gap)
                session_match = left.session_id == right.session_id
                label_match = left.label == right.label
                session_bonus = 0.08 if session_match else -0.12
                label_bonus = 0.03 if label_match else -0.03
                capture_bonus = 0.04 if capture_like and left.protocol == right.protocol else 0.0
                final_score = (
                    config.time_weight * time_similarity
                    + config.size_weight * size_similarity
                    + config.sequence_weight * sequence_similarity
                    + session_bonus
                    + label_bonus
                    + capture_bonus
                )
                final_score = max(0.0, min(1.0, final_score))

                if final_score < effective_score_threshold:
                    continue

                correlations.append(
                    CorrelationCandidate(
                        left_node_id=left.node_id,
                        left_node_type=left.node_type,
                        right_node_id=right.node_id,
                        right_node_type=right.node_type,
                        left_region=left.region_hint,
                        right_region=right.region_hint,
                        time_delta=time_delta,
                        size_delta=size_delta,
                        sequence_gap=sequence_gap,
                        time_similarity=round(time_similarity, 6),
                        size_similarity=round(size_similarity, 6),
                        sequence_similarity=round(sequence_similarity, 6),
                        final_score=round(final_score, 6),
                        left_session_id=left.session_id,
                        right_session_id=right.session_id,
                        left_label=left.label,
                        right_label=right.label,
                        session_match=session_match,
                        label_match=label_match,
                    )
                )

    correlations.sort(key=lambda item: item.final_score, reverse=True)
    return correlations
