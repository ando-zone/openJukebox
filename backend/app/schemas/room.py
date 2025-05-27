from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class RoomBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class RoomCreate(RoomBase):
    pass

class RoomUpdate(RoomBase):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    participants: Optional[int] = None

class RoomInDB(RoomBase):
    id: str
    created_at: datetime
    participants: int

    class Config:
        orm_mode = True
        from_attributes = True

class RoomResponse(RoomBase):
    id: str
    createdAt: str
    participants: int 