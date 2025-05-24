from fastapi import WebSocket
from typing import List, Dict, Any
import json

class ConnectionManager:
    def __init__(self):
        # 활성 연결 보관
        self.active_connections: List[WebSocket] = []
        # 현재 재생 상태 저장 (position 제거)
        self.current_state: Dict[str, Any] = {
            "playlist": [],
            "current_track": None,
            "playing": False
        }
    
    async def connect(self, websocket: WebSocket):
        """새 WebSocket 클라이언트 연결 처리"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # 연결 시 현재 상태 전송 (position 없음)
        await self.send_personal_message(json.dumps({
            "type": "state_update",
            "data": self.current_state
        }), websocket)
    
    def disconnect(self, websocket: WebSocket):
        """WebSocket 클라이언트 연결 해제 처리"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: str):
        """모든 연결된 클라이언트에 메시지 브로드캐스트"""
        for connection in self.active_connections:
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
    
    async def update_state(self, state_update: Dict[str, Any]):
        """재생 상태 업데이트 및 브로드캐스트"""
        self.current_state.update(state_update)
        
        # 모든 클라이언트에 상태 변경 알림
        await self.broadcast(json.dumps({
            "type": "state_update",
            "data": self.current_state
        }))
    
    async def broadcast_seek(self, position: int):
        """🎯 새로운 기능: seek 이벤트를 모든 클라이언트에 브로드캐스트"""
        if position == -1:
            # 🎯 현재 위치 요청 신호 - 다른 사용자들에게 현재 위치 공유 요청
            await self.broadcast(json.dumps({
                "type": "position_request",
                "data": {}
            }))
        else:
            # position을 서버에 저장하지 않고 단순히 브로드캐스트만
            await self.broadcast(json.dumps({
                "type": "seek_update", 
                "data": {"position": position}
            }))
    
    async def add_to_playlist(self, track: Dict[str, Any]):
        """플레이리스트에 곡 추가"""
        if track not in self.current_state["playlist"]:
            self.current_state["playlist"].append(track)
            
            # 첫 번째 곡이 추가되는 경우 자동 재생 (position 제거)
            if self.current_state["current_track"] is None and len(self.current_state["playlist"]) == 1:
                await self.update_state({
                    "current_track": 0,
                    "playing": True
                })
            else:
                await self.broadcast(json.dumps({
                    "type": "state_update",
                    "data": self.current_state
                }))
            
            return True
        return False 