'use client';

import { useState, useCallback, FormEvent } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
  publishedAt: string;
}

interface SearchProps {
  onAddTrack: (track: Track) => void;
}

const API_BASE_URL = process.env.API_BASE_URL || 'https://jukebox-backend-0s8r.onrender.com';

export default function SearchBar({ onAddTrack }: SearchProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = useCallback(async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!query.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/search`, {
        params: { q: query }
      });
      
      setSearchResults(response.data);
    } catch (err) {
      console.error('검색 오류:', err);
      setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);
  
  const handleAddTrack = (track: Track) => {
    onAddTrack(track);
  };
  
  return (
    <div className="glass-card fade-in">
      <h2 className="text-xl font-bold text-white mb-4">음악 검색</h2>
      
      {/* 검색 입력 */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="YouTube에서 음악을 검색하세요..."
          className="input-field pr-12"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-secondary p-2 rounded-lg"
          style={{ 
            background: isLoading ? '#6b7280' : 'var(--purple-600)',
            border: 'none'
          }}
        >
          <Search className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-gray-400">검색 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {searchResults.map((track) => (
            <div
              key={track.id}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all duration-200 hover-lift"
              onClick={() => handleAddTrack(track)}
            >
              <h3 className="text-white text-sm font-medium mb-1 line-clamp-2">
                {track.title}
              </h3>
              <p className="text-gray-400 text-xs">
                {track.channel}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 