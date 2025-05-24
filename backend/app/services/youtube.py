from typing import List, Dict, Any, Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from ...config import settings

class YouTubeService:
    def __init__(self, api_key: str = settings.YOUTUBE_API_KEY):
        """YouTube API 서비스 초기화"""
        self.api_key = api_key
        self.youtube = build('youtube', 'v3', developerKey=self.api_key)
    
    async def search_videos(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        YouTube 동영상 검색
        
        Args:
            query: 검색어
            max_results: 최대 검색 결과 수
            
        Returns:
            List[Dict]: 검색 결과 목록
        """
        try:
            search_response = self.youtube.search().list(
                q=query,
                part='snippet',
                maxResults=max_results,
                type='video'
            ).execute()
            
            videos = []
            for item in search_response.get('items', []):                
                # 채널 결과는 건너뛰기 - videoId가 없거나 kind가 channel인 경우
                if 'videoId' not in item['id'] or item['id'].get('kind') == 'youtube#channel':
                    print(f"채널 결과 건너뛰기: {item.get('snippet', {}).get('title', 'Unknown')}")
                    continue
                
                video_id = item['id']['videoId']
                video_info = {
                    'id': video_id,
                    'title': item['snippet']['title'],
                    'thumbnail': item['snippet']['thumbnails']['default']['url'],
                    'channel': item['snippet']['channelTitle'],
                    'publishedAt': item['snippet']['publishedAt']
                }
                videos.append(video_info)
                
            return videos
            
        except HttpError as e:
            print(f"YouTube API 오류: {e}")
            return []
    
    async def get_video_details(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        YouTube 동영상 상세 정보 조회
        
        Args:
            video_id: YouTube 동영상 ID
            
        Returns:
            Dict: 동영상 상세 정보
        """
        try:
            video_response = self.youtube.videos().list(
                id=video_id,
                part='snippet,contentDetails'
            ).execute()
            
            items = video_response.get('items', [])
            if not items:
                return None
                
            item = items[0]
            video_info = {
                'id': video_id,
                'title': item['snippet']['title'],
                'thumbnail': item['snippet']['thumbnails']['default']['url'],
                'channel': item['snippet']['channelTitle'],
                'duration': item['contentDetails']['duration'],
                'publishedAt': item['snippet']['publishedAt']
            }
            
            return video_info
            
        except HttpError as e:
            print(f"YouTube API 오류: {e}")
            return None

# 서비스 인스턴스 생성
youtube_service = YouTubeService() 