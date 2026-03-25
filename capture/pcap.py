from __future__ import annotations

import csv
import hashlib
import shutil
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from data.nodes import node_ids_by_type, node_ip, node_region
from models import RawEvent

FIELDS = (
    "frame.time_epoch",
    "frame.len",
    "ip.src",
    "ip.dst",
    "ip.proto",
    "tcp.srcport",
    "tcp.dstport",
    "udp.srcport",
    "udp.dstport",
    "tls.handshake.version",
    "tls.record.version",
    "http2.streamid",
    "quic.version",
    "dns.qry.name",
)
FLOW_IDLE_THRESHOLD = 0.9
CLUSTER_GAP_THRESHOLD = 1.4
MIN_CLUSTER_BURSTS = 2
MAX_SESSIONS_PER_CLUSTER = 8


@dataclass(frozen=True)
class PacketRecord:
    timestamp: float
    packet_size: int
    src_ip: str
    dst_ip: str
    protocol: str
    src_port: int
    dst_port: int
    query_name: str


@dataclass(frozen=True)
class FlowBurst:
    burst_id: str
    start_time: float
    end_time: float
    avg_size: int
    packet_count: int
    src_ip: str
    dst_ip: str
    protocol: str
    src_port: int
    dst_port: int
    query_name: str
    flow_key: tuple[str, str, str, int, int]
    suspicious_score: float


def load_pcap_events(dataset_path: Path) -> list[RawEvent]:
    rows = _extract_tshark_rows(
        [
            "tshark",
            "-r",
            str(dataset_path),
        ]
    )
    packets = _rows_to_packets(rows)
    return _packets_to_events(packets)


def rows_to_events(rows: list[list[str]]) -> list[RawEvent]:
    packets = _rows_to_packets(rows)
    return _packets_to_events(packets)


def _extract_tshark_rows(base_command: list[str]) -> list[list[str]]:
    if shutil.which("tshark") is None:
        raise RuntimeError("tshark is required for PCAP parsing but was not found")

    command = [
        *base_command,
        "-T",
        "fields",
        "-E",
        "separator=,",
    ]
    for field in FIELDS:
        command.extend(["-e", field])

    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return list(csv.reader(line for line in result.stdout.splitlines() if line.strip()))


def _rows_to_packets(rows: list[list[str]]) -> list[PacketRecord]:
    packets: list[PacketRecord] = []
    for row in rows:
        if len(row) < len(FIELDS):
            row = row + [""] * (len(FIELDS) - len(row))

        (
            timestamp,
            frame_len,
            src_ip,
            dst_ip,
            ip_proto,
            tcp_src,
            tcp_dst,
            udp_src,
            udp_dst,
            tls_handshake_version,
            tls_record_version,
            http2_stream_id,
            quic_version,
            dns_query_name,
        ) = row[: len(FIELDS)]
        if not timestamp or not frame_len or not src_ip or not dst_ip:
            continue

        src_port = _first_int(tcp_src, udp_src)
        dst_port = _first_int(tcp_dst, udp_dst)
        protocol = _protocol_name({
            "ip_proto": ip_proto,
            "tcp_src": tcp_src,
            "tcp_dst": tcp_dst,
            "udp_src": udp_src,
            "udp_dst": udp_dst,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": src_port,
            "dst_port": dst_port,
            "tls_handshake_version": tls_handshake_version,
            "tls_record_version": tls_record_version,
            "http2_stream_id": http2_stream_id,
            "quic_version": quic_version,
            "dns_query_name": dns_query_name,
        })
        packets.append(
            PacketRecord(
                timestamp=float(timestamp),
                packet_size=int(float(frame_len)),
                src_ip=src_ip,
                dst_ip=dst_ip,
                protocol=protocol,
                src_port=src_port,
                dst_port=dst_port,
                query_name=dns_query_name,
            )
        )
    return packets


