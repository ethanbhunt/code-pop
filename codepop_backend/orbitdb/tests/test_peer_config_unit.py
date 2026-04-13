from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import peer_config


def test_get_peer_url_and_defaults():
    assert peer_config.get_peer_url("peer_1") == "http://localhost:3001"
    assert peer_config.get_peer_url("missing") is None
    assert peer_config.get_default_peer_url() == "http://localhost:3001"


def test_get_all_peer_urls_ordered():
    assert peer_config.get_all_peer_urls() == [
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]


def test_get_peer_info_contains_expected_sections():
    info = peer_config.get_peer_info()

    assert set(info.keys()) == {"bootstrap", "peers", "seeding"}
    assert info["bootstrap"]["url"] == "http://localhost:3000"
    assert "peer_1" in info["peers"]
    assert info["seeding"]["default_peer"] == "http://localhost:3001"

    assert peer_config.get_all_peer_urls() == [
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    # Execute formatting/print path for full helper coverage.
    peer_config.print_peer_config()
