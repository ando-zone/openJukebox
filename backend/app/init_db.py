import asyncio
from .db import engine, Base, database

async def init_db():
    """데이터베이스 초기화 및 연결"""
    # 테이블 생성
    Base.metadata.create_all(bind=engine)
    
    # 비동기 데이터베이스 연결
    if not database.is_connected:
        await database.connect()

async def close_db():
    """데이터베이스 연결 종료"""
    if database.is_connected:
        await database.disconnect()

# 스크립트로 실행될 때 사용
if __name__ == "__main__":
    asyncio.run(init_db()) 