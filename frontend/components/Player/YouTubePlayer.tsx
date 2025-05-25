'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, RefreshCw } from 'lucide-react';
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
  
  // 🎯 사용자 seek 감지를 위한 이전 위치 추적
  const lastPositionRef = useRef(0);
  const positionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🎯 서버 seek 타임스탬프 추적
  const serverSeekTimeRef = useRef(0);
  
  // 현재 재생할 비디오
  const currentVideo = currentTrack !== null && playlist.length > 0 
    ? playlist[currentTrack] 
    : null;

  // ===== Effect 훅들 =====
  
  // 🎯 사용자 seek 감지를 위한 위치 모니터링 (개선된 버전)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    // 기존 인터벌 정리
    if (positionCheckIntervalRef.current) {
      clearInterval(positionCheckIntervalRef.current);
    }
    
    // 1초마다 위치 체크
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      
      try {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        const lastPos = lastPositionRef.current;
        const timeDiff = Math.abs(currentTime - lastPos);
        const now = Date.now();
        
        // 🎯 개선된 서버 seek 구분 로직
        const isRecentServerSeek = (now - serverSeekTimeRef.current) < 3000; // 3초 이내
        
        console.log(`📊 위치 체크: ${lastPos}초 → ${currentTime}초 (차이: ${timeDiff}초, 서버seek: ${isRecentServerSeek})`);
        
        // 🎯 사용자 seek 감지 조건 (개선됨):
        if (timeDiff >= 3 && !isRecentServerSeek && currentTime >= 5) {
          console.log(`🎯 사용자 seek 감지: ${lastPos}초 → ${currentTime}초`);
          console.log('👆 모든 사용자에게 위치 동기화 전송');
          onSeek(currentTime);
        }
        
        lastPositionRef.current = currentTime;
      } catch (error) {
        console.error('위치 체크 오류:', error);
      }
    }, 1000);
    
    positionCheckIntervalRef.current = interval;
    
    // 정리 함수
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlayerReady, onSeek]); // lastPosition 의존성 제거
  
  // 🎯 seek 콜백 등록 - 서버에서 seek 이벤트 받으면 플레이어 이동 (개선됨)
  useEffect(() => {
    setOnSeek((position: number) => {
      if (!isPlayerReady || !playerRef.current) {
        console.log('플레이어 준비되지 않음 - seek 무시');
        return;
      }
      
      console.log(`🎯 서버에서 seek 이벤트 수신: ${position}초 - 플레이어 이동`);
      
      try {
        // 🎯 서버 seek 타임스탬프 기록
        serverSeekTimeRef.current = Date.now();
        
        // 🎯 예상 위치 미리 업데이트 (감지 방지)
        lastPositionRef.current = position;
        
        playerRef.current.seekTo(position, true);
        
        console.log(`⏰ 서버 seek 타임스탬프 기록: ${serverSeekTimeRef.current}`);
      } catch (error) {
        console.error('Seek 처리 오류:', error);
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
    height: '100%',
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
      <div className="mt-6">
        {/* 현재 재생 중인 트랙 정보 */}
        {currentVideo && (
          <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
              {currentVideo.title}
            </h3>
            <p className="text-gray-400 text-sm">{currentVideo.channel}</p>
          </div>
        )}

        {/* 컨트롤 버튼들 */}
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={onPrev}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-white/10"
            title="이전 곡"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>
          
          <button 
            onClick={isPlaying ? onPause : onPlay}
            className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
            title={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </button>
          
          <button 
            onClick={onNext}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-white/10"
            title="다음 곡"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 동기화 버튼들 */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button 
            onClick={handleManualSeek}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-green-500/30 text-green-400 hover:text-green-300"
            title="현재 위치를 모든 사용자에게 동기화"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">위치 동기화</span>
          </button>
          
          <button 
            onClick={() => {
              console.log('📍 다른 사용자의 현재 위치 요청');
              onSeek(-1);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-purple-500/30 text-purple-400 hover:text-purple-300"
            title="다른 사용자의 현재 위치로 동기화"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">위치 요청</span>
          </button>
        </div>
      </div>
    );
  };

  // 빈 플레이리스트 처리
  if (!currentVideo) {
    return (
      <div className="card glass hover-lift">
        <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex flex-col items-center justify-center text-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mb-6">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">재생할 트랙이 없습니다</h3>
          <p className="text-gray-400 mb-6">검색을 통해 좋아하는 음악을 추가해보세요</p>
        </div>
        {renderControls()}
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      {/* YouTube 플레이어 */}
      <div className="relative w-full bg-black rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
        <YouTube
          videoId={currentVideo.id}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          className="w-full h-full"
        />
      </div>
      
      {renderControls()}
    </div>
  );
} 