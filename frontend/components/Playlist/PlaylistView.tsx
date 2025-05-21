'use client';

import { useMemo } from 'react';

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
  
  // 플레이리스트가 비어있는지 확인
  const isEmpty = useMemo(() => tracks.length === 0, [tracks]);
  
  // 트랙 항목 렌더링
  const renderTrackItem = (track: Track, index: number) => {
    const isActive = currentTrack === index;
    
    return (
      <div 
        key={`${track.id}-${index}`}
        className={`flex items-center p-3 cursor-pointer ${
          isActive ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-gray-100'
        }`}
        onClick={() => onSelectTrack(index)}
      >
        <div className="flex-shrink-0 mr-3">
          <img 
            src={track.thumbnail} 
            alt={track.title} 
            className="w-16 h-12 object-cover"
          />
        </div>
        <div className="flex-grow overflow-hidden">
          <h3 className="text-sm font-medium truncate">{track.title}</h3>
          <p className="text-xs text-gray-500 truncate">{track.channel}</p>
        </div>
        {isActive && (
          <div className="w-3 h-3 rounded-full bg-primary ml-2"></div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">플레이리스트</h2>
        <p className="text-xs text-gray-500">총 {tracks.length}곡</p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {isEmpty ? (
          <div className="p-6 text-center text-gray-500">
            <p>플레이리스트가 비어있습니다</p>
            <p className="text-sm mt-2">검색을 통해 곡을 추가해보세요</p>
          </div>
        ) : (
          <div className="divide-y">
            {tracks.map((track, index) => renderTrackItem(track, index))}
          </div>
        )}
      </div>
    </div>
  );
} 