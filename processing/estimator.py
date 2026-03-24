from __future__ import annotations

from collections import defaultdict

from config import AppConfig
from models import RankedPath, RegionEstimate


def estimate_regions(
    ranked_paths: list[RankedPath],
    config: AppConfig,
) -> list[RegionEstimate]:
    if not ranked_paths:
        return []

    support_by_region: dict[str, float] = defaultdict(float)
    count_by_region: dict[str, int] = defaultdict(int)

    for path in ranked_paths:
        bias = config.suspicious_region_bias if path.suspicious else 1.0
        support_by_region[path.entry_region] += path.path_score * bias
        count_by_region[path.entry_region] += 1

    total_support = sum(
        support_by_region[region] * config.region_priors.get(region, 1.0)
        for region in support_by_region
    )
    if total_support <= 0:
        return []

    estimates = [
        RegionEstimate(
            region=region,
            confidence=round(
                (
                    support_by_region[region] * config.region_priors.get(region, 1.0)
                )
                / total_support,
                6,
            ),
            support=round(support_by_region[region], 6),
            path_count=count_by_region[region],
        )
        for region in support_by_region
    ]
    estimates.sort(key=lambda item: item.confidence, reverse=True)
    return estimates
