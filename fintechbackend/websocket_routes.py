"""
WebSocket routes for Vaultic real-time telemetry ingestion.
Endpoints for client connections and live transaction streaming.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from sqlmodel import Session
from websocket_manager import manager
from database_new import get_session
from models import User
from security import get_user_from_token_ws
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


async def get_user_from_token(token: str, session: Session) -> User:
    """Extract and verify user from WebSocket connection token (wrapper)."""
    return await get_user_from_token_ws(token, session)


@router.websocket("/telemetry/{user_id}")
async def websocket_telemetry_endpoint(
    websocket: WebSocket, 
    user_id: int,
    token: str,
    session: Session = Depends(get_session)
):
    """
    WebSocket endpoint for real-time transaction telemetry streaming.
    
    Client must provide:
    - user_id: path parameter
    - token: query parameter (Bearer token)
    
    Connection URL: ws://localhost:8000/ws/telemetry/123?token=<bearer_token>
    """
    
    # Verify token
    try:
        user_obj = await get_user_from_token(token, session)
        if not user_obj:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            logger.warning(f"Unauthorized WebSocket attempt for user {user_id}")
            return

        # RBAC: allow connection if the authenticated user is the owner (matching user_id)
        # or the user has an admin role. This prevents users from opening sockets for other IDs.
        if user_obj.id != user_id and getattr(user_obj, 'role', 'user') != 'admin':
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Insufficient privileges")
            logger.warning(f"Forbidden WebSocket attempt by user {user_obj.username} for user_id {user_id}")
            return

    except Exception as e:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Auth failed")
        logger.error(f"WebSocket auth error: {e}")
        return
    
    # Accept connection
    await manager.connect(user_id, websocket)
    
    try:
        # Send initial connection confirmation
        await manager.send_system_alert(
            user_id,
            "info",
            f"✅ Connected to Vaultic telemetry stream. Active connections: {manager.get_connection_count(user_id)}"
        )
        
        # Listen for incoming messages (heartbeat, pings, etc.)
        while True:
            data = await websocket.receive_text()
            
            # Echo back as confirmation (or process if needed)
            logger.debug(f"Received from user {user_id}: {data}")
            
            # Send acknowledgment
            await websocket.send_json({
                "type": "ack",
                "message": "Message received",
                "timestamp": asyncio.get_event_loop().time()
            })
    
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        logger.info(f"Client {user_id} disconnected gracefully")
    
    except RuntimeError as e:
        logger.warning(f"WebSocket runtime error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)
    
    except Exception as e:
        logger.error(f"Unexpected WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)


@router.get("/health")
async def websocket_health():
    """Health check endpoint for WebSocket subsystem."""
    total_connections = manager.get_connection_count()
    return {
        "status": "operational",
        "active_connections": total_connections,
        "timestamp": asyncio.get_event_loop().time()
    }
