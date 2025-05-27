import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func

from ..db import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    participants = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "createdAt": self.created_at.isoformat(),
            "participants": self.participants
        } 