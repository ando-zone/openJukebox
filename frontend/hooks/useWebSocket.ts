import { useState, useEffect, useCallback, useRef } from 'react';
import { Room } from '@/types/room';

// 상태와 트랙 타입 정의
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
}

// 초기 상태 (position 제거)
const initialState: AppState = {
  playlist: [],
  current_track: null,
  playing: false
};

// API 기본 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'localhost:8000';

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 룸 목록 가져오기
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://${API_BASE_URL}/api/rooms/`);
      
      if (!response.ok) {
        throw new Error('룸 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setRooms(data);
      setError(null);
    } catch (err) {
      console.error('룸 목록 조회 에러:', err);
      setError('룸 목록을 가져오는데 실패했습니다.');
      // 개발 편의를 위한 임시 데이터
      setRooms([
        { id: '1', name: '편안한 음악방', description: '차분한 음악을 즐겨요', createdAt: new Date().toISOString(), participants: 5 },
        { id: '2', name: '신나는 파티룸', description: '에너지 넘치는 음악!', createdAt: new Date().toISOString(), participants: 12 },
        { id: '3', name: '클래식 감상', description: '고전 음악 감상실', createdAt: new Date().toISOString(), participants: 3 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 룸 생성하기
  const createRoom = useCallback(async (roomData: { name: string; description?: string }) => {
    try {
      const response = await fetch(`http://${API_BASE_URL}/api/rooms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });
      
      if (!response.ok) {
        throw new Error('룸 생성에 실패했습니다.');
      }
      
      const newRoom = await response.json();
      setRooms(prev => [...prev, newRoom]);
      return newRoom;
    } catch (err) {
      console.error('룸 생성 에러:', err);
      throw err;
    }
  }, []);

  // 컴포넌트 마운트 시 룸 목록 가져오기
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    error,
    fetchRooms,
    createRoom
  };
};

export const useWebSocket = (roomId?: string) => {
  const [state, setState] = useState<AppState>(initialState);  // 앱 상태
  const [socket, setSocket] = useState<WebSocket | null>(null);  // 웹소켓 연결
  const [isConnected, setIsConnected] = useState<boolean>(false);  // 연결 상태
  
  // 🎯 useRef로 최신 콜백 참조 (무한루프 방지)
  const onSeekCallbackRef = useRef<((position: number) => void) | null>(null);
  const onPositionRequestCallbackRef = useRef<(() => void) | null>(null);

  // 웹소켓 연결 설정
  useEffect(() => {
    if (!roomId) return; // 룸 ID가 없으면 연결하지 않음
    
    // 룸 ID를 포함한 WebSocket URL
    const socketInstance = new WebSocket(`ws://${API_BASE_URL}/ws${roomId ? `?room_id=${roomId}` : ''}`);

    // 연결 이벤트
    socketInstance.onopen = () => {
      console.log('웹소켓 연결됨');
      setIsConnected(true);
    };

    // 연결 종료 이벤트
    socketInstance.onclose = () => {
      console.log('웹소켓 연결 종료');
      setIsConnected(false);
    };

    // 오류 이벤트
    socketInstance.onerror = (error) => {
      console.error('웹소켓 오류:', error);
    };

    // 메시지 수신 이벤트
    socketInstance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'state_update' && data.data) {
          setState(data.data);
        } else if (data.type === 'seek_update' && data.data) {
          // 🎯 seek 이벤트 처리 - 콜백 호출
          if (onSeekCallbackRef.current && data.data.position !== undefined) {
            onSeekCallbackRef.current(data.data.position);
          }
        } else if (data.type === 'position_request') {
          // 🎯 위치 요청 처리 - 현재 위치 공유
          if (onPositionRequestCallbackRef.current) {
            onPositionRequestCallbackRef.current();
          }
        }
      } catch (e) {
        console.error('메시지 파싱 오류:', e);
      }
    };

    // 소켓 인스턴스 저장
    setSocket(socketInstance);

    // 정리 함수
    return () => {
      socketInstance.close();
    };
  }, [roomId]); // 룸 ID가 변경될 때마다 다시 연결

  // 메시지 전송 헬퍼 함수
  const sendMessage = useCallback((type: string, payload: any = {}) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, ...payload });
      socket.send(message);
    }
  }, [socket]);

  // 트랙 추가
  const addTrack = useCallback((track: Track) => {
    sendMessage('add_track', { track });
  }, [sendMessage]);

  // 재생 시작
  const playTrack = useCallback(() => {
    sendMessage('play');
  }, [sendMessage]);

  // 일시정지
  const pauseTrack = useCallback(() => {
    sendMessage('pause');
  }, [sendMessage]);

  // 재생 위치 변경
  const seekTrack = useCallback((position: number, trackIndex?: number) => {
    if (trackIndex !== undefined) {
      sendMessage('seek', { position, current_track: trackIndex });
    } else {
      sendMessage('seek', { position });
    }
  }, [sendMessage]);

  // 다음 트랙
  const nextTrack = useCallback(() => {
    sendMessage('next_track');
  }, [sendMessage]);

  // 이전 트랙
  const prevTrack = useCallback(() => {
    sendMessage('prev_track');
  }, [sendMessage]);

  // 🎯 seek 콜백 등록 함수
  const setOnSeek = useCallback((callback: (position: number) => void) => {
    onSeekCallbackRef.current = callback;
  }, []);

  // 🎯 위치 요청 콜백 등록 함수
  const setOnPositionRequest = useCallback((callback: () => void) => {
    onPositionRequestCallbackRef.current = callback;
  }, []);

  return {
    state,
    isConnected,
    addTrack,
    playTrack,
    pauseTrack,
    seekTrack,
    nextTrack,
    prevTrack,
    setOnSeek,
    setOnPositionRequest
  };
};