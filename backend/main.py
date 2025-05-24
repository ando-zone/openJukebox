import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .app.api import router as api_router
from .app.websockets import router as ws_router

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

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True) 
