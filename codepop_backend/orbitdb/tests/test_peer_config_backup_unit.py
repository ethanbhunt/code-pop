from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import peer_config_backup


def test_backup_peer_urls_and_defaults():
    assert peer_config_backup.get_peer_url("peer_1") == "http://localhost:3001"
    assert peer_config_backup.get_peer_url("missing") is None
    assert peer_config_backup.get_default_peer_url() == "http://localhost:3001"


def test_backup_peer_info_and_print():
    info = peer_config_backup.get_peer_info()

    assert set(info.keys()) == {"bootstrap", "peers", "seeding"}
    assert "peer_2" in info["peers"]
    assert info["seeding"]["peer_delay"] == 0.5

    # Ensure printing path executes for coverage.
    peer_config_backup.print_peer_config()
