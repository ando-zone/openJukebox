import asyncio
import json
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime
import uuid

@dataclass
class PlaybackState:
    """재생 상태를 관리하는 데이터 클래스"""
    playlist: List[Dict[str, Any]]
    current_track_index: Optional[int]
    position: float  # 현재 재생 위치 (초)
    is_playing: bool
    last_update_time: float  # 마지막 업데이트 시간 (timestamp)
    volume: float = 1.0
    
    def to_dict(self):
        return {
            "playlist": self.playlist,
            "current_track": self.current_track_index,
            "position": self.position,
            "playing": self.is_playing,
            "last_update_time": self.last_update_time,
            "volume": self.volume
        }
    
    def get_current_position(self) -> float:
        """현재 시간 기준으로 실제 재생 위치 계산"""
        if not self.is_playing:
            return self.position
        
        current_time = time.time()
        time_elapsed = current_time - self.last_update_time
        return self.position + time_elapsed
    
    def update_position(self, new_position: float):
        """재생 위치 업데이트"""
        self.position = new_position
        self.last_update_time = time.time()

class MasterClient:
    """방의 마스터 클라이언트 - 동기화 관리 담당"""
    
    def __init__(self, room_id: str, connection_manager):
        self.room_id = room_id
        self.connection_manager = connection_manager
        self.client_id = f"master_{room_id}_{uuid.uuid4().hex[:8]}"
        
        # 재생 상태 초기화
        self.playback_state = PlaybackState(
            playlist=[],
            current_track_index=None,
            position=0.0,
            is_playing=False,
            last_update_time=time.time()
        )
        
        # 동기화 작업을 위한 태스크
        self.sync_task: Optional[asyncio.Task] = None
        self.is_active = True
        
        # 클라이언트들의 상태 추적
        self.client_states: Dict[str, Dict[str, Any]] = {}
        
    async def start(self):
        """마스터 클라이언트 시작"""
        print(f"마스터 클라이언트 시작: {self.client_id} (방: {self.room_id})")
        
        # 주기적 동기화 태스크 시작
        self.sync_task = asyncio.create_task(self._sync_loop())
        
    async def stop(self):
        """마스터 클라이언트 중지"""
        print(f"마스터 클라이언트 중지: {self.client_id} (방: {self.room_id})")
        self.is_active = False
        
        if self.sync_task:
            self.sync_task.cancel()
            try:
                await self.sync_task
            except asyncio.CancelledError:
                pass
    
    async def _sync_loop(self):
        """주기적으로 클라이언트들과 동기화"""
        try:
            while self.is_active:
                await self._broadcast_state_update()
                
                # 재생 중이면 1초마다, 일시정지 중이면 10초마다 동기화
                if self.playback_state.is_playing:
                    await asyncio.sleep(1.0)  # 재생 중: 1초마다
                else:
                    await asyncio.sleep(10.0)  # 일시정지: 10초마다
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"동기화 루프 오류: {e}")
    
    async def _broadcast_state_update(self):
        """현재 상태를 모든 클라이언트에 브로드캐스트"""
        if not self.is_active:
            return
            
        current_state = self.playback_state.to_dict()
        
        # 현재 재생 위치 업데이트
        if self.playback_state.is_playing:
            current_state["position"] = self.playback_state.get_current_position()
        
        message = json.dumps({
            "type": "master_sync",
            "data": current_state,
            "master_client_id": self.client_id,
            "timestamp": time.time()
        })
        
        await self.connection_manager.broadcast_to_room(message, self.room_id)
    
    async def handle_play(self):
        """재생 명령 처리"""
        if not self.playback_state.playlist or self.playback_state.current_track_index is None:
            return
            
        self.playback_state.is_playing = True
        self.playback_state.last_update_time = time.time()
        
        await self._broadcast_state_update()
    
    async def handle_pause(self):
        """일시정지 명령 처리"""
        if self.playback_state.is_playing:
            # 현재 위치를 정확히 계산해서 저장
            self.playback_state.position = self.playback_state.get_current_position()
        
        self.playback_state.is_playing = False
        self.playback_state.last_update_time = time.time()
        
        await self._broadcast_state_update()
    
    async def handle_seek(self, position: float):
        """재생 위치 변경 처리"""
        # 위치가 유효한지 확인
        if position < 0:
            return
            
        # 현재 위치와 너무 가까우면 무시 (1초 이내 차이)
        current_pos = self.playback_state.get_current_position()
        if abs(position - current_pos) < 1.0:
            return
            
        self.playback_state.update_position(position)
        await self._broadcast_state_update()
    
    async def handle_track_change(self, track_index: int):
        """트랙 변경 처리"""
        if 0 <= track_index < len(self.playback_state.playlist):
            self.playback_state.current_track_index = track_index
            self.playback_state.position = 0.0
            self.playback_state.last_update_time = time.time()
            
            await self._broadcast_state_update()
    
    async def handle_add_track(self, track: Dict[str, Any]):
        """트랙 추가 처리"""
        if track not in self.playback_state.playlist:
            self.playback_state.playlist.append(track)
            
            # 첫 번째 트랙이면 자동으로 선택
            if len(self.playback_state.playlist) == 1:
                self.playback_state.current_track_index = 0
                self.playback_state.last_update_time = time.time()
            
            await self._broadcast_state_update()
            return True
        return False
    
    async def handle_next_track(self):
        """다음 트랙으로 이동"""
        if not self.playback_state.playlist:
            return
            
        if self.playback_state.current_track_index is not None:
            next_index = (self.playback_state.current_track_index + 1) % len(self.playback_state.playlist)
            await self.handle_track_change(next_index)
    
    async def handle_prev_track(self):
        """이전 트랙으로 이동"""
        if not self.playback_state.playlist:
            return
            
        if self.playback_state.current_track_index is not None:
            prev_index = (self.playback_state.current_track_index - 1) % len(self.playback_state.playlist)
            await self.handle_track_change(prev_index)
    
    def get_current_state(self) -> Dict[str, Any]:
        """현재 상태 반환"""
        state = self.playback_state.to_dict()
        if self.playback_state.is_playing:
            state["position"] = self.playback_state.get_current_position()
        return state


