from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import seed_data_backup


class DummySeeder:
    def __init__(self, url):
        self.url = url
        self.admin_token = "admin"
        self.calls = []

    def seed_users(self):
        self.calls.append("users")

    def seed_drinks(self):
        self.calls.append("drinks")

    def seed_preferences(self):
        self.calls.append("preferences")

    def seed_inventory(self):
        self.calls.append("inventory")

    def clear_data(self):
        self.calls.append("clear")

    def print_summary(self):
        self.calls.append("summary")

    def run_all(self):
        self.calls.append("all")


def _run_with_args(monkeypatch, argv):
    created = {}

    def make_seeder(url):
        created["instance"] = DummySeeder(url)
        return created["instance"]

    monkeypatch.setattr(seed_data_backup, "CodePopSeeder", make_seeder)
    monkeypatch.setattr(seed_data_backup.time, "sleep", lambda _: None)
    monkeypatch.setattr(sys, "argv", argv)

    seed_data_backup.main()
    return created["instance"].calls


def test_backup_main_flag_paths(monkeypatch):
    assert _run_with_args(monkeypatch, ["seed_data_backup.py", "--users"]) == ["users"]
    assert _run_with_args(monkeypatch, ["seed_data_backup.py", "--drinks"]) == ["users", "drinks"]
    assert _run_with_args(monkeypatch, ["seed_data_backup.py", "--preferences"]) == ["users", "preferences"]
    assert _run_with_args(monkeypatch, ["seed_data_backup.py", "--inventory"]) == ["users", "inventory"]
    assert _run_with_args(monkeypatch, ["seed_data_backup.py", "--clear"]) == ["users", "clear"]
    assert _run_with_args(monkeypatch, ["seed_data_backup.py", "--all"]) == ["all"]


def test_backup_main_reset_path(monkeypatch):
    calls = _run_with_args(monkeypatch, ["seed_data_backup.py", "--reset"])
    assert calls == ["users", "clear", "users", "drinks", "preferences", "inventory", "summary"]
