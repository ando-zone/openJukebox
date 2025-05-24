from fastapi import WebSocket, WebSocketDisconnect, Depends
import json
from typing import Dict, Any
from . import router, manager

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket 연결 엔드포인트
    클라이언트와의 양방향 통신을 처리
    """
    # 연결 수락
    await manager.connect(websocket)
    
    try:
        while True:
            # 클라이언트로부터 메시지 수신
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 메시지 타입에 따라 처리
            if message["type"] == "play":
                # 재생 명령
                await manager.update_state({"playing": True})
            
            elif message["type"] == "pause":
                # 일시정지 명령
                await manager.update_state({"playing": False})
            
            elif message["type"] == "seek":
                # 🎯 재생 위치 변경 명령 - 단순 브로드캐스트만
                if "position" in message:
                    # position을 서버에 저장하지 않고 바로 모든 클라이언트에 브로드캐스트
                    await manager.broadcast_seek(message["position"])
                
                if "current_track" in message:
                    # 트랙 변경은 기존대로 처리 (position 제거)
                    await manager.update_state({
                        "current_track": message["current_track"]
                    })
            
            elif message["type"] == "add_track":
                # 트랙 추가 명령
                if "track" in message:
                    await manager.add_to_playlist(message["track"])
            
            elif message["type"] == "next_track":
                # 다음 트랙으로 이동 (position 제거)
                current = manager.current_state["current_track"]
                playlist_length = len(manager.current_state["playlist"])
                
                if current is not None and playlist_length > 0:
                    next_track = (current + 1) % playlist_length
                    await manager.update_state({
                        "current_track": next_track
                    })
            
            elif message["type"] == "prev_track":
                # 이전 트랙으로 이동 (position 제거)
                current = manager.current_state["current_track"]
                playlist_length = len(manager.current_state["playlist"])
                
                if current is not None and playlist_length > 0:
                    prev_track = (current - 1) % playlist_length
                    await manager.update_state({
                        "current_track": prev_track
                    })
    
    except WebSocketDisconnect:
        # 클라이언트 연결 종료
        manager.disconnect(websocket)
    except Exception as e:
        # 오류 처리
        print(f"WebSocket 오류: {e}")
        manager.disconnect(websocket) 