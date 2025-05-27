from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid

from ..models.room import Room
from ..schemas.room import RoomCreate, RoomUpdate

class RoomService:
    @staticmethod
    def get_all_rooms(db: Session, skip: int = 0, limit: int = 100):
        return db.query(Room).offset(skip).limit(limit).all()

    @staticmethod
    def get_room_by_id(db: Session, room_id: str):
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"방 ID {room_id}를 찾을 수 없습니다."
            )
        return room

    @staticmethod
    def create_room(db: Session, room_data: RoomCreate):
        room_id = str(uuid.uuid4())
        db_room = Room(
            id=room_id,
            name=room_data.name,
            description=room_data.description,
        )
        db.add(db_room)
        db.commit()
        db.refresh(db_room)
        return db_room

    @staticmethod
    def update_room(db: Session, room_id: str, room_data: RoomUpdate):
        db_room = RoomService.get_room_by_id(db, room_id)
        
        # 업데이트할 필드가 있으면 업데이트
        update_data = room_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_room, key, value)
        
        db.commit()
        db.refresh(db_room)
        return db_room

    @staticmethod
    def delete_room(db: Session, room_id: str):
        db_room = RoomService.get_room_by_id(db, room_id)
        db.delete(db_room)
        db.commit()
        return {"message": f"방 ID {room_id}가 삭제되었습니다."}

    @staticmethod
    def update_room_participants(db: Session, room_id: str, delta: int = 1):
        """
        방 참여자 수를 업데이트합니다.
        delta가 양수면 증가, 음수면 감소합니다.
        """
        db_room = RoomService.get_room_by_id(db, room_id)
        db_room.participants = max(0, db_room.participants + delta)
        db.commit()
        return db_room 