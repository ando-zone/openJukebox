from fastapi import APIRouter
from .connection_manager import ConnectionManager

router = APIRouter()

# 웹소켓 연결 관리자 인스턴스
manager = ConnectionManager()

from .routes import * 