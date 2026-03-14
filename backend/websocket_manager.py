from fastapi import WebSocket
from typing import Dict, Set
import asyncio
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[int, WebSocket] = {}
        self._transmissions: Dict[int, int] = {}

    async def connect(self, ws: WebSocket, user_id: int):
        await ws.accept()
        await self.disconnect(user_id)
        self._connections[user_id] = ws

    async def disconnect(self, user_id: int):
        if user_id in self._connections:
            del self._connections[user_id]
        if user_id in self._transmissions:
            await self._end_transmission(user_id)

    def is_online(self, user_id: int) -> bool:
        return user_id in self._connections

    def online_count(self) -> int:
        return len(self._connections)

    async def send_json(self, user_id: int, data: dict) -> bool:
        ws = self._connections.get(user_id)
        if not ws:
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception:
            await self.disconnect(user_id)
            return False

    async def send_bytes(self, user_id: int, data: bytes) -> bool:
        ws = self._connections.get(user_id)
        if not ws:
            return False
        try:
            await ws.send_bytes(data)
            return True
        except Exception:
            await self.disconnect(user_id)
            return False

    async def broadcast_status(self, user_id: int, online: bool, friend_ids: list):
        tasks = [
            self.send_json(fid, {"type": "status_update", "user_id": user_id, "online": online})
            for fid in friend_ids
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def start_transmission(self, sender_id: int, receiver_id: int) -> bool:
        if not self.is_online(receiver_id):
            await self.send_json(sender_id, {"type": "error", "message": "Target user is offline"})
            return False
        if sender_id in self._transmissions:
            await self._end_transmission(sender_id)
        self._transmissions[sender_id] = receiver_id
        await self.send_json(receiver_id, {"type": "transmission_start", "sender_id": sender_id})
        return True

    async def forward_audio(self, sender_id: int, audio: bytes):
        receiver_id = self._transmissions.get(sender_id)
        if receiver_id:
            packet = sender_id.to_bytes(4, "big") + audio
            await self.send_bytes(receiver_id, packet)

    async def stop_transmission(self, sender_id: int):
        await self._end_transmission(sender_id)

    async def _end_transmission(self, sender_id: int):
        receiver_id = self._transmissions.pop(sender_id, None)
        if receiver_id:
            await self.send_json(receiver_id, {"type": "transmission_end", "sender_id": sender_id})


manager = ConnectionManager()