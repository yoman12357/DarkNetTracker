from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class RawEvent:
    timestamp: float
    packet_size: int
    direction: str
    session_id: str
    node_id: str
    node_type: str
    src_ip: str
    dst_ip: str
    sequence_no: int
    region_hint: str
    label: str
    protocol: str = ""
    src_port: int = 0
    dst_port: int = 0
    flow_id: str = ""
    event_span: float = 0.0
    packet_count: int = 1

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class FeatureEvent:
    timestamp: float
    packet_size: int
    direction: str
    session_id: str
    node_id: str
    node_type: str
    src_ip: str
    dst_ip: str
    sequence_no: int
    region_hint: str
    label: str
    packet_delta: float
    size_bucket: int
    protocol: str = ""
    src_port: int = 0
    dst_port: int = 0
    flow_id: str = ""
    event_span: float = 0.0
    packet_count: int = 1

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class CorrelationCandidate:
    left_node_id: str
    left_node_type: str
    right_node_id: str
    right_node_type: str
    left_region: str
    right_region: str
    time_delta: float
    size_delta: int
    sequence_gap: int
    time_similarity: float
    size_similarity: float
    sequence_similarity: float
    final_score: float
    left_session_id: str
    right_session_id: str
    left_label: str
    right_label: str
    session_match: bool
    label_match: bool

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class RankedPath:
    entry_node_id: str
    middle_node_id: str
    exit_node_id: str
    entry_region: str
    middle_region: str
    exit_region: str
    path_score: float
    suspicious: bool
    session_overlap: bool
    label_pair: tuple[str, str]
    session_id: str
    path_kind: str = "complete"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class RegionEstimate:
    region: str
    confidence: float
    support: float
    path_count: int

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class EvaluationSummary:
    suspicious_sessions: int
    correctly_estimated_sessions: int
    session_accuracy: float
    true_origin_region: str | None
    predicted_origin_region: str | None

    def to_dict(self) -> dict:
        return asdict(self)
