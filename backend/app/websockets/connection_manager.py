from fastapi import WebSocket
from typing import List, Dict, Any, Optional
import json

class ConnectionManager:
    def __init__(self):
        # 방별 활성 연결 보관
        self.rooms: Dict[str, List[WebSocket]] = {}
        # 방별 현재 재생 상태 저장
        self.room_states: Dict[str, Dict[str, Any]] = {}
        # 웹소켓-방 매핑
        self.socket_to_room: Dict[WebSocket, str] = {}
        
        # 기본 방 ID (하위 호환성)
        self.DEFAULT_ROOM = "default"
        
        # 기본 방 초기화
        self.rooms[self.DEFAULT_ROOM] = []
        self.room_states[self.DEFAULT_ROOM] = {
            "playlist": [],
            "current_track": None,
            "playing": False
        }
    
    async def connect(self, websocket: WebSocket, room_id: Optional[str] = None):
        """새 WebSocket 클라이언트 연결 처리"""
        await websocket.accept()
        
        # 방 ID가 지정되지 않은 경우 기본 방 사용
        if not room_id:
            room_id = self.DEFAULT_ROOM
        
        # 방이 존재하지 않으면 생성
        if room_id not in self.rooms:
            self.rooms[room_id] = []
            self.room_states[room_id] = {
                "playlist": [],
                "current_track": None,
                "playing": False
            }
        
        # 연결 추가
        self.rooms[room_id].append(websocket)
        self.socket_to_room[websocket] = room_id
        
        # 연결 시 현재 방 상태 전송
        await self.send_personal_message(json.dumps({
            "type": "state_update",
            "data": self.room_states[room_id]
        }), websocket)
    
    def disconnect(self, websocket: WebSocket):
        """WebSocket 클라이언트 연결 해제 처리"""
        if websocket in self.socket_to_room:
            room_id = self.socket_to_room[websocket]
            
            if room_id in self.rooms and websocket in self.rooms[room_id]:
                self.rooms[room_id].remove(websocket)
                
                # 방에 더 이상 연결이 없고, 기본 방이 아니면 방 상태 삭제
                if len(self.rooms[room_id]) == 0 and room_id != self.DEFAULT_ROOM:
                    del self.rooms[room_id]
                    del self.room_states[room_id]
            
            del self.socket_to_room[websocket]
    
    async def broadcast_to_room(self, message: str, room_id: str):
        """특정 방의 모든 연결된 클라이언트에 메시지 브로드캐스트"""
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """특정 클라이언트에 메시지 전송"""
        try:
            await websocket.send_text(message)
        except Exception:
            pass
    
    async def update_room_state(self, state_update: Dict[str, Any], room_id: str):
        """특정 방의 재생 상태 업데이트 및 브로드캐스트"""
        if room_id in self.room_states:
            self.room_states[room_id].update(state_update)
            
            # 해당 방의 모든 클라이언트에 상태 변경 알림
            await self.broadcast_to_room(json.dumps({
                "type": "state_update",
                "data": self.room_states[room_id]
            }), room_id)
    
    async def broadcast_seek_to_room(self, position: int, room_id: str):
        """seek 이벤트를 특정 방의 모든 클라이언트에 브로드캐스트"""
        if room_id in self.rooms:
            if position == -1:
                # 현재 위치 요청 신호 - 다른 사용자들에게 현재 위치 공유 요청
                await self.broadcast_to_room(json.dumps({
                    "type": "position_request",
                    "data": {}
                }), room_id)
            else:
                # position을 서버에 저장하지 않고 단순히 브로드캐스트만
                await self.broadcast_to_room(json.dumps({
                    "type": "seek_update", 
                    "data": {"position": position}
                }), room_id)
    
    async def add_to_room_playlist(self, track: Dict[str, Any], room_id: str):
        """특정 방의 플레이리스트에 곡 추가"""
        if room_id in self.room_states:
            if track not in self.room_states[room_id]["playlist"]:
                self.room_states[room_id]["playlist"].append(track)
                
                # 첫 번째 곡이 추가되는 경우 자동 재생
                if (self.room_states[room_id]["current_track"] is None and 
                    len(self.room_states[room_id]["playlist"]) == 1):
                    await self.update_room_state({
                        "current_track": 0,
                        "playing": True
                    }, room_id)
                else:
                    await self.broadcast_to_room(json.dumps({
                        "type": "state_update",
                        "data": self.room_states[room_id]
                    }), room_id)
                
                return True
        return False
    
    # 하위 호환성을 위한 메서드들
    async def broadcast(self, message: str):
        """기본 방의 모든 연결된 클라이언트에 메시지 브로드캐스트 (하위 호환성)"""
        await self.broadcast_to_room(message, self.DEFAULT_ROOM)
    
    async def update_state(self, state_update: Dict[str, Any]):
        """기본 방의 재생 상태 업데이트 및 브로드캐스트 (하위 호환성)"""
        await self.update_room_state(state_update, self.DEFAULT_ROOM)
    
    async def broadcast_seek(self, position: int):
        """기본 방에 seek 이벤트 브로드캐스트 (하위 호환성)"""
        await self.broadcast_seek_to_room(position, self.DEFAULT_ROOM)
    
    async def add_to_playlist(self, track: Dict[str, Any]):
        """기본 방의 플레이리스트에 곡 추가 (하위 호환성)"""
        return await self.add_to_room_playlist(track, self.DEFAULT_ROOM) 