def _packets_to_events(packets: list[PacketRecord]) -> list[RawEvent]:
    bursts = _build_flow_bursts(packets)
    clusters = _cluster_bursts(bursts)
    events: list[RawEvent] = []

    entry_nodes = node_ids_by_type("ENTRY")
    middle_nodes = node_ids_by_type("MIDDLE")
    exit_nodes = node_ids_by_type("EXIT")

    session_index = 1
    for cluster in clusters:
        sequence_groups = _cluster_to_sequences(cluster)
        for sequence_bursts in sequence_groups:
            if len(sequence_bursts) < 2:
                continue

            session_id = f"PCAP{session_index:03d}"
            session_index += 1
            label = _classify_cluster(sequence_bursts)
            node_choices = [entry_nodes, middle_nodes, exit_nodes]

            for sequence_no, burst in enumerate(sequence_bursts, start=1):
                node_type = ("ENTRY", "MIDDLE", "EXIT")[sequence_no - 1]
                node_id = _map_burst_to_node(
                    burst=burst,
                    candidates=node_choices[sequence_no - 1],
                )
                events.append(
                    RawEvent(
                        timestamp=round(burst.start_time, 6),
                        packet_size=burst.avg_size,
                        direction="captured",
                        session_id=session_id,
                        node_id=node_id,
                        node_type=node_type,
                        src_ip=burst.src_ip,
                        dst_ip=burst.dst_ip or node_ip(node_id),
                        sequence_no=sequence_no,
                        region_hint=node_region(node_id),
                        label=label,
                        protocol=burst.protocol,
                        src_port=burst.src_port,
                        dst_port=burst.dst_port,
                        flow_id=burst.burst_id,
                        event_span=round(burst.end_time - burst.start_time, 6),
                        packet_count=burst.packet_count,
                    )
                )

    return events


def _build_flow_bursts(packets: list[PacketRecord]) -> list[FlowBurst]:
    grouped: dict[tuple[str, str, str, int, int], list[PacketRecord]] = defaultdict(list)
    for packet in sorted(packets, key=lambda item: item.timestamp):
        grouped[_flow_key(packet)].append(packet)

    bursts: list[FlowBurst] = []
    for flow_key, flow_packets in grouped.items():
        current: list[PacketRecord] = []
        for packet in flow_packets:
            if current and packet.timestamp - current[-1].timestamp > FLOW_IDLE_THRESHOLD:
                bursts.append(_collapse_burst(flow_key, current))
                current = []
            current.append(packet)
        if current:
            bursts.append(_collapse_burst(flow_key, current))

    bursts.sort(key=lambda item: item.start_time)
    return bursts


def _cluster_bursts(bursts: list[FlowBurst]) -> list[list[FlowBurst]]:
    clusters: list[list[FlowBurst]] = []
    current: list[FlowBurst] = []

    for burst in bursts:
        if current and burst.start_time - current[-1].start_time > CLUSTER_GAP_THRESHOLD:
            if len(current) >= MIN_CLUSTER_BURSTS:
                clusters.append(current)
            current = []
        current.append(burst)

    if len(current) >= MIN_CLUSTER_BURSTS:
        clusters.append(current)

    return clusters


def _cluster_to_sequences(cluster: list[FlowBurst]) -> list[list[FlowBurst]]:
    informative = [
        burst
        for burst in cluster
        if not (burst.src_ip.startswith("127.") and burst.dst_ip.startswith("127."))
    ]
    if len(informative) < 3:
        informative = cluster

    priority = sorted(
        informative,
        key=lambda burst: (
            burst.start_time,
            -(burst.packet_count * max(burst.avg_size, 1)),
        ),
    )

    sequences: list[list[FlowBurst]] = []
    for index in range(0, len(priority), 3):
        sequence = priority[index : index + 3]
        if len(sequence) >= 2:
            sequences.append(sequence)
        if len(sequences) >= MAX_SESSIONS_PER_CLUSTER:
            break

    if not sequences and priority:
        sequences.append(priority[: min(3, len(priority))])

    return sequences


