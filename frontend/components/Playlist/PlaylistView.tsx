'use client';

import { useMemo } from 'react';
import { Music, Play } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
  publishedAt: string;
}

interface PlaylistProps {
  tracks: Track[];
  currentTrack: number | null;
  onSelectTrack: (index: number) => void;
}

export default function PlaylistView({
  tracks,
  currentTrack,
  onSelectTrack
}: PlaylistProps) {
  
  const isEmpty = useMemo(() => tracks.length === 0, [tracks]);
  
  return (
    <div className="glass-card fade-in">
      <h2 className="text-xl font-bold text-white mb-4">플레이리스트</h2>
      
      {isEmpty ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(147, 51, 234, 0.1)' }}>
            <Music className="w-8 h-8" style={{ color: '#9333ea' }} />
          </div>
          <h3 className="text-white font-medium mb-2">플레이리스트가 비어있습니다</h3>
          <p className="text-gray-400 text-sm">검색을 통해 좋아하는 음악을 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tracks.map((track, index) => {
            const isActive = currentTrack === index;
            
            return (
              <div
                key={`${track.id}-${index}`}
                className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 hover-lift ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20'
                }`}
                onClick={() => onSelectTrack(index)}
              >
                {/* 트랙 번호 또는 재생 아이콘 */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
                      <Play className="w-3 h-3 text-white ml-0.5" />
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm font-medium group-hover:text-white transition-colors">
                      {index + 1}
                    </span>
                  )}
                </div>
                
                {/* 썸네일 */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <img 
                      src={track.thumbnail} 
                      alt={track.title} 
                      className="w-12 h-9 object-cover rounded-lg"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 트랙 정보 */}
                <div className="flex-grow min-w-0">
                  <h3 className={`text-sm font-medium mb-1 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-200 group-hover:text-white'
                  }`}
                      style={{
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 1
                      }}>
                    {track.title}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    {track.channel}
                  </p>
                </div>
                
                {/* 재생 시간 */}
                {track.duration && (
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {track.duration}
                    </span>
                  </div>
                )}
                
                {/* 현재 재생 중 표시 */}
                {isActive && (
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-3 rounded-full animate-pulse" 
                           style={{ background: '#9333ea' }}></div>
                      <div className="w-1 h-4 rounded-full animate-pulse" 
                           style={{ background: '#ec4899', animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-2 rounded-full animate-pulse" 
                           style={{ background: '#9333ea', animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 