from __future__ import annotations

NODES: dict[str, dict[str, str]] = {
    "entry-nl-1": {"node_type": "ENTRY", "region": "NL", "ip": "178.17.58.159"},
    "entry-de-1": {"node_type": "ENTRY", "region": "DE", "ip": "185.220.101.1"},
    "entry-fr-1": {"node_type": "ENTRY", "region": "FR", "ip": "51.158.99.10"},
    "entry-se-1": {"node_type": "ENTRY", "region": "SE", "ip": "109.228.52.5"},
    "entry-pl-1": {"node_type": "ENTRY", "region": "PL", "ip": "91.219.236.222"},
    "middle-nl-1": {"node_type": "MIDDLE", "region": "NL", "ip": "45.66.35.20"},
    "middle-de-1": {"node_type": "MIDDLE", "region": "DE", "ip": "185.220.102.7"},
    "middle-fr-1": {"node_type": "MIDDLE", "region": "FR", "ip": "51.68.204.14"},
    "middle-se-1": {"node_type": "MIDDLE", "region": "SE", "ip": "89.45.67.3"},
    "middle-us-1": {"node_type": "MIDDLE", "region": "US", "ip": "23.129.64.211"},
    "exit-us-1": {"node_type": "EXIT", "region": "US", "ip": "104.244.72.115"},
    "exit-sg-1": {"node_type": "EXIT", "region": "SG", "ip": "139.162.15.55"},
    "exit-de-1": {"node_type": "EXIT", "region": "DE", "ip": "185.220.103.8"},
    "exit-fr-1": {"node_type": "EXIT", "region": "FR", "ip": "163.172.43.201"},
}


def node_ids_by_type(node_type: str) -> list[str]:
    return [node_id for node_id, meta in NODES.items() if meta["node_type"] == node_type]


def node_region(node_id: str) -> str:
    return NODES[node_id]["region"]


def node_ip(node_id: str) -> str:
    return NODES[node_id]["ip"]
