from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...db import get_db
from ...services.room_service import RoomService
from ...schemas.room import RoomCreate, RoomResponse, RoomUpdate

router = APIRouter()

@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_data: RoomCreate, db: Session = Depends(get_db)):
    """새로운 방을 생성합니다."""
    db_room = RoomService.create_room(db, room_data)
    return {
        "id": db_room.id,
        "name": db_room.name,
        "description": db_room.description,
        "createdAt": db_room.created_at.isoformat(),
        "participants": db_room.participants
    }

@router.get("/", response_model=List[RoomResponse])
def get_rooms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """모든 방 목록을 조회합니다."""
    rooms = RoomService.get_all_rooms(db, skip, limit)
    return [
        {
            "id": room.id,
            "name": room.name,
            "description": room.description,
            "createdAt": room.created_at.isoformat(),
            "participants": room.participants
        } 
        for room in rooms
    ]

@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: str, db: Session = Depends(get_db)):
    """특정 ID의 방을 조회합니다."""
    room = RoomService.get_room_by_id(db, room_id)
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "createdAt": room.created_at.isoformat(),
        "participants": room.participants
    }

@router.put("/{room_id}", response_model=RoomResponse)
def update_room(room_id: str, room_data: RoomUpdate, db: Session = Depends(get_db)):
    """특정 ID의 방 정보를 업데이트합니다."""
    room = RoomService.update_room(db, room_id, room_data)
    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "createdAt": room.created_at.isoformat(),
        "participants": room.participants
    }

@router.delete("/{room_id}")
def delete_room(room_id: str, db: Session = Depends(get_db)):
    """특정 ID의 방을 삭제합니다."""
    return RoomService.delete_room(db, room_id) 