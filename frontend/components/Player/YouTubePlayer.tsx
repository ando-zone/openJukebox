'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
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
  onSeek: (position: number, index?: number) => Promise<void>;
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
  
  // 사용자 seek 감지를 위한 이전 위치 추적
  const lastPositionRef = useRef(0);
  
  // 마스터 클라이언트 동기화 타임스탬프 추적
  const masterSyncTimeRef = useRef(0);
  
  // seek 작업 중인지 추적 (더 정확함)
  const isSeekingRef = useRef(false);
  
  // 초기 로딩 중인지 추적 (자동 재생 방지용)
  const isInitialLoadingRef = useRef(true);
  
  // 사용자가 직접 일시정지 버튼을 눌렀는지 여부를 추적하는 ref
  const userPausedByButtonRef = useRef(false);
  
  // 현재 재생할 비디오
  const currentVideo = currentTrack !== null && playlist.length > 0 
    ? playlist[currentTrack] 
    : null;

  // 재생바 상태 관리
  const [progressBarTime, setProgressBarTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== 유틸리티 함수들 =====
  
  // 사용자 의도적 seek 감지 조건 확인
  const isIntentionalSeek = (timeDiff: number, isRecentMasterSync: boolean, currentTime: number): boolean => {
    return timeDiff >= 3 && !isRecentMasterSync && currentTime > 0;
  };

  /**
   * 마스터 클라이언트로부터 받은 위치 정보가 동기화 가능한지 확인
   * 
   * @param position - 마스터 클라이언트의 재생 위치 (초 단위)
   * @returns 동기화 가능한 유효한 위치인지 여부
   * 
   * 조건:
   * - position이 undefined가 아님 (유효한 값 존재)
   * - position이 0보다 큼 (실제 재생 중인 위치, 0초는 초기/정지 상태)
   */
     const isValidSyncPosition = (position: number | undefined): position is number => {
     return position !== undefined && position > 0;
   };

  // ===== 이벤트 핸들러들 =====
  
  const handleReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsPlayerReady(true);
    
    // 비디오 정보 초기화 및 재생바 업데이트 시작
    try {
      const player = event.target;
      startProgressUpdater();
    } catch (error) {
      console.error('플레이어 초기화 오류:', error);
    }
    
    // 초기 로딩 완료 후 잠시 대기한 다음 플래그 해제
    setTimeout(() => {
      isInitialLoadingRef.current = false;

      // 마스터 상태에 따라 플레이어 동기화
      if (isPlaying && playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch (error) {
          console.error('초기 재생 동기화 오류:', error);
        }
      }
    }, 1000); // 1초 후 초기 로딩 플래그 해제
  };
  
  const handleStateChange = (event: YouTubeEvent) => {
    const playerState = event.data;
    const now = Date.now();
    
    // 초기 로딩 중에는 상태 변경 무시 (자동 재생 방지)
    if (isInitialLoadingRef.current) {
      console.log('🔄 초기 로딩 중 - 상태 변경 무시:', playerState);
      return;
    }
    
    // 🔥 SEEK 감지를 먼저 처리! (일시정지 감지보다 우선)
    if (playerRef.current && isPlayerReady) {
      try {
        const player = playerRef.current;
        if (!player) {
          return;
        }
        
        const currentTime = Math.floor(player.getCurrentTime());
        const lastPos = lastPositionRef.current;
        const timeDiff = Math.abs(currentTime - lastPos);
        
        // 최근 마스터 동기화 여부 확인 (500ms 이내)
        const isRecentMasterSync = (now - masterSyncTimeRef.current) < 500;
        
        // 사용자 의도적 seek 감지
        if (isIntentionalSeek(timeDiff, isRecentMasterSync, currentTime)) {
          // seek 시작 플래그 설정
          isSeekingRef.current = true;
          
          // seek 위치 전송하고 실제 완료까지 대기
          onSeek(currentTime)
            .then(() => {
              // 실제 완료 후 플래그 해제
              isSeekingRef.current = false;
            })
            .catch((error) => {
              // 에러 발생 시에도 플래그 해제 (안전장치)
              console.error('seek 완료 대기 중 오류:', error);
              isSeekingRef.current = false;
            });
        }
        
        lastPositionRef.current = currentTime;
      } catch (error) {
        console.error('사용자 seek 감지 오류:', error);
      }
    }
    
    // YouTube 플레이어 상태 처리 (seek 감지 후에 처리)
    // 0=종료, 1=재생, 2=일시정지, 3=버퍼링, 5=큐
    
    if (playerState === 1 && !isPlaying) {
      // 재생 시작 - 사용자가 직접 재생 버튼을 눌렀을 때
      console.log('▶️ YouTube 플레이어에서 재생 감지');
      onPlay();
    } else if (playerState === 2 && isPlaying) {
      // 일시정지 상태가 되었을 때, 사용자가 직접 버튼을 눌렀을 때만 onPause() 호출
      if (userPausedByButtonRef.current) {
        console.log('⏸️ (직접) YouTube 플레이어에서 일시정지 감지');
        onPause();
        userPausedByButtonRef.current = false;
      } else {
        console.log('⏸️ (자동) YouTube 플레이어에서 일시정지 감지 - 서버 전파 안함');
      }
    } else if (playerState === 0) {
      // 동영상 종료
      console.log('⏭️ 동영상 종료 - 다음 트랙으로');
      onNext();
    }
  };

  // ===== Effect 훅들 =====
  
  // 외부 재생 상태를 YouTube 플레이어에 반영
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    
    try {
      const player = playerRef.current;
      
      if (isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
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
        if (isValidSyncPosition(state.position)) {
          // 안전한 플레이어 접근
          const player = playerRef.current;
          if (!player) {
            return;
          }
          
          const currentPlayerTime = Math.floor(player.getCurrentTime());
          const targetPosition = Math.floor(state.position);
          const timeDiff = Math.abs(currentPlayerTime - targetPosition);
          
          // 2초 이상 차이나면 동기화
          if (timeDiff >= 2) {
            // YouTube 플레이어가 실제로 seek 가능한 상태인지 확인
            try {
              const duration = player.getDuration();
              const playerState = player.getPlayerState();
              
              // 비디오가 로드되고, 재생 가능한 상태에서만 seek
              if (duration > 0 && targetPosition <= duration && playerState !== -1) {
                masterSyncTimeRef.current = Date.now();
                lastPositionRef.current = targetPosition;
                
                // seekTo 실행
                player.seekTo(targetPosition, true);
              } else {
                console.log('🔄 동기화 스킵 - 플레이어 준비 안됨:', { duration, targetPosition, playerState });
              }
            } catch (seekError) {
              console.error('seekTo 실행 중 오류:', seekError);
            }
          }
        }
      } catch (error) {
        console.error('동기화 처리 오류:', error);
      }
    });
  }, [isPlayerReady, setOnSyncUpdate]);

  // 재생바 업데이트 시작
  const startProgressUpdater = () => {
    stopProgressUpdater(); // 기존 인터벌 정리
    
    if (!isPlayerReady || !playerRef.current) return;
    
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || isDragging) return;
      
      try {
        const player = playerRef.current;
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        
        if (duration > 0) {
          setTotalDuration(duration);
        }
        
        if (currentTime >= 0) {
          setProgressBarTime(currentTime);
        }
      } catch (error) {
        console.error('재생 시간 업데이트 오류:', error);
      }
    }, 500); // 0.5초마다 업데이트 (더 부드러운 UI)
  };

  // 재생바 업데이트 중지
  const stopProgressUpdater = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 재생 상태 변경 시 업데이터 관리
  useEffect(() => {
    if (isPlaying) {
      startProgressUpdater();
    } else {
      stopProgressUpdater();
    }
    
    return () => stopProgressUpdater();
  }, [isPlaying, isPlayerReady]);

  // 트랙 변경 시 재생바 초기화
  useEffect(() => {
    setProgressBarTime(0);
    setTotalDuration(0);
    setIsDragging(false);
    stopProgressUpdater();
    
    // 새 트랙 로드 후 업데이터 다시 시작
    if (isPlayerReady) {
      setTimeout(startProgressUpdater, 1000);
    }
  }, [currentTrack]);

  // 서버 동기화 처리
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || isDragging) return;
    if (typeof position !== 'number') return;
    
    const player = playerRef.current;
    try {
      const currentPlayerTime = player.getCurrentTime();
      const timeDiff = Math.abs(currentPlayerTime - position);
      
      // 2초 이상 차이날 때만 동기화
      if (timeDiff >= 2) {
        player.seekTo(position, true);
        setProgressBarTime(position);
      }
    } catch (error) {
      console.error('서버 동기화 오류:', error);
    }
     }, [position, isPlayerReady, isDragging]);

   // 컴포넌트 언마운트 시 정리
   useEffect(() => {
     return () => {
       stopProgressUpdater();
     };
   }, []);

     // 재생바 드래그 시작
   const handleProgressMouseDown = () => {
     setIsDragging(true);
     // 드래그 시작 시 자동 업데이트 중지
     stopProgressUpdater();
   };

  // 재생바 드래그 중
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setProgressBarTime(newTime);
  };

     // 재생바 드래그 끝
   const handleProgressMouseUp = async (e: React.MouseEvent<HTMLInputElement>) => {
     const finalTime = Number((e.target as HTMLInputElement).value);
     setIsDragging(false);
     
     try {
       await onSeek(finalTime);
       setProgressBarTime(finalTime);
       
       // seek 완료 후 재생 중이면 자동 업데이트 재시작
       if (isPlaying) {
         startProgressUpdater();
       }
     } catch (error) {
       console.error('Seek 오류:', error);
       // 실패 시 플레이어의 실제 위치로 복원
       if (playerRef.current) {
         setProgressBarTime(playerRef.current.getCurrentTime());
       }
       
       // 에러 발생 시에도 재생 중이면 자동 업데이트 재시작
       if (isPlaying) {
         startProgressUpdater();
       }
     }
   };

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ===== YouTube 플레이어 설정 =====
  
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,        // 자동 재생 비활성화 (새 사용자 입장 시 자동 재생 방지)
      mute: 0,
      controls: 0,        // 유튜브 자체 컨트롤 숨김 (사용자 조작 불가)
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

  // ===== 렌더링 함수들 =====

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
            onClick={() => {
              if (isPlaying) {
                userPausedByButtonRef.current = true;
                onPause();
              } else {
                onPlay();
              }
            }}
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
      </div>
    );
  };

  // ===== 메인 렌더링 =====

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
        {/* 입력 차단 오버레이 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            cursor: 'not-allowed',
            pointerEvents: 'all',
          }}
          tabIndex={-1}
          onClick={e => e.preventDefault()}
          onKeyDown={e => e.preventDefault()}
        />
      </div>
      {/* 커스텀 재생바 */}
      <div className="w-full flex flex-col items-center gap-3 mb-4">
        {/* 재생바 컨테이너 */}
        <div className="relative w-full h-2 group cursor-pointer">
          {/* 배경 트랙 */}
          <div className="absolute inset-0 bg-gray-700 rounded-full group-hover:bg-gray-600 transition-colors duration-200"></div>
          
          {/* 진행률 바 (채워진 부분) */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-200 group-hover:from-pink-400 group-hover:to-purple-500"
            style={{ 
              width: totalDuration > 0 ? `${(progressBarTime / totalDuration) * 100}%` : '0%' 
            }}
          ></div>
          
          {/* 숨겨진 range input (실제 기능) */}
          <input
            type="range"
            min={0}
            max={totalDuration || 0}
            step={0.1}
            value={progressBarTime}
            onChange={handleProgressChange}
            onMouseDown={handleProgressMouseDown}
            onMouseUp={handleProgressMouseUp}
            onTouchStart={handleProgressMouseDown}
            onTouchEnd={(e) => {
              // 터치 이벤트를 마우스 이벤트로 변환
              const mouseEvent = {
                target: e.target
              } as React.MouseEvent<HTMLInputElement>;
              handleProgressMouseUp(mouseEvent);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation"
            disabled={!isPlayerReady || !totalDuration}
          />
          
          {/* 드래그 핸들 (동그라미) */}
          <div 
            className={`absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-pink-500 transform -translate-y-1/2 transition-all duration-200 ${
              isDragging ? 'scale-125 shadow-xl' : 'scale-100 group-hover:scale-110'
            }`}
            style={{ 
              left: totalDuration > 0 ? `calc(${(progressBarTime / totalDuration) * 100}% - 8px)` : '0px',
              background: isDragging ? 'linear-gradient(45deg, #ec4899, #8b5cf6)' : '#ffffff'
            }}
          >
            {/* 핸들 내부 점 */}
            <div className="absolute inset-1 bg-pink-500 rounded-full opacity-80"></div>
          </div>
        </div>
        
        {/* 시간 표시 */}
        <div className="w-full flex justify-between text-xs text-gray-300 font-mono">
          <span className="bg-gray-800/50 px-2 py-1 rounded">
            {formatTime(progressBarTime)}
          </span>
          <span className="bg-gray-800/50 px-2 py-1 rounded">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>
      {renderControls()}
    </div>
  );
} 