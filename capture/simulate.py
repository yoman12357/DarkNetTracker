from __future__ import annotations

import random

from config import AppConfig
from data.nodes import NODES, node_ids_by_type, node_ip, node_region
from models import RawEvent


def generate_simulated_events(
    session_count: int,
    config: AppConfig,
    seed: int,
) -> list[RawEvent]:
    rng = random.Random(seed)
    entry_nodes = node_ids_by_type("ENTRY")
    middle_nodes = node_ids_by_type("MIDDLE")
    exit_nodes = node_ids_by_type("EXIT")
    suspicious_origin = "DE"
    current_time = 1_710_000_000.0
    events: list[RawEvent] = []

    for index in range(session_count):
        label = "suspicious" if index % 4 == 0 else "normal"
        target_origin = suspicious_origin if label == "suspicious" else rng.choice(
            [region for region in config.region_priors if region != suspicious_origin]
        )
        session_id = f"S{index + 1:03d}"
        path = _pick_path(entry_nodes, middle_nodes, exit_nodes, target_origin, rng)
        base_size = 720 if label == "suspicious" else rng.randint(420, 620)
        jitter = 0.05 if label == "suspicious" else 0.18
        direction = "outbound"

        for sequence_no, node_id in enumerate(path, start=1):
            packet_size = base_size + rng.randint(-30, 30)
            current_time += rng.uniform(0.04, jitter)
            src_ip = f"10.0.{index % 7}.{sequence_no}"
            dst_ip = node_ip(node_id)
            events.append(
                RawEvent(
                    timestamp=round(current_time, 6),
                    packet_size=packet_size,
                    direction=direction,
                    session_id=session_id,
                    node_id=node_id,
                    node_type=NODES[node_id]["node_type"],
                    src_ip=src_ip,
                    dst_ip=dst_ip,
                    sequence_no=sequence_no,
                    region_hint=node_region(node_id),
                    label=label,
                )
            )
        current_time += rng.uniform(0.3, 0.8)

    return events


def _pick_path(
    entry_nodes: list[str],
    middle_nodes: list[str],
    exit_nodes: list[str],
    target_origin: str,
    rng: random.Random,
) -> tuple[str, str, str]:
    entry_candidates = [node for node in entry_nodes if node_region(node) == target_origin]
    entry_node = rng.choice(entry_candidates or entry_nodes)
    middle_node = rng.choice(middle_nodes)
    exit_node = rng.choice(exit_nodes)
    return (entry_node, middle_node, exit_node)
