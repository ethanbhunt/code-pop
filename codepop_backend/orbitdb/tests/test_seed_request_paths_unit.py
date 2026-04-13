from pathlib import Path
import io
import sys
import urllib.error

import pytest

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import seed_data
import seed_data_backup


class _Response:
    def __init__(self, payload: bytes):
        self.payload = payload

    def read(self):
        return self.payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@pytest.mark.parametrize("module", [seed_data, seed_data_backup])
def test_make_request_success_and_errors(monkeypatch, module):
    seeder = module.CodePopSeeder("http://localhost:3001")

    monkeypatch.setattr(module.urllib.request, "urlopen", lambda req, timeout=10: _Response(b'{"ok": true}'))
    ok = seeder._make_request("GET", "/health", token="abc")
    assert ok == {"ok": True}

    json_error = urllib.error.HTTPError(
        url="http://localhost",
        code=400,
        msg="bad request",
        hdrs=None,
        fp=io.BytesIO(b'{"error":"bad"}'),
    )
    monkeypatch.setattr(module.urllib.request, "urlopen", lambda req, timeout=10: (_ for _ in ()).throw(json_error))
    with pytest.raises(Exception, match=r"API Error \(400\): bad"):
        seeder._make_request("GET", "/oops")

    text_error = urllib.error.HTTPError(
        url="http://localhost",
        code=500,
        msg="server error",
        hdrs=None,
        fp=io.BytesIO(b"raw-error"),
    )
    monkeypatch.setattr(module.urllib.request, "urlopen", lambda req, timeout=10: (_ for _ in ()).throw(text_error))
    with pytest.raises(Exception, match=r"API Error \(500\): raw-error"):
        seeder._make_request("GET", "/oops")

    url_error = urllib.error.URLError("offline")
    monkeypatch.setattr(module.urllib.request, "urlopen", lambda req, timeout=10: (_ for _ in ()).throw(url_error))
    with pytest.raises(Exception, match="Connection Error: offline"):
        seeder._make_request("GET", "/oops")
