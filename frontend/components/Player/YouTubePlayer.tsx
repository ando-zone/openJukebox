'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import YouTube, { YouTubeEvent, YouTubePlayer as YTPlayer } from 'react-youtube';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
  publishedAt: string;
}

interface AppState {
  playlist: Track[];
  current_track: number | null;
  playing: boolean;
  position?: number;
  last_update_time?: number;
  volume?: number;
}

interface YouTubePlayerProps {
  playlist: Track[];
  currentTrack: number | null;
  isPlaying: boolean;
  position?: number;
  lastUpdateTime?: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number, index?: number) => void;
  onNext: () => void;
  onPrev: () => void;
  setOnSyncUpdate: (callback: (state: AppState) => void) => void;
}

export default function YouTubePlayer({
  playlist,
  currentTrack,
  isPlaying,
  position,
  lastUpdateTime,
  onPlay,
  onPause,
  onSeek,
  onNext,
  onPrev,
  setOnSyncUpdate,
}: YouTubePlayerProps) {
  
  // ===== 상태 관리 =====
  
  // YouTube 플레이어 인스턴스 참조
  const playerRef = useRef<YTPlayer | null>(null);
  
  // 플레이어 준비 상태만 관리
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // 서버 seek 감지를 위한 상태
  const [isServerSeek, setIsServerSeek] = useState(false);
  
  // 사용자 seek 감지를 위한 이전 위치 추적
  const lastPositionRef = useRef(0);
  
  // 마스터 클라이언트 동기화 타임스탬프 추적
  const masterSyncTimeRef = useRef(0);
  
  // YouTube seek으로 인한 일시정지 추적
  const seekPauseTimeRef = useRef(0);
  
  // 현재 재생할 비디오
  const currentVideo = currentTrack !== null && playlist.length > 0 
    ? playlist[currentTrack] 
    : null;

  // ===== Effect 훅들 =====
  
  // 재생/일시정지 동기화
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    try {
      const player = playerRef.current;
      if (!player) return;
      
      if (isPlaying) {
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        }
      } else {
        if (typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        }
      }
    } catch (error) {
      console.error('플레이어 제어 오류:', error);
    }
  }, [isPlaying, isPlayerReady]);
  
  // 마스터 클라이언트 동기화 콜백 등록
  useEffect(() => {
    setOnSyncUpdate((state: AppState) => {
      if (!isPlayerReady || !playerRef.current) {
        return;
      }
      
      try {
        // 위치 동기화
        if (state.position !== undefined && state.position > 0) {
          // 안전한 플레이어 접근
          const player = playerRef.current;
          if (!player || typeof player.getCurrentTime !== 'function') {
            return;
          }
          
          const currentPlayerTime = Math.floor(player.getCurrentTime());
          const targetPosition = Math.floor(state.position);
          const timeDiff = Math.abs(currentPlayerTime - targetPosition);
          
          // 3초 이상 차이나면 동기화
          if (timeDiff >= 3) {
            masterSyncTimeRef.current = Date.now();
            lastPositionRef.current = targetPosition;
            
            // seekTo 메서드 존재 확인
            if (typeof player.seekTo === 'function') {
              player.seekTo(targetPosition, true);
            }
          }
        }
      } catch (error) {
        console.error('동기화 처리 오류:', error);
      }
    });
  }, [isPlayerReady, setOnSyncUpdate]);

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
      start: 0, // 항상 0초부터 시작
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
    const now = Date.now();
    
    // YouTube 플레이어 상태: 0=종료, 1=재생, 2=일시정지, 3=버퍼링, 5=큐
    
    if (playerState === 1 && !isPlaying) {
      // 재생 시작 - 사용자가 직접 재생 버튼을 눌렀을 때
      onPlay();
    } else if (playerState === 2 && isPlaying) {
      // 일시정지 감지 - seek으로 인한 것인지 확인
      const isSeekPause = (now - seekPauseTimeRef.current) < 1000; // 1초 이내
      
      if (!isSeekPause) {
        // 실제 사용자 일시정지
        onPause();
      }
      // seek으로 인한 일시정지는 무시 (자동으로 재생 복원됨)
    } else if (playerState === 0) {
      // 동영상 종료
      onNext();
    }
    
    // 사용자가 YouTube 컨트롤로 seek한 경우 감지
    if (playerRef.current && isPlayerReady) {
      try {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== 'function') {
          return;
        }
        
        const currentTime = Math.floor(player.getCurrentTime());
        const lastPos = lastPositionRef.current;
        const timeDiff = Math.abs(currentTime - lastPos);
        
        // 최근 마스터 동기화 여부 확인 (3초 이내)
        const isRecentMasterSync = (now - masterSyncTimeRef.current) < 500;
        
        // 사용자 seek 감지: 3초 이상 차이나고 최근 마스터 동기화가 아닐 때
        if (timeDiff >= 3 && !isRecentMasterSync && currentTime > 0) {
          // seek으로 인한 일시정지 타임스탬프 기록
          seekPauseTimeRef.current = now;
          
          // seek 위치 전송
          onSeek(currentTime);
          
          // 재생 중이었다면 잠시 후 자동 재생 복원
          if (isPlaying) {
            setTimeout(() => {
              if (player && typeof player.playVideo === 'function') {
                player.playVideo();
              }
            }, 100); // 100ms 후 재생 복원
          }
        }
        
        lastPositionRef.current = currentTime;
      } catch (error) {
        console.error('사용자 seek 감지 오류:', error);
      }
    }
  };
  
  // 마스터 클라이언트 위치로 동기화 (클라이언트가 마스터와 안 맞을 때 사용)
  const syncToMasterPosition = () => {
    if (!position || position <= 0) {
      return;
    }
    
    console.log(`📍 마스터 위치로 동기화: ${position.toFixed(1)}초`);
    
    if (playerRef.current) {
      try {
        const player = playerRef.current;
        if (!player || typeof player.seekTo !== 'function') {
          console.error('플레이어가 준비되지 않았습니다.');
          return;
        }
        
        masterSyncTimeRef.current = Date.now();
        lastPositionRef.current = Math.floor(position);
        player.seekTo(position, true);
      } catch (error) {
        console.error('마스터 위치 동기화 오류:', error);
      }
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
            {position !== undefined && lastUpdateTime && (
              <p className="text-green-400 text-xs mt-1">
                마스터 위치: {position.toFixed(1)}초 | 
                내 플레이어: {
                  playerRef.current && typeof playerRef.current.getCurrentTime === 'function' 
                    ? playerRef.current.getCurrentTime().toFixed(1) 
                    : '준비중'
                }초
              </p>
            )}
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

        {/* 서버 동기화 버튼 */}
        <div className="flex items-center justify-center mt-6">
          <button 
            onClick={syncToMasterPosition}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all duration-200 backdrop-blur-sm border border-purple-500/30 text-purple-400 hover:text-purple-300"
            title="마스터 위치로 내 플레이어 동기화"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">마스터 동기화</span>
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