def _collapse_burst(
    flow_key: tuple[str, str, str, int, int],
    packets: list[PacketRecord],
) -> FlowBurst:
    start_time = packets[0].timestamp
    end_time = packets[-1].timestamp
    avg_size = int(round(sum(packet.packet_size for packet in packets) / len(packets)))
    suspicious_score = (
        0.45 * min(len(packets) / 5, 1.0)
        + 0.30 * min(avg_size / 900, 1.0)
        + 0.25 * min((end_time - start_time) / 1.5, 1.0)
    )
    burst_material = "|".join(
        [
            flow_key[0],
            flow_key[1],
            flow_key[2],
            str(flow_key[3]),
            str(flow_key[4]),
            f"{start_time:.6f}",
            f"{end_time:.6f}",
        ]
    )
    burst_id = hashlib.sha1(burst_material.encode("ascii", "ignore")).hexdigest()[:12]
    return FlowBurst(
        burst_id=burst_id,
        start_time=start_time,
        end_time=end_time,
        avg_size=avg_size,
        packet_count=len(packets),
        src_ip=packets[0].src_ip,
        dst_ip=packets[0].dst_ip,
        protocol=packets[0].protocol,
        src_port=packets[0].src_port,
        dst_port=packets[0].dst_port,
        query_name=packets[0].query_name,
        flow_key=flow_key,
        suspicious_score=round(suspicious_score, 6),
    )


def _classify_cluster(bursts: list[FlowBurst]) -> str:
    avg_burst_size = sum(burst.avg_size for burst in bursts) / len(bursts)
    avg_packet_count = sum(burst.packet_count for burst in bursts) / len(bursts)
    avg_suspicious_score = sum(burst.suspicious_score for burst in bursts) / len(bursts)
    if avg_burst_size >= 700 or avg_packet_count >= 3.5 or avg_suspicious_score >= 0.62:
        return "suspicious"
    return "normal"


def _map_burst_to_node(*, burst: FlowBurst, candidates: list[str]) -> str:
    if not candidates:
        raise ValueError("node candidates cannot be empty")

    fingerprint = (
        f"{burst.src_ip}|{burst.dst_ip}|{burst.protocol}|"
        f"{burst.src_port}|{burst.dst_port}|{burst.avg_size}|{burst.packet_count}"
    )
    index = int(hashlib.sha1(fingerprint.encode("ascii", "ignore")).hexdigest(), 16) % len(candidates)
    return candidates[index]


def _flow_key(packet: PacketRecord) -> tuple[str, str, str, int, int]:
    left = f"{packet.src_ip}:{packet.src_port}"
    right = f"{packet.dst_ip}:{packet.dst_port}"
    ordered = sorted((left, right))
    return (ordered[0], ordered[1], packet.protocol, min(packet.src_port, packet.dst_port), max(packet.src_port, packet.dst_port))


def _protocol_name(context: dict[str, object]) -> str:
    src_ip = str(context["src_ip"])
    dst_ip = str(context["dst_ip"])
    src_port = int(context["src_port"])
    dst_port = int(context["dst_port"])
    ip_proto = str(context["ip_proto"])
    tls_handshake_version = str(context["tls_handshake_version"])
    tls_record_version = str(context["tls_record_version"])
    http2_stream_id = str(context["http2_stream_id"])
    quic_version = str(context["quic_version"])
    dns_query_name = str(context["dns_query_name"]).strip()

    if src_ip.startswith("127.") and dst_ip.startswith("127."):
        if src_port == 3000 or dst_port == 3000:
            return "LOCAL_APP"
        return "LOOPBACK"

    if dns_query_name and 443 in {src_port, dst_port}:
        return "DNS_OVER_HTTPS"
    if dns_query_name and 853 in {src_port, dst_port}:
        return "DNS_OVER_TLS"
    if dns_query_name:
        return "DNS"
    if quic_version:
        return "QUIC"
    if http2_stream_id:
        return "HTTP2"
    if tls_handshake_version or tls_record_version:
        version = tls_handshake_version or tls_record_version
        if version in {"0x0304", "772"}:
            return "TLS1.3"
        if version in {"0x0303", "771"}:
            return "TLS1.2"
        return "TLS"
    if 443 in {src_port, dst_port}:
        return "HTTPS"
    if 80 in {src_port, dst_port}:
        return "HTTP"
    if ip_proto == "1":
        return "ICMP"
    if ip_proto == "17":
        return "UDP"
    if ip_proto == "6":
        return "TCP"
    return "IP"


def _first_int(*values: str) -> int:
    for value in values:
        if value:
            return int(value)
    return 0
