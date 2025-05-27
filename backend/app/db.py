import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from databases import Database

# 데이터베이스 파일 경로
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./openjukebox.db")

# SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# 세션 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 생성
Base = declarative_base()

# 메타데이터 객체
metadata = MetaData()

# Database 인스턴스
database = Database(DATABASE_URL)

# DB 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 