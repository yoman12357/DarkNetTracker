from __future__ import annotations

from models import FeatureEvent, RawEvent


def extract_features(events: list[RawEvent]) -> list[FeatureEvent]:
    last_timestamp_by_session: dict[str, float] = {}
    features: list[FeatureEvent] = []

    for event in sorted(events, key=lambda item: (item.session_id, item.sequence_no)):
        previous_timestamp = last_timestamp_by_session.get(event.session_id, event.timestamp)
        packet_delta = max(event.timestamp - previous_timestamp, 0.0)
        size_bucket = int(round(event.packet_size / 64))
        features.append(
            FeatureEvent(
                timestamp=event.timestamp,
                packet_size=event.packet_size,
                direction=event.direction,
                session_id=event.session_id,
                node_id=event.node_id,
                node_type=event.node_type,
                src_ip=event.src_ip,
                dst_ip=event.dst_ip,
                sequence_no=event.sequence_no,
                region_hint=event.region_hint,
                label=event.label,
                packet_delta=round(packet_delta, 6),
                size_bucket=size_bucket,
                protocol=event.protocol,
                src_port=event.src_port,
                dst_port=event.dst_port,
                flow_id=event.flow_id,
                event_span=event.event_span,
                packet_count=event.packet_count,
            )
        )
        last_timestamp_by_session[event.session_id] = event.timestamp

    return features