class MasterClientManager:
    """모든 방의 마스터 클라이언트들을 관리"""
    
    def __init__(self, connection_manager):
        self.connection_manager = connection_manager
        self.master_clients: Dict[str, MasterClient] = {}
    
    async def get_or_create_master_client(self, room_id: str) -> MasterClient:
        """방의 마스터 클라이언트를 가져오거나 생성"""
        if room_id not in self.master_clients:
            master_client = MasterClient(room_id, self.connection_manager)
            self.master_clients[room_id] = master_client
            await master_client.start()
            
        return self.master_clients[room_id]
    
    async def remove_master_client(self, room_id: str):
        """방의 마스터 클라이언트 제거"""
        if room_id in self.master_clients:
            await self.master_clients[room_id].stop()
            del self.master_clients[room_id]
    
    async def cleanup_inactive_rooms(self):
        """비활성화된 방의 마스터 클라이언트들 정리"""
        inactive_rooms = []
        
        for room_id, master_client in self.master_clients.items():
            # 방에 연결된 클라이언트가 없으면 비활성화
            if room_id not in self.connection_manager.rooms or len(self.connection_manager.rooms[room_id]) == 0:
                # 기본 방은 제외
                if room_id != self.connection_manager.DEFAULT_ROOM:
                    inactive_rooms.append(room_id)
        
        for room_id in inactive_rooms:
            await self.remove_master_client(room_id)
    
    async def shutdown_all(self):
        """모든 마스터 클라이언트 종료"""
        for master_client in self.master_clients.values():
            await master_client.stop()
        self.master_clients.clear() 