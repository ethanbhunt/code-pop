from unittest.mock import patch
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from seed_data import CodePopSeeder, MultiPeerSeeder


def test_health_check_success_and_failure():
    seeder = CodePopSeeder("http://localhost:3001/")
    assert seeder.base_url == "http://localhost:3001"

    with patch.object(seeder, "_make_request", return_value={"status": "healthy"}):
      assert seeder.health_check() is True

    with patch.object(seeder, "_make_request", side_effect=Exception("down")):
      assert seeder.health_check() is False


def test_seed_users_sets_tokens_and_admin_token():
    seeder = CodePopSeeder()

    def fake_make_request(method, endpoint, data=None, token=None):
        assert method == "POST"
        assert endpoint == "/backend/auth/register"
        return {"data": {"token": f"token-{data['username']}", "userId": 10}}

    with patch.object(seeder, "_make_request", side_effect=fake_make_request):
        result = seeder.seed_users()

    assert result is True
    assert seeder.user_tokens["customer"] == "token-customer"
    assert seeder.admin_token == "token-superadmin"


def test_seed_drinks_requires_admin_token():
    seeder = CodePopSeeder()

    assert seeder.seed_drinks() is False


def test_seed_preferences_and_inventory_require_known_users_and_admin(monkeypatch):
    seeder = CodePopSeeder()
    seeder.admin_token = "admin-token"

    monkeypatch.setattr(
        sys.modules[CodePopSeeder.__module__],
        "SEED_PREFERENCES",
        [{"username": "missing-user", "preference": "sweet"}],
    )
    monkeypatch.setattr(
        sys.modules[CodePopSeeder.__module__],
        "SEED_INVENTORY",
        [{"itemName": "Coke", "quantity": 2, "itemType": "soda"}],
    )

    assert seeder.seed_preferences() is False

    with patch.object(seeder, "_make_request", return_value={"data": {"itemName": "Coke", "quantity": 2, "itemType": "soda"}}):
        assert seeder.seed_inventory() is True


def test_multi_peer_seeder_runs_all_seed_steps():
    multi = MultiPeerSeeder(["http://localhost:3001", "http://localhost:3002"])

    with patch.object(multi.seeders[0], "health_check", return_value=True), \
         patch.object(multi.seeders[0], "seed_users", return_value=True), \
         patch.object(multi.seeders[0], "seed_drinks", return_value=True), \
         patch.object(multi.seeders[0], "seed_preferences", return_value=True), \
         patch.object(multi.seeders[0], "seed_inventory", return_value=True), \
         patch.object(multi.seeders[1], "seed_drinks", return_value=True), \
         patch.object(multi.seeders[1], "seed_preferences", return_value=True), \
         patch.object(multi.seeders[1], "seed_inventory", return_value=True), \
         patch("seed_data.time.sleep", return_value=None):
        assert multi.run_all() is True
