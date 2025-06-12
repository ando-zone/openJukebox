from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field
from urllib.parse import quote_plus

# .env 파일 로드
load_dotenv()

class Settings(BaseSettings):    
    # YouTube Data API 설정
    YOUTUBE_API_KEY: str = Field(default="", env="YOUTUBE_API_KEY")

    # 클라이언트 URL (CORS)
    FRONTEND_URL: str = Field(default="http://localhost:3000", env="FRONTEND_URL")

    # PostgreSQL 데이터베이스 설정
    DB_HOST: str = Field(default="localhost", env="DB_HOST")
    DB_PORT: int = Field(default=5432, env="DB_PORT")
    DB_NAME: str = Field(default="openjukebox", env="DB_NAME")
    DB_USER: str = Field(default="postgres", env="DB_USER")
    DB_PASSWORD: str = Field(default="", env="DB_PASSWORD")

    @property
    def database_url(self) -> str:
        pwd = quote_plus(self.DB_PASSWORD)
        return f"postgresql://{self.DB_USER}:{pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def async_database_url(self) -> str:
        pwd = quote_plus(self.DB_PASSWORD)
        return f"postgresql+asyncpg://{self.DB_USER}:{pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        env_file = ".env"

settings = Settings() 
