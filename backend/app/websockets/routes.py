from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from . import router, manager
from ..db import get_db
from ..services.room_service import RoomService

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: Optional[str] = Query(None)
):
    """
    WebSocket 연결 엔드포인트
    클라이언트와의 양방향 통신을 처리
    """
    # 연결 수락
    await manager.connect(websocket, room_id)
    
    # 방 ID 설정 (없으면 기본 방)
    current_room_id = room_id if room_id else manager.DEFAULT_ROOM
    
    try:
        while True:
            # 클라이언트로부터 메시지 수신
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 메시지 타입에 따라 처리
            if message["type"] == "play":
                # 재생 명령
                await manager.update_room_state({"playing": True}, current_room_id)
            
            elif message["type"] == "pause":
                # 일시정지 명령
                await manager.update_room_state({"playing": False}, current_room_id)
            
            elif message["type"] == "seek":
                # 재생 위치 변경 명령 - 단순 브로드캐스트만
                if "position" in message:
                    # position을 서버에 저장하지 않고 바로 모든 클라이언트에 브로드캐스트
                    await manager.broadcast_seek_to_room(message["position"], current_room_id)
                
                if "current_track" in message:
                    # 트랙 변경 처리
                    await manager.update_room_state({
                        "current_track": message["current_track"]
                    }, current_room_id)
            
            elif message["type"] == "add_track":
                # 트랙 추가 명령
                if "track" in message:
                    await manager.add_to_room_playlist(message["track"], current_room_id)
            
            elif message["type"] == "next_track":
                # 다음 트랙으로 이동
                room_state = manager.room_states.get(current_room_id, {})
                current = room_state.get("current_track")
                playlist_length = len(room_state.get("playlist", []))
                
                if current is not None and playlist_length > 0:
                    next_track = (current + 1) % playlist_length
                    await manager.update_room_state({
                        "current_track": next_track
                    }, current_room_id)
            
            elif message["type"] == "prev_track":
                # 이전 트랙으로 이동
                room_state = manager.room_states.get(current_room_id, {})
                current = room_state.get("current_track")
                playlist_length = len(room_state.get("playlist", []))
                
                if current is not None and playlist_length > 0:
                    prev_track = (current - 1) % playlist_length
                    await manager.update_room_state({
                        "current_track": prev_track
                    }, current_room_id)
    
    except WebSocketDisconnect:
        # 클라이언트 연결 종료
        manager.disconnect(websocket)
    except Exception as e:
        # 오류 처리
        print(f"WebSocket 오류: {e}")
        manager.disconnect(websocket)


# 웹소켓 연결/종료 시 참여자 수 업데이트 처리
@router.on_event("startup")
async def startup_db_client():
    pass

@router.on_event("shutdown")
async def shutdown_db_client():
    pass 