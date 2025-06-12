import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from databases import Database
from backend.config import settings

# PostgreSQL 데이터베이스 URL
DATABASE_URL = settings.database_url
ASYNC_DATABASE_URL = settings.async_database_url

# SQLAlchemy 엔진 생성 (PostgreSQL용)
engine = create_engine(DATABASE_URL)

# 세션 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스 생성
Base = declarative_base()

# 메타데이터 객체
metadata = MetaData()

# Database 인스턴스 (비동기용)
database = Database(ASYNC_DATABASE_URL)

# DB 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 