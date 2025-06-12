'use client'

import { useState, useEffect } from 'react'
import { Music, Users, Headphones, ArrowLeft } from 'lucide-react'
import Search from '@/components/Search/SearchBar'
import Player from '@/components/Player/YouTubePlayer'
import Playlist from '@/components/Playlist/PlaylistView'
import { useWebSocket, useRoomInfo } from '@/hooks/useWebSocket'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RoomPageProps {
  params: {
    id: string
  }
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const roomId = params.id;
  
  // 방 정보 가져오기
  const { roomInfo, loading: roomLoading, error: roomError } = useRoomInfo(roomId);
  
  const {
    state,
    isConnected,
    lastSyncTime,
    addTrack,
    playTrack,
    pauseTrack,
    seekTrack,
    nextTrack,
    prevTrack,
    setOnSyncUpdate,
    getCurrentPosition
  } = useWebSocket(roomId);

  // 연결 상태 확인
  useEffect(() => {
    // 연결 실패 시 홈으로 리다이렉트하는 로직은 여기에 추가
    // 실제 구현에서는 필요할 수 있음
  }, [isConnected]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 배경 장식 요소들 */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #9333ea, #ec4899)',
            filter: 'blur(60px)'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #3b82f6, #06b6d4)',
            filter: 'blur(60px)'
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* 헤더 */}
        <header className="mb-12 fade-in">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>방 목록으로 돌아가기</span>
            </Link>
            
            <div className="flex items-center gap-6 flex-wrap">
              <div className="badge">
                <Users className="w-4 h-4" style={{ color: isConnected ? '#4ade80' : '#ef4444' }} />
                <span>{isConnected ? '연결됨' : '연결 끊김'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-2xl opacity-75"
                style={{
                  background: 'linear-gradient(135deg, #9333ea, #ec4899)',
                  filter: 'blur(8px)'
                }}
              />
              <div 
                className="relative p-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)'
                }}
              >
                <Music className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {roomLoading ? (
                  <span className="animate-pulse">로딩 중...</span>
                ) : roomInfo?.name ? (
                  roomInfo.name
                ) : (
                  `Room #${roomId}`
                )}
              </h1>
              <p className="text-gray-300">
                {roomInfo?.description || '함께 음악을 즐기는 공간'}
              </p>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 플레이어 섹션 */}
          <div className="xl:col-span-2">
            <Player 
              playlist={state.playlist}
              currentTrack={state.current_track}
              isPlaying={state.playing}
              position={state.position}
              lastUpdateTime={state.last_update_time}
              onPlay={playTrack}
              onPause={pauseTrack}
              onSeek={seekTrack}
              onNext={nextTrack}
              onPrev={prevTrack}
              setOnSyncUpdate={setOnSyncUpdate}
            />
          </div>
          
          {/* 사이드바 */}
          <div className="xl:col-span-1 space-y-6">
            <Search onAddTrack={addTrack} />
            <Playlist 
              tracks={state.playlist} 
              currentTrack={state.current_track}
              onSelectTrack={(index) => seekTrack(0, index)}
            />
          </div>
        </div>

        {/* 푸터 */}
        <footer className="text-center mt-16 pt-8 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            OpenJukebox - 모두가 함께하는 음악 경험
          </p>
        </footer>
      </div>
    </div>
  )
} 