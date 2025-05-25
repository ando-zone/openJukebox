'use client'

import { useState, useEffect } from 'react'
import { Music, Users, Headphones } from 'lucide-react'
import Search from '@/components/Search/SearchBar'
import Player from '@/components/Player/YouTubePlayer'
import Playlist from '@/components/Playlist/PlaylistView'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function Home() {
  const {
    state,
    addTrack,
    playTrack,
    pauseTrack,
    seekTrack,
    nextTrack,
    prevTrack,
    setOnSeek,
    setOnPositionRequest
  } = useWebSocket();

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
        <header className="text-center mb-12 fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
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
                <Music className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
              OpenJukebox
            </h1>
          </div>
          
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-md mx-auto">
            모두가 함께하는 음악 경험
          </p>
          
          {/* 상태 표시 */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="badge">
              <Users className="w-4 h-4" style={{ color: '#4ade80' }} />
              <span>연결됨</span>
            </div>
            <div className="badge">
              <Headphones className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <span>{state.playlist.length}곡 대기중</span>
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
              onPlay={playTrack}
              onPause={pauseTrack}
              onSeek={seekTrack}
              onNext={nextTrack}
              onPrev={prevTrack}
              setOnSeek={setOnSeek}
              setOnPositionRequest={setOnPositionRequest}
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