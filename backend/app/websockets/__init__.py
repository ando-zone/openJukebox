from fastapi import APIRouter
from .connection_manager import ConnectionManager
from ..services.master_client import MasterClientManager

router = APIRouter()

# 웹소켓 연결 관리자 인스턴스
manager = ConnectionManager()

# 마스터 클라이언트 매니저 인스턴스
master_client_manager = MasterClientManager(manager)

# 순환 참조 방지를 위해 별도로 설정
manager.set_master_client_manager(master_client_manager)

from .routes import * 