from fastapi import APIRouter

router = APIRouter(prefix="/api")

from .youtube import * 