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
  
  // 플레이어 준비 상태
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // 현재 재생 중인 트랙
  const currentVideo = currentTrack !== null && playlist.length > 0 
    ? playlist[currentTrack] 
    : null;
  
  // 로컬 재생 상태 - 실제 유튜브 플레이어 상태와 동기화
  const [localPlayerState, setLocalPlayerState] = useState({
    isPlaying: false,
    currentTime: 0
  });
  
  // 전역 상태(백엔드) 변경 시 플레이어 업데이트
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    // 재생 상태 변경 처리
    if (isPlaying && !localPlayerState.isPlaying) {
      playerRef.current.playVideo();
    } else if (!isPlaying && localPlayerState.isPlaying) {
      playerRef.current.pauseVideo();
    }
    
    // 재생 위치 변경 처리 (위치 차이가 1초 이상일 때만 업데이트)
    if (Math.abs(position - localPlayerState.currentTime) > 1) {
      playerRef.current.seekTo(position, true);
      setLocalPlayerState(prev => ({ ...prev, currentTime: position }));
    }
  }, [isPlaying, position, isPlayerReady, localPlayerState]);
  
  // 유튜브 플레이어 옵션
  const opts = {
    height: '390',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
  };
  
  // 플레이어 준비 완료 핸들러
  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    console.log('YouTube Player 준비 완료');
  };
  
  // 플레이어 상태 변경 핸들러
  const handleStateChange = (event: YouTubeEvent) => {
    const playerState = event.data;
    
    // 플레이어 상태코드:
    // -1 (미시작), 0 (종료), 1 (재생 중), 2 (일시정지), 3 (버퍼링), 5 (큐)
    
    // 재생 상태 동기화
    if (playerState === 1) { // 재생 중
      setLocalPlayerState({
        isPlaying: true,
        currentTime: playerRef.current?.getCurrentTime() || 0
      });
      
      // 백엔드에 재생 상태 업데이트가 필요한 경우에만 전송
      if (!isPlaying) {
        onPlay();
      }
    } else if (playerState === 2) { // 일시정지
      setLocalPlayerState({
        isPlaying: false,
        currentTime: playerRef.current?.getCurrentTime() || 0
      });
      
      // 백엔드에 일시정지 상태 업데이트가 필요한 경우에만 전송
      if (isPlaying) {
        onPause();
      }
    } else if (playerState === 0) { // 종료
      // 동영상 종료 시 다음 트랙으로 이동
      onNext();
    }
  };
  
  // 재생 시간 주기적 업데이트 (5초마다)
  useEffect(() => {
    if (!isPlayerReady || !localPlayerState.isPlaying) return;
    
    const intervalId = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        // 로컬 상태 업데이트
        setLocalPlayerState(prev => ({ ...prev, currentTime }));
        // 백엔드에 현재 재생 위치 동기화
        onSeek(currentTime);
      }
    }, 5000); // 5초마다 업데이트
    
    return () => clearInterval(intervalId);
  }, [isPlayerReady, localPlayerState.isPlaying, onSeek]);
  
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