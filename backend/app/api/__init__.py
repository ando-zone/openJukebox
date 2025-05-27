from fastapi import APIRouter

router = APIRouter(prefix="/api")

from .youtube import *
from .routes.rooms import router as rooms_router

router.include_router(rooms_router, prefix="/rooms", tags=["rooms"]) 