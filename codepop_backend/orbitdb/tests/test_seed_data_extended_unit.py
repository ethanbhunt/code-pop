from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import seed_data


def test_seed_users_handles_existing_user_login_flow(monkeypatch):
    seeder = seed_data.CodePopSeeder()

    monkeypatch.setattr(
        seed_data,
        "SEED_USERS",
        [
            {"username": "customer", "password": "pw", "role": "customer"},
            {"username": "superadmin", "password": "pw", "role": "superadmin"},
        ],
    )

    def fake_request(method, endpoint, data=None, token=None):
        if endpoint == "/backend/auth/register" and data["username"] == "customer":
            raise Exception("Username already exists")
        if endpoint == "/backend/auth/login":
            return {"data": {"token": "existing-customer-token", "userId": 11}}
        if endpoint == "/backend/auth/register" and data["username"] == "superadmin":
            return {"data": {"token": "admin-token", "userId": 12}}
        raise AssertionError(f"unexpected call {method} {endpoint}")

    monkeypatch.setattr(seeder, "_make_request", fake_request)

    assert seeder.seed_users() is True
    assert seeder.user_tokens["customer"] == "existing-customer-token"
    assert seeder.admin_token == "admin-token"


def test_seed_data_run_all_failure_and_multipeer_failure(monkeypatch):
    seeder = seed_data.CodePopSeeder()
    monkeypatch.setattr(seeder, "health_check", lambda: False)

    assert seeder.run_all() is False

    multi = seed_data.MultiPeerSeeder(["http://localhost:3001", "http://localhost:3002"])
    monkeypatch.setattr(multi.seeders[0], "health_check", lambda: False)

    assert multi.run_all() is False


def test_multipeer_success_path(monkeypatch):
    multi = seed_data.MultiPeerSeeder(["http://localhost:3001", "http://localhost:3002"])

    monkeypatch.setattr(multi.seeders[0], "health_check", lambda: True)
    monkeypatch.setattr(multi.seeders[0], "seed_users", lambda: True)
    monkeypatch.setattr(multi.seeders[0], "seed_drinks", lambda: True)
    monkeypatch.setattr(multi.seeders[0], "seed_preferences", lambda: True)
    monkeypatch.setattr(multi.seeders[0], "seed_inventory", lambda: True)
    monkeypatch.setattr(multi.seeders[1], "seed_drinks", lambda: True)
    monkeypatch.setattr(multi.seeders[1], "seed_preferences", lambda: True)
    monkeypatch.setattr(multi.seeders[1], "seed_inventory", lambda: True)
    monkeypatch.setattr(seed_data.time, "sleep", lambda _: None)

    assert multi.run_all() is True
