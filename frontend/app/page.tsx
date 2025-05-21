'use client'

import { useState, useEffect } from 'react'
import Search from '@/components/Search/SearchBar'
import Player from '@/components/Player/YouTubePlayer'
import Playlist from '@/components/Playlist/PlaylistView'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function Home() {
  // 웹소켓 연결 및 상태 관리
  const { 
    state, 
    addTrack, 
    playTrack, 
    pauseTrack, 
    seekTrack, 
    nextTrack, 
    prevTrack 
  } = useWebSocket();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">OpenJukebox</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 재생기 */}
        <div className="lg:col-span-2">
          <Player 
            playlist={state.playlist}
            currentTrack={state.currentTrack}
            isPlaying={state.playing}
            position={state.position}
            onPlay={playTrack}
            onPause={pauseTrack}
            onSeek={seekTrack}
            onNext={nextTrack}
            onPrev={prevTrack}
          />
        </div>
        
        {/* 검색 및 플레이리스트 */}
        <div className="space-y-6">
          <Search onAddTrack={addTrack} />
          <Playlist 
            tracks={state.playlist} 
            currentTrack={state.currentTrack}
            onSelectTrack={(index) => seekTrack(0, index)}
          />
        </div>
      </div>
    </div>
  )
} 