import os
from dotenv import load_dotenv
from pydantic import BaseSettings

# .env 파일 로드
load_dotenv()

class Settings(BaseSettings):
    # FastAPI 설정
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # YouTube Data API 설정
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    
    # 클라이언트 URL (CORS)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    class Config:
        env_file = ".env"

settings = Settings() 