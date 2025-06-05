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
            
            # 메시지 타입에 따라 마스터 클라이언트를 통해 처리
            if message["type"] == "play":
                # 재생 명령
                await manager.handle_play(current_room_id)
            
            elif message["type"] == "pause":
                # 일시정지 명령
                await manager.handle_pause(current_room_id)
            
            elif message["type"] == "seek":
                # 재생 위치 변경 명령
                if "position" in message:
                    await manager.handle_seek(current_room_id, float(message["position"]))
                
                if "current_track" in message:
                    # 트랙 변경 처리
                    await manager.handle_track_change(current_room_id, message["current_track"])
            
            elif message["type"] == "add_track":
                # 트랙 추가 명령
                if "track" in message:
                    await manager.handle_add_track(current_room_id, message["track"])
            
            elif message["type"] == "next_track":
                # 다음 트랙으로 이동
                await manager.handle_next_track(current_room_id)
            
            elif message["type"] == "prev_track":
                # 이전 트랙으로 이동
                await manager.handle_prev_track(current_room_id)
            
            elif message["type"] == "sync_request":
                # 클라이언트가 동기화 요청 - 마스터 클라이언트가 자동으로 처리하므로 무시
                pass
    
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