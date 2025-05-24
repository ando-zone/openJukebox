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
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number, index?: number) => void;
  onNext: () => void;
  onPrev: () => void;
  setOnSeek: (callback: (position: number) => void) => void;
  setOnPositionRequest: (callback: () => void) => void;
}

export default function YouTubePlayer({
  playlist,
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onNext,
  onPrev,
  setOnSeek,
  setOnPositionRequest
}: YouTubePlayerProps) {
  
  // ===== 상태 관리 =====
  
  // YouTube 플레이어 인스턴스 참조
  const playerRef = useRef<YTPlayer | null>(null);
  
  // 플레이어 준비 상태만 관리
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // 🎯 무한루프 방지: 서버에서 받은 seek인지 구분
  const [isServerSeek, setIsServerSeek] = useState(false);
  
  // 현재 재생할 비디오
  const currentVideo = currentTrack !== null && playlist.length > 0 
    ? playlist[currentTrack] 
    : null;

  // ===== Effect 훅들 =====
  
  // 트랙 변경 시 초기화
  useEffect(() => {
    console.log(`🎵 트랙 변경: ${currentTrack}`);
    setIsPlayerReady(false);
    setIsServerSeek(false);
  }, [currentTrack]);
  
  // 🎯 seek 콜백 등록 - 서버에서 seek 이벤트 받으면 플레이어 이동
  useEffect(() => {
    setOnSeek((position: number) => {
      if (!isPlayerReady || !playerRef.current) {
        console.log('플레이어 준비되지 않음 - seek 무시');
        return;
      }
      
      console.log(`🎯 서버에서 seek 이벤트 수신: ${position}초 - 플레이어 이동`);
      
      try {
        // 🎯 서버 seek 플래그 설정 (무한루프 방지)
        setIsServerSeek(true);
        playerRef.current.seekTo(position, true);
        
        // 1초 후 플래그 해제
        setTimeout(() => {
          setIsServerSeek(false);
        }, 1000);
      } catch (error) {
        console.error('Seek 처리 오류:', error);
        setIsServerSeek(false);
      }
    });
  }, [isPlayerReady, setOnSeek]);
  
  // 🎯 위치 요청 콜백 등록 - 다른 사용자가 현재 위치를 요청할 때
  useEffect(() => {
    setOnPositionRequest(() => {
      if (!isPlayerReady || !playerRef.current) {
        console.log('플레이어 준비되지 않음 - 위치 요청 무시');
        return;
      }
      
      try {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        console.log(`📍 위치 요청 받음 - 현재 위치 ${currentTime}초 공유`);
        
        // 현재 위치가 5초 이상이면 공유
        if (currentTime > 5) {
          onSeek(currentTime);
        }
      } catch (error) {
        console.error('위치 요청 처리 오류:', error);
      }
    });
  }, [isPlayerReady, setOnPositionRequest, onSeek]);
  
  // 🎯 새 사용자를 위한 현재 위치 요청 (한 번만 실행)
  useEffect(() => {
    // 🎯 자동 위치 요청 제거 - 수동 동기화만 사용
    // 사용자가 필요할 때 "위치 동기화" 버튼을 클릭하여 동기화
    console.log('🎵 플레이어 준비 완료 - 수동 동기화 버튼을 사용하세요');
  }, [isPlayerReady, currentVideo]);
  
  // 재생/일시정지 동기화
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    try {
      if (isPlaying) {
        console.log('▶️ YouTube 플레이어 재생');
        playerRef.current.playVideo();
      } else {
        console.log('⏸️ YouTube 플레이어 일시정지');
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error('플레이어 제어 오류:', error);
    }
  }, [isPlaying, isPlayerReady]);

  // ===== YouTube 플레이어 설정 =====
  
  const opts = {
    height: '390',
    width: '100%',
    playerVars: {
      autoplay: 1,
      mute: 0,
      controls: 1,        // YouTube 자체 컨트롤 사용 (시간 표시 포함)
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 1,
      cc_load_policy: 0,
      start: 0, // 항상 0초부터 시작 (서버 position 제거)
      enablejsapi: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  };
  
  // ===== 이벤트 핸들러들 =====
  
  const handleReady = (event: YouTubeEvent) => {
    console.log('🎬 YouTube 플레이어 준비 완료');
    playerRef.current = event.target;
    setIsPlayerReady(true);
  };
  
  const handleStateChange = (event: YouTubeEvent) => {
    const playerState = event.data;
    console.log(`🎵 플레이어 상태: ${playerState}`);
    
    // 사용자 직접 조작만 서버에 알림
    if (playerState === 1 && !isPlaying) {
      console.log('👆 사용자 직접 재생');
      onPlay();
    } else if (playerState === 2 && isPlaying) {
      console.log('👆 사용자 직접 일시정지');
      onPause();
    } else if (playerState === 0) {
      console.log('🔚 동영상 종료 - 다음 트랙');
      onNext();
    }
    
    // 🎯 사용자 seek 감지 로직 제거 (너무 많은 요청 발생)
    // YouTube 플레이어의 자체 컨트롤을 사용하여 사용자가 직접 seek할 수 있도록 함
  };
  
  // 🎯 수동 seek 버튼 (디버깅/테스트용)
  const handleManualSeek = () => {
    if (!playerRef.current) return;
    
    try {
      const currentTime = Math.floor(playerRef.current.getCurrentTime());
      console.log(`👆 수동 seek: ${currentTime}초 - 모든 사용자에게 적용`);
      onSeek(currentTime);
    } catch (error) {
      console.error('수동 Seek 처리 오류:', error);
    }
  };

  // 컨트롤 버튼들
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
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 text-white"
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
        
        {/* 🎯 수동 위치 동기화 버튼 */}
        <button 
          onClick={handleManualSeek}
          className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white"
          title="현재 위치를 모든 사용자에게 동기화"
        >
          위치 동기화
        </button>
        
        {/* 🎯 위치 요청 버튼 (새 사용자용) */}
        <button 
          onClick={() => {
            console.log('📍 다른 사용자의 현재 위치 요청');
            onSeek(-1);
          }}
          className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600 text-white"
          title="다른 사용자의 현재 위치로 동기화"
        >
          위치 요청
        </button>
      </div>
    );
  };

  // 빈 플레이리스트 처리
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