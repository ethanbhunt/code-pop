from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import seed_data_backup


def test_backup_seed_users_and_admin(monkeypatch):
    seeder = seed_data_backup.CodePopSeeder("http://localhost:3001/")
    assert seeder.base_url == "http://localhost:3001"

    monkeypatch.setattr(
        seed_data_backup,
        "SEED_USERS",
        [
            {"username": "customer", "password": "pw", "role": "customer"},
            {"username": "superadmin", "password": "pw", "role": "superadmin"},
        ],
    )

    def fake_request(method, endpoint, data=None, token=None):
        if endpoint == "/backend/auth/register":
            return {"data": {"token": f"t-{data['username']}", "userId": 1}}
        raise AssertionError(f"unexpected endpoint {endpoint}")

    monkeypatch.setattr(seeder, "_make_request", fake_request)

    assert seeder.seed_users() is True
    assert seeder.user_tokens["customer"] == "t-customer"
    assert seeder.admin_token == "t-superadmin"


def test_backup_seed_other_entities_and_clear(monkeypatch):
    seeder = seed_data_backup.CodePopSeeder()
    seeder.admin_token = "admin"
    seeder.user_tokens["customer"] = "token-customer"

    monkeypatch.setattr(seed_data_backup, "SEED_DRINKS", [{"name": "Fizz"}])
    monkeypatch.setattr(seed_data_backup, "SEED_PREFERENCES", [{"username": "customer", "preference": "sweet"}])
    monkeypatch.setattr(seed_data_backup, "SEED_INVENTORY", [{"itemName": "Coke", "quantity": 5, "itemType": "soda"}])
    monkeypatch.setattr(seed_data_backup, "SEED_USERS", [{"username": "customer"}])

    def fake_request(method, endpoint, data=None, token=None):
        if endpoint == "/backend/drinks":
            return {"data": {"drinkId": 1, "name": "Fizz"}}
        if endpoint == "/backend/preferences":
            return {"data": {"preferenceType": "favorite"}}
        if endpoint == "/backend/inventory":
            return {"data": {"itemName": "Coke", "quantity": 5, "itemType": "soda"}}
        if endpoint == "/backend/users":
            return {"data": [{"username": "customer", "userId": 7}]}
        if endpoint.startswith("/backend/users/delete/"):
            return {"ok": True}
        raise AssertionError(f"unexpected endpoint {endpoint}")

    monkeypatch.setattr(seeder, "_make_request", fake_request)

    assert seeder.seed_drinks() is True
    assert seeder.seed_preferences() is True
    assert seeder.seed_inventory() is True
    assert seeder.clear_data() is True


def test_backup_run_all_and_print_summary(monkeypatch):
    seeder = seed_data_backup.CodePopSeeder()

    monkeypatch.setattr(seeder, "health_check", lambda: True)
    monkeypatch.setattr(seeder, "seed_users", lambda: True)
    monkeypatch.setattr(seeder, "seed_drinks", lambda: True)
    monkeypatch.setattr(seeder, "seed_preferences", lambda: True)
    monkeypatch.setattr(seeder, "seed_inventory", lambda: True)
    monkeypatch.setattr(seed_data_backup.time, "sleep", lambda _: None)

    assert seeder.run_all() is True

    monkeypatch.setattr(seed_data_backup, "SEED_USERS", [{"username": "customer"}])
    monkeypatch.setattr(seed_data_backup, "SEED_DRINKS", [{"name": "Fizz"}])
    monkeypatch.setattr(seed_data_backup, "SEED_PREFERENCES", [{"username": "customer", "preference": "sweet"}])
    monkeypatch.setattr(seed_data_backup, "SEED_INVENTORY", [{"itemName": "Coke"}])
    monkeypatch.setattr(
        seed_data_backup,
        "TEST_CREDENTIALS",
        {
            "customer": {
                "username": "customer",
                "email": "customer@example.com",
                "password": "pw",
                "description": "Customer account",
            }
        },
    )

    seeder.print_summary()
