'use client';

import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
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
  onAddTrack: (track: Track) => void;  // 트랙 추가 함수
}

// API 기본 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SearchBar({ onAddTrack }: SearchProps) {
  // 검색어 상태
  const [query, setQuery] = useState('');
  // 검색 결과 상태
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  // 오류 상태
  const [error, setError] = useState<string | null>(null);
  
  // 검색 실행 함수
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
  
  // 검색어 변경 핸들러
  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };
  
  // 트랙 추가 핸들러
  const handleAddTrack = (track: Track) => {
    onAddTrack(track);
    // 선택적으로 검색 결과 초기화
    // setSearchResults([]);
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">곡 검색</h2>
      
      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex">
          <input
            type="text"
            placeholder="곡 제목, 아티스트 검색..."
            className="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-primary"
            value={query}
            onChange={handleQueryChange}
          />
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded-r hover:bg-primary-dark"
            disabled={isLoading}
          >
            {isLoading ? '검색 중...' : '검색'}
          </button>
        </div>
      </form>
      
      {/* 오류 메시지 */}
      {error && (
        <div className="text-red-500 mb-4 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}
      
      {/* 검색 결과 목록 */}
      {searchResults.length > 0 && (
        <div className="max-h-80 overflow-y-auto border rounded divide-y">
          {searchResults.map((track) => (
            <div 
              key={track.id}
              className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleAddTrack(track)}
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
              <button
                className="ml-2 p-1 text-xs text-white bg-primary rounded hover:bg-primary-dark"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTrack(track);
                }}
              >
                추가
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* 검색 결과 없음 */}
      {query && !isLoading && searchResults.length === 0 && !error && (
        <div className="text-center p-4 text-gray-500">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
} 