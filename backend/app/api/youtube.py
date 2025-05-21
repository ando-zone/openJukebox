from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any

from . import router
from ..services.youtube import youtube_service

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_videos(q: str = Query(..., description="검색어")):
    """
    YouTube 동영상 검색 API
    
    Args:
        q: 검색어
        
    Returns:
        List[Dict]: 검색 결과 목록
    """
    videos = await youtube_service.search_videos(q)
    return videos

@router.get("/video/{video_id}", response_model=Dict[str, Any])
async def get_video_details(video_id: str):
    """
    YouTube 동영상 상세 정보 조회 API
    
    Args:
        video_id: YouTube 동영상 ID
        
    Returns:
        Dict: 동영상 상세 정보
    """
    video = await youtube_service.get_video_details(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="동영상을 찾을 수 없습니다")
    return video 