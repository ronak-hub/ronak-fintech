"""Authenticated WebSocket routes for real-time telemetry."""

import asyncio
import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlmodel import Session

from database_new import get_session
from security import get_user_from_token_ws
from websocket_manager import manager
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/telemetry")
async def websocket_telemetry_endpoint(
    websocket: WebSocket,
    session: Session = Depends(get_session),
):
    """Authenticate with a JWT subprotocol and derive the stream owner from it."""
    origin = websocket.headers.get("origin")
    if origin and origin.rstrip("/") not in settings.cors_origins:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Origin not allowed"
        )
        return
    auth_protocol = next(
        (
            protocol
            for protocol in websocket.scope.get("subprotocols", [])
            if protocol.startswith("vaultic.auth.")
        ),
        None,
    )
    token = auth_protocol.removeprefix("vaultic.auth.") if auth_protocol else ""
    if not token:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required"
        )
        return

    try:
        user = await get_user_from_token_ws(token, session)
    except Exception:
        logger.exception("WebSocket identity lookup failed")
        await websocket.close(
            code=status.WS_1011_INTERNAL_ERROR, reason="Authentication failed"
        )
        return
    if user is None:
        logger.warning("Rejected WebSocket connection with invalid identity")
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token"
        )
        return

    if user.id is None:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Invalid identity"
        )
        return

    user_id = user.id
    if manager.get_connection_count() >= settings.WEBSOCKET_MAX_CONNECTIONS:
        await websocket.close(
            code=status.WS_1013_TRY_AGAIN_LATER, reason="Connection capacity reached"
        )
        return
    await manager.connect(user_id, websocket, subprotocol="vaultic.telemetry")

    try:
        await manager.send_system_alert(
            user_id,
            "info",
            f"Connected to Vaultic telemetry stream. Active connections: {manager.get_connection_count(user_id)}",
        )
        while True:
            await websocket.receive_text()
            await websocket.send_json(
                {
                    "type": "ack",
                    "message": "Message received",
                    "timestamp": asyncio.get_running_loop().time(),
                }
            )
    except WebSocketDisconnect:
        logger.info("Client %s disconnected gracefully", user_id)
    except RuntimeError as error:
        logger.warning("WebSocket runtime error for user %s: %s", user_id, error)
    except Exception:
        logger.exception("Unexpected WebSocket error for user %s", user_id)
    finally:
        manager.disconnect(user_id, websocket)


@router.get("/health")
async def websocket_health():
    """Health check endpoint for WebSocket subsystem."""
    return {
        "status": "operational",
        "active_connections": manager.get_connection_count(),
        "timestamp": asyncio.get_running_loop().time(),
    }
