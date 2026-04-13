from pathlib import Path
import sys

import pytest

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import seed_data


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


class DummyMulti:
    def __init__(self, urls):
        self.urls = urls
        self.ran = False

    def run_all(self):
        self.ran = True


def test_main_users_path(monkeypatch):
    created = {}

    def make_seeder(url):
        created["instance"] = DummySeeder(url)
        return created["instance"]

    monkeypatch.setattr(seed_data, "CodePopSeeder", make_seeder)
    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--users"])

    seed_data.main()
    assert created["instance"].calls == ["users"]


def test_main_reset_path(monkeypatch):
    created = {}

    def make_seeder(url):
        created["instance"] = DummySeeder(url)
        return created["instance"]

    monkeypatch.setattr(seed_data, "CodePopSeeder", make_seeder)
    monkeypatch.setattr(seed_data.time, "sleep", lambda _: None)
    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--reset"])

    seed_data.main()
    assert created["instance"].calls == ["users", "clear", "users", "drinks", "preferences", "inventory", "summary"]


def test_main_all_peers_exits(monkeypatch):
    created = {}

    def make_multi(urls):
        created["instance"] = DummyMulti(urls)
        return created["instance"]

    monkeypatch.setattr(seed_data, "MultiPeerSeeder", make_multi)
    monkeypatch.setattr(seed_data, "get_all_peer_urls", lambda: ["http://localhost:3001"])
    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--all-peers"])

    with pytest.raises(SystemExit) as exc:
        seed_data.main()

    assert exc.value.code == 0
    assert created["instance"].ran is True


def test_main_remaining_flag_paths(monkeypatch):
    created = {}

    def make_seeder(url):
        created["instance"] = DummySeeder(url)
        return created["instance"]

    monkeypatch.setattr(seed_data, "CodePopSeeder", make_seeder)

    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--drinks"])
    seed_data.main()
    assert created["instance"].calls == ["users", "drinks"]

    created["instance"].calls = []
    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--preferences"])
    seed_data.main()
    assert created["instance"].calls == ["users", "preferences"]

    created["instance"].calls = []
    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--inventory"])
    seed_data.main()
    assert created["instance"].calls == ["users", "inventory"]

    created["instance"].calls = []
    monkeypatch.setattr(sys, "argv", ["seed_data.py", "--clear"])
    seed_data.main()
    assert created["instance"].calls == ["users", "clear"]

    created["instance"].calls = []
    monkeypatch.setattr(sys, "argv", ["seed_data.py"])
    seed_data.main()
    assert created["instance"].calls == ["all"]


def test_main_keyboard_interrupt_and_fatal_error(monkeypatch):
    class InterruptSeeder(DummySeeder):
        def run_all(self):
            raise KeyboardInterrupt()

    class CrashSeeder(DummySeeder):
        def run_all(self):
            raise RuntimeError("boom")

    monkeypatch.setattr(seed_data, "CodePopSeeder", lambda url: InterruptSeeder(url))
    monkeypatch.setattr(sys, "argv", ["seed_data.py"])
    with pytest.raises(SystemExit) as interrupt_exit:
        seed_data.main()
    assert interrupt_exit.value.code == 1

    monkeypatch.setattr(seed_data, "CodePopSeeder", lambda url: CrashSeeder(url))
    monkeypatch.setattr(sys, "argv", ["seed_data.py"])
    with pytest.raises(SystemExit) as fatal_exit:
        seed_data.main()
    assert fatal_exit.value.code == 1
