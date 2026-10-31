import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from starlette.websockets import WebSocketDisconnect

TEST_DATABASE = Path(tempfile.gettempdir()) / f"vaultic-hardening-{os.getpid()}.sqlite3"
TEST_WEBHOOK_SECRET = "test-webhook-secret-with-more-than-32-characters"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DATABASE.as_posix()}"
os.environ["ENVIRONMENT"] = "development"
os.environ["SECRET_KEY"] = "test-signing-secret-with-more-than-32-characters"
os.environ["VAULTIC_WEBHOOK_SECRET"] = TEST_WEBHOOK_SECRET
os.environ["CORS_ORIGINS"] = "http://testserver"

import main
from auth import create_access_token
from auth import hash_password
from config import Settings
from database_new import engine
from models import Transaction, User


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as test_client:
        yield test_client
    engine.dispose()
    TEST_DATABASE.unlink(missing_ok=True)


@pytest.fixture
def test_user(client):
    with Session(engine) as session:
        user = User(
            username="hardening-test-user",
            email="hardening-test@example.invalid",
            hashed_password="not-used",
            current_bank_balance=500.0,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        yield user
        session.delete(user)
        session.commit()


def test_protected_endpoint_rejects_missing_and_invalid_tokens(client):
    assert client.get("/dashboard/summary").status_code == 401
    assert client.get(
        "/dashboard/summary", headers={"Authorization": "Bearer invalid"}
    ).status_code == 401


def test_production_settings_reject_sqlite_and_wildcard_cors():
    settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="sqlite:///./vaultic.db",
        SECRET_KEY="test-signing-secret-with-more-than-32-characters",
        CORS_ORIGINS="https://vaultic.example",
        FRONTEND_BASE_URL="https://vaultic.example",
    )
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        settings.validate_production_configuration()

    wildcard_settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql://user:pass@db.example/vaultic",
        SECRET_KEY="test-signing-secret-with-more-than-32-characters",
        CORS_ORIGINS="*",
        FRONTEND_BASE_URL="https://vaultic.example",
    )
    with pytest.raises(ValueError, match="Wildcard"):
        _ = wildcard_settings.cors_origins


def test_google_redirect_uri_trims_surrounding_whitespace():
    settings = Settings(
        GOOGLE_REDIRECT_URI=" \nhttps://vaultic.example/auth/google/callback\n "
    )

    assert settings.GOOGLE_REDIRECT_URI == (
        "https://vaultic.example/auth/google/callback"
    )


def test_short_existing_passwords_remain_usable_for_login(client):
    with Session(engine) as session:
        user = User(
            username="legacy-short-password",
            email="legacy-short-password@example.invalid",
            hashed_password=hash_password("shortpass"),
        )
        session.add(user)
        session.commit()

    response = client.post(
        "/auth/login",
        json={"username": "legacy-short-password", "password": "shortpass"},
    )
    assert response.status_code == 200


def test_signup_rejects_short_new_passwords(client):
    response = client.post(
        "/auth/signup",
        json={
            "username": "short-password-user",
            "email": "short-password@example.invalid",
            "password": "shortpass",
        },
    )
    assert response.status_code == 422


def test_sms_webhook_requires_exact_secret(client, test_user):
    payload = {"user_id": test_user.id, "text": "debit Rs 45 at test shop"}
    assert client.post("/api/v1/telemetry/sms-webhook", json=payload).status_code == 403
    assert (
        client.post(
            "/api/v1/telemetry/sms-webhook",
            json=payload,
            headers={"X-Vaultic-Token": "incorrect"},
        ).status_code
        == 403
    )


def test_sms_webhook_persists_only_for_requested_user_and_does_not_guess_balance(
    client, test_user, monkeypatch
):
    monkeypatch.setattr(
        main,
        "extract_sms_metadata",
        lambda text: (45.0, "Test Shop", "Shopping"),
    )
    response = client.post(
        "/api/v1/telemetry/sms-webhook",
        json={"user_id": test_user.id, "text": "valid test transaction"},
        headers={"X-Vaultic-Token": TEST_WEBHOOK_SECRET},
    )
    assert response.status_code == 200
    assert response.json()["broadcast_status"] == "no_active_clients"

    with Session(engine) as session:
        transaction = session.exec(
            select(Transaction).where(Transaction.user_id == test_user.id)
        ).one()
        user = session.get(User, test_user.id)
        assert transaction.amount == 45.0
        assert transaction.merchant == "Test Shop"
        assert user is not None
        assert user.current_bank_balance == 500.0


def test_websocket_authenticates_identity_without_url_token(client, test_user):
    token = create_access_token(
        {"sub": test_user.username, "user_id": test_user.id, "role": test_user.role}
    )
    with client.websocket_connect(
        "/api/v1/ws/telemetry",
        subprotocols=["vaultic.telemetry", f"vaultic.auth.{token}"],
    ) as websocket:
        assert websocket.accepted_subprotocol == "vaultic.telemetry"
        assert websocket.receive_json()["type"] == "system_alert"
        websocket.send_text("ping")
        assert websocket.receive_json()["type"] == "ack"

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/v1/ws/telemetry"):
            pass
