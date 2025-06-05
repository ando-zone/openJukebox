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
        
        # 마스터 클라이언트 매니저는 나중에 초기화됩니다 (순환 참조 방지)
        self.master_client_manager = None
    
    def set_master_client_manager(self, master_client_manager):
        """마스터 클라이언트 매니저 설정 (순환 참조 방지를 위해 별도 메서드)"""
        self.master_client_manager = master_client_manager
    
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
        
        # 마스터 클라이언트 확인/생성 및 현재 상태 전송
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            current_state = master_client.get_current_state()
            
            await self.send_personal_message(json.dumps({
                "type": "state_update",
                "data": current_state
            }), websocket)
    
    def disconnect(self, websocket: WebSocket):
        """WebSocket 클라이언트 연결 해제 처리"""
        if websocket in self.socket_to_room:
            room_id = self.socket_to_room[websocket]
            
            if room_id in self.rooms and websocket in self.rooms[room_id]:
                self.rooms[room_id].remove(websocket)
                
                # 방에 더 이상 연결이 없고, 기본 방이 아니면 방 정리 고려
                if len(self.rooms[room_id]) == 0 and room_id != self.DEFAULT_ROOM:
                    # 마스터 클라이언트도 정리 (일정 시간 후)
                    if self.master_client_manager:
                        # 비동기 작업이므로 백그라운드에서 처리
                        import asyncio
                        asyncio.create_task(self._cleanup_room_later(room_id))
            
            del self.socket_to_room[websocket]
    
    async def _cleanup_room_later(self, room_id: str):
        """방 정리를 지연 실행 (클라이언트가 재연결할 수 있도록)"""
        import asyncio
        await asyncio.sleep(10)  # 10초 후 정리
        
        # 여전히 비어있으면 정리
        if room_id in self.rooms and len(self.rooms[room_id]) == 0 and room_id != self.DEFAULT_ROOM:
            del self.rooms[room_id]
            if self.master_client_manager:
                await self.master_client_manager.remove_master_client(room_id)
    
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
    
    # 마스터 클라이언트를 통한 상태 업데이트 메서드들
    async def handle_play(self, room_id: str):
        """재생 명령을 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            await master_client.handle_play()
    
    async def handle_pause(self, room_id: str):
        """일시정지 명령을 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            await master_client.handle_pause()
    
    async def handle_seek(self, room_id: str, position: float):
        """재생 위치 변경을 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            await master_client.handle_seek(position)
    
    async def handle_track_change(self, room_id: str, track_index: int):
        """트랙 변경을 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            await master_client.handle_track_change(track_index)
    
    async def handle_add_track(self, room_id: str, track: Dict[str, Any]):
        """트랙 추가를 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            return await master_client.handle_add_track(track)
        return False
    
    async def handle_next_track(self, room_id: str):
        """다음 트랙으로 이동을 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            await master_client.handle_next_track()
    
    async def handle_prev_track(self, room_id: str):
        """이전 트랙으로 이동을 마스터 클라이언트에 전달"""
        if self.master_client_manager:
            master_client = await self.master_client_manager.get_or_create_master_client(room_id)
            await master_client.handle_prev_track()
    
    # 하위 호환성을 위한 기존 메서드들 (deprecated)
    async def update_room_state(self, state_update: Dict[str, Any], room_id: str):
        """방의 재생 상태 업데이트 및 브로드캐스트 (deprecated - 마스터 클라이언트 사용 권장)"""
        # 기존 코드와의 호환성을 위해 유지하지만, 마스터 클라이언트를 통해 처리
        if "playing" in state_update:
            if state_update["playing"]:
                await self.handle_play(room_id)
            else:
                await self.handle_pause(room_id)
        
        if "current_track" in state_update:
            await self.handle_track_change(room_id, state_update["current_track"])
    
    async def broadcast_seek_to_room(self, position: int, room_id: str):
        """seek 이벤트를 특정 방의 모든 클라이언트에 브로드캐스트 (deprecated)"""
        if position == -1:
            # 현재 위치 요청 신호 - 마스터 클라이언트가 관리하므로 무시
            return
        else:
            await self.handle_seek(room_id, float(position))
    
    async def add_to_room_playlist(self, track: Dict[str, Any], room_id: str):
        """특정 방의 플레이리스트에 곡 추가 (deprecated)"""
        return await self.handle_add_track(room_id, track)
    
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