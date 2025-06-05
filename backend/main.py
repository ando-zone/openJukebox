import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import router as api_router
from backend.app.websockets import router as ws_router, master_client_manager
from backend.app.init_db import init_db, close_db

app = FastAPI(title="OpenJukebox API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 오리진 허용, 실제 운영에선 변경 필요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 추가
app.include_router(api_router)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {"message": "OpenJukebox API에 오신 것을 환영합니다"}

# 시작 이벤트 - 데이터베이스 초기화
@app.on_event("startup")
async def startup_db_client():
    await init_db()

# 종료 이벤트 - 데이터베이스 연결 종료 및 마스터 클라이언트 정리
@app.on_event("shutdown")
async def shutdown_db_client():
    # 마스터 클라이언트들 모두 종료
    await master_client_manager.shutdown_all()
    # 데이터베이스 연결 종료
    await close_db()

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True) 
