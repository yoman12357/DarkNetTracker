from __future__ import annotations

import unittest

from capture.pcap import rows_to_events


class PcapParserTests(unittest.TestCase):
    def test_rows_to_events_builds_clustered_sessions(self) -> None:
        rows = [
            ["1711000100.00", "520", "10.0.0.1", "1.1.1.1", "6", "40000", "443", "", ""],
            ["1711000100.06", "540", "10.0.0.1", "1.1.1.1", "6", "40000", "443", "", ""],
            ["1711000100.11", "545", "1.1.1.1", "10.0.0.1", "6", "443", "40000", "", ""],
            ["1711000100.35", "690", "10.0.0.2", "2.2.2.2", "6", "40100", "80", "", ""],
            ["1711000100.41", "720", "10.0.0.2", "2.2.2.2", "6", "40100", "80", "", ""],
            ["1711000100.66", "610", "2.2.2.2", "10.0.0.2", "6", "80", "40100", "", ""],
            ["1711000100.95", "480", "10.0.0.3", "3.3.3.3", "17", "", "", "53000", "53"],
            ["1711000101.02", "500", "10.0.0.3", "3.3.3.3", "17", "", "", "53000", "53"],
            ["1711000101.10", "470", "3.3.3.3", "10.0.0.3", "17", "", "", "53", "53000"],
        ]

        events = rows_to_events(rows)

        self.assertEqual(len(events), 3)
        self.assertEqual(events[0].sequence_no, 1)
        self.assertEqual(events[-1].sequence_no, 3)
        self.assertTrue(all(event.flow_id for event in events))
        self.assertTrue(all(event.packet_count >= 1 for event in events))


if __name__ == "__main__":
    unittest.main()
