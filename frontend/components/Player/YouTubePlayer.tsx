'use client';

import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer as YTPlayer } from 'react-youtube';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
  publishedAt: string;
}

interface YouTubePlayerProps {
  playlist: Track[];
  currentTrack: number | null;
  isPlaying: boolean;
  position: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number, index?: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function YouTubePlayer({
  playlist,
  currentTrack,
  isPlaying,
  position,
  onPlay,
  onPause,
  onSeek,
  onNext,
  onPrev
}: YouTubePlayerProps) {
  
  // 유튜브 플레이어 인스턴스 참조
  const playerRef = useRef<YTPlayer | null>(null);
  
  // 플레이어 준비 상태만 관리 (로컬 재생 상태 제거)
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // 현재 재생 중인 트랙
  const currentVideo = currentTrack !== null && playlist.length > 0 
    ? playlist[currentTrack] 
    : null;

  // 트랙 변경 시 플레이어 준비 상태 초기화
  useEffect(() => {
    setIsPlayerReady(false);
  }, [currentTrack]);
  
  // ✅ 단순한 백엔드 → YouTube 동기화 (단방향)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('플레이어 제어 오류:', error);
    }
  }, [isPlaying, isPlayerReady]);
  
  // ✅ 재생 위치 동기화 (단방향)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    try {
      const currentTime = playerRef.current.getCurrentTime();
      // 위치 차이가 2초 이상일 때만 업데이트 (너무 민감하지 않게)
      if (Math.abs(position - currentTime) > 2) {
        playerRef.current.seekTo(position, true);
      }
    } catch (error) {
      console.error('위치 변경 오류:', error);
    }
  }, [position, isPlayerReady]);

  // 유튜브 플레이어 옵션
  const opts = {
    height: '390',
    width: '100%',
    playerVars: {
      autoplay: 1,        // 자동재생 활성화
      mute: 0,           // 음소거 해제
      controls: 1,       // 컨트롤 표시
      rel: 0,           // 관련 동영상 숨김
      modestbranding: 1, // YouTube 로고 최소화
      iv_load_policy: 3, // 주석 숨김
      fs: 1,            // 전체화면 버튼 표시
      cc_load_policy: 0, // 자막 기본 비활성화
      start: Math.floor(position), // 시작 위치
      enablejsapi: 1,   // JavaScript API 활성화
      origin: window.location.origin, // CORS 설정
    },
  };
  
  // 플레이어 준비 완료 핸들러
  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
  };
  
  // ✅ 단순한 YouTube 상태 → 백엔드 업데이트 (단방향)
  const handleStateChange = (event: YouTubeEvent) => {
    const playerState = event.data;
    
    // 플레이어 상태코드:
    // -1 (미시작), 0 (종료), 1 (재생 중), 2 (일시정지), 3 (버퍼링), 5 (큐)
    
    // 사용자가 YouTube 플레이어에서 직접 조작한 경우만 백엔드 업데이트
    if (playerState === 1 && !isPlaying) {
      // 사용자가 플레이어에서 직접 재생 버튼을 눌렀을 때
      onPlay();
    } else if (playerState === 2 && isPlaying) {
      // 사용자가 플레이어에서 직접 일시정지 버튼을 눌렀을 때
      onPause();
    } else if (playerState === 0) {
      // 동영상 종료 시 다음 트랙으로 이동
      onNext();
    }
    // 버퍼링(3), 큐(5) 등은 무시 - 일시적 상태이므로 백엔드 업데이트 안 함
  };

  // 재생 컨트롤 버튼 렌더링
  const renderControls = () => {
    return (
      <div className="flex justify-center space-x-4 mt-4">
        <button 
          onClick={onPrev}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          이전
        </button>
        {isPlaying ? (
          <button 
            onClick={onPause}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            일시정지
          </button>
        ) : (
          <button 
            onClick={onPlay}
            className="px-4 py-2 bg-primary rounded hover:bg-primary-dark text-white"
          >
            재생
          </button>
        )}
        <button 
          onClick={onNext}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          다음
        </button>
      </div>
    );
  };

  // 빈 플레이리스트일 경우 메시지 표시
  if (!currentVideo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-[390px] bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">재생할 트랙을 추가해주세요</p>
        </div>
        {renderControls()}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{currentVideo.title}</h2>
      
      <YouTube
        videoId={currentVideo.id}
        opts={opts}
        onReady={handleReady}
        onStateChange={handleStateChange}
      />
      <p className="text-sm text-gray-500 mt-2">{currentVideo.channel}</p>
      {renderControls()}
    </div>
  );
} 