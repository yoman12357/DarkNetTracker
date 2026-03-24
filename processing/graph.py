from __future__ import annotations

from collections import defaultdict

from config import AppConfig
from models import CorrelationCandidate, RankedPath


def build_ranked_paths(
    correlations: list[CorrelationCandidate],
    config: AppConfig,
) -> list[RankedPath]:
    first_hop: dict[str, list[CorrelationCandidate]] = defaultdict(list)
    second_hop: dict[str, list[CorrelationCandidate]] = defaultdict(list)

    for candidate in correlations:
        if candidate.left_node_type == "ENTRY" and candidate.right_node_type == "MIDDLE":
            first_hop[candidate.right_node_id].append(candidate)
        elif candidate.left_node_type == "MIDDLE" and candidate.right_node_type == "EXIT":
            second_hop[candidate.left_node_id].append(candidate)

    ranked_paths: list[RankedPath] = []
    seen_paths: set[tuple[str, str, str, str]] = set()
    for middle_node_id, left_candidates in first_hop.items():
        for left_candidate in left_candidates:
            for right_candidate in second_hop.get(middle_node_id, []):
                if left_candidate.right_session_id != right_candidate.left_session_id:
                    continue

                path_score = round(
                    (left_candidate.final_score + right_candidate.final_score) / 2,
                    6,
                )
                session_overlap = (
                    left_candidate.left_session_id == right_candidate.right_session_id
                    and left_candidate.right_session_id == right_candidate.left_session_id
                )
                if not session_overlap:
                    continue

                suspicious = (
                    path_score >= config.suspicious_path_score
                    and (
                        "suspicious" in left_candidate.left_label
                        or "suspicious" in right_candidate.right_label
                    )
                )
                session_id = left_candidate.left_session_id
                path_key = (
                    left_candidate.left_node_id,
                    middle_node_id,
                    right_candidate.right_node_id,
                    session_id,
                )
                if path_key in seen_paths:
                    continue
                seen_paths.add(path_key)
                ranked_paths.append(
                    RankedPath(
                        entry_node_id=left_candidate.left_node_id,
                        middle_node_id=middle_node_id,
                        exit_node_id=right_candidate.right_node_id,
                        entry_region=left_candidate.left_region,
                        middle_region=left_candidate.right_region,
                        exit_region=right_candidate.right_region,
                        path_score=path_score,
                        suspicious=suspicious,
                        session_overlap=session_overlap,
                        label_pair=(
                            left_candidate.left_label,
                            right_candidate.right_label,
                        ),
                        session_id=session_id,
                        path_kind="complete",
                    )
                )

    if ranked_paths:
        ranked_paths.sort(key=lambda item: item.path_score, reverse=True)
        return ranked_paths[: config.top_k_paths]

    # Preserve partial entry-to-middle evidence so the estimator can still
    # produce a probabilistic origin for sparse captures.
    for left_candidates in first_hop.values():
        for candidate in left_candidates:
            session_id = candidate.left_session_id
            path_key = (
                candidate.left_node_id,
                candidate.right_node_id,
                "PENDING",
                session_id,
            )
            if path_key in seen_paths:
                continue
            seen_paths.add(path_key)
            path_score = round(candidate.final_score * config.partial_path_penalty, 6)
            suspicious = (
                path_score >= config.suspicious_path_score
                and "suspicious" in candidate.left_label
            )
            ranked_paths.append(
                RankedPath(
                    entry_node_id=candidate.left_node_id,
                    middle_node_id=candidate.right_node_id,
                    exit_node_id="PENDING",
                    entry_region=candidate.left_region,
                    middle_region=candidate.right_region,
                    exit_region="UNK",
                    path_score=path_score,
                    suspicious=suspicious,
                    session_overlap=candidate.session_match,
                    label_pair=(candidate.left_label, candidate.right_label),
                    session_id=session_id,
                    path_kind="partial",
                )
            )

    ranked_paths.sort(key=lambda item: item.path_score, reverse=True)
    return ranked_paths[: config.top_k_paths]
