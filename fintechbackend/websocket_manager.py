"""
WebSocket connection manager for real-time telemetry broadcasting.
Handles multiple client connections and message broadcasting with sub-100ms latency.
"""

import logging
from typing import Set, Dict
from fastapi import WebSocket
import json
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections with broadcast capability.
    Tracks active client connections and routes messages efficiently.
    """
    
    def __init__(self):
        # User ID -> Set of WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.connection_lock = asyncio.Lock()
    
    async def connect(self, user_id: int, websocket: WebSocket):
        """Register a new WebSocket connection for a user."""
        await websocket.accept()
        
        async with self.connection_lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            
            self.active_connections[user_id].add(websocket)
            logger.info(f"✅ Client connected: User {user_id} ({len(self.active_connections[user_id])} connections)")
    
    def disconnect(self, user_id: int, websocket: WebSocket):
        """Unregister a closed WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"❌ Client disconnected: User {user_id}")
    
    async def broadcast_to_user(self, user_id: int, message: dict):
        """
        Broadcast a message to all connected clients for a specific user.
        Handles stale connections gracefully.
        """
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user {user_id}")
            return
        
        dead_connections = set()
        message_json = json.dumps(message)
        
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message_json)
            except RuntimeError as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.add(websocket)
            except Exception as e:
                logger.error(f"Unexpected error broadcasting: {e}")
                dead_connections.add(websocket)
        
        # Clean up dead connections
        for ws in dead_connections:
            self.disconnect(user_id, ws)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast a message to all connected clients across all users."""
        message_json = json.dumps(message)
        dead_connections = {}
        
        for user_id, connections in self.active_connections.items():
            dead_set = set()
            for websocket in connections:
                try:
                    await websocket.send_text(message_json)
                except Exception as e:
                    logger.warning(f"Failed to send to user {user_id}: {e}")
                    dead_set.add(websocket)
            
            if dead_set:
                dead_connections[user_id] = dead_set
        
        # Clean up dead connections
        for user_id, dead_set in dead_connections.items():
            for ws in dead_set:
                self.disconnect(user_id, ws)
    
    def get_connection_count(self, user_id: int = None) -> int:
        """Get total connected clients (optionally for a specific user)."""
        if user_id:
            return len(self.active_connections.get(user_id, set()))
        return sum(len(conns) for conns in self.active_connections.values())
    
    async def send_transaction_update(self, user_id: int, transaction_data: dict):
        """
        Send real-time transaction update to connected clients.
        Format: { type: 'transaction_update', data: {...}, timestamp: ... }
        """
        message = {
            "type": "transaction_update",
            "data": transaction_data,
            "timestamp": datetime.now().isoformat(),
            "latency_ms": 0  # Can track actual latency if needed
        }
        await self.broadcast_to_user(user_id, message)
    
    async def send_webhook_event(self, user_id: int, event_type: str, event_data: dict):
        """
        Send webhook event notification to connected clients.
        Format: { type: 'webhook_event', event_type: ..., data: {...}, timestamp: ... }
        """
        message = {
            "type": "webhook_event",
            "event_type": event_type,
            "data": event_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_user(user_id, message)
    
    async def send_system_alert(self, user_id: int, alert_level: str, message_text: str):
        """
        Send system alert to connected clients.
        alert_level: 'info', 'warning', 'error', 'critical'
        """
        message = {
            "type": "system_alert",
            "level": alert_level,
            "message": message_text,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_user(user_id, message)
    
    async def send_heartbeat(self):
        """Send heartbeat ping to all connections to keep connections alive."""
        message = {
            "type": "heartbeat",
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast_to_all(message)


# Global connection manager instance
manager = ConnectionManager()
