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

interface RoomInfo {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  participants: number;
}

interface AppState {
  playlist: Track[];
  current_track: number | null;
  playing: boolean;
  position?: number;  // 마스터 클라이언트로부터 받는 정확한 위치
  last_update_time?: number;  // 마지막 업데이트 시간
  volume?: number;
  room_info?: RoomInfo;  // 방 정보 추가
}

// 초기 상태
const initialState: AppState = {
  playlist: [],
  current_track: null,
  playing: false,
  position: 0,
  volume: 1.0
};

// API 기본 URL
// Next.js 클라이언트 사이드에서 사용하려면 NEXT_PUBLIC_ 접두사가 필요합니다
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 룸 목록 가져오기
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/rooms/`);
      
      if (!response.ok) {
        throw new Error('룸 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setRooms(data);
      setError(null);
    } catch (err) {
      console.error('룸 목록 조회 에러:', err);
      setError('룸 목록을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 룸 생성하기
  const createRoom = useCallback(async (roomData: { name: string; description?: string }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/`, {
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

// 개별 방 정보 가져오기 hook
export const useRoomInfo = (roomId: string) => {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomInfo = useCallback(async () => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}`);
      
      if (!response.ok) {
        throw new Error('방 정보를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setRoomInfo(data);
      setError(null);
    } catch (err) {
      console.error('방 정보 조회 에러:', err);
      setError('방 정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomInfo();
  }, [fetchRoomInfo]);

  return {
    roomInfo,
    loading,
    error,
    refetch: fetchRoomInfo
  };
};

export const useWebSocket = (roomId?: string) => {
  const [state, setState] = useState<AppState>(initialState);  // 앱 상태
  const [socket, setSocket] = useState<WebSocket | null>(null);  // 웹소켓 연결
  const [isConnected, setIsConnected] = useState<boolean>(false);  // 연결 상태
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);  // 마지막 동기화 시간
  
  // 콜백 참조 (무한루프 방지)
  const onSyncUpdateCallbackRef = useRef<((state: AppState) => void) | null>(null);
  
  // 재연결 관련 상태
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // 웹소켓 연결 함수 (의존성 최소화)
  const connectWebSocket = useCallback(() => {
    if (!roomId) return;
    
    console.log(`웹소켓 연결 시도... (방: ${roomId})`);
    
    // 룸 ID를 포함한 WebSocket URL
    const socketInstance = new WebSocket(`${WS_BASE_URL}/ws${roomId ? `?room_id=${roomId}` : ''}`);

    // 연결 이벤트
    socketInstance.onopen = () => {
      console.log(`웹소켓 연결됨 (방: ${roomId})`);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // 재연결 시도 횟수 리셋
    };

    // 연결 종료 이벤트
    socketInstance.onclose = (event) => {
      console.log('웹소켓 연결 종료', event.code, event.reason);
      setIsConnected(false);
      
      // 자동 재연결 시도 (정상 종료가 아닌 경우)
      if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // 지수 백오프
        console.log(`${delay}ms 후 재연결 시도... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connectWebSocket();
        }, delay);
      }
    };

    // 오류 이벤트
    socketInstance.onerror = (error) => {
      console.error('웹소켓 오류:', error);
    };

    // 메시지 수신 이벤트
    socketInstance.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'master_sync' && data.data) {
          // 마스터 클라이언트로부터의 동기화 업데이트 (유일한 동기화 방식)
          const masterState = data.data;
          
          // // 디버깅: 받은 상태 로깅
          // console.log('🔄 마스터 동기화 받음:', {
          //   playing: masterState.playing,
          //   position: masterState.position,
          //   current_track: masterState.current_track,
          //   timestamp: data.timestamp
          // });
          
          setState(masterState);
          setLastSyncTime(data.timestamp || Date.now());
          
          // 동기화 콜백 호출 (위치 업데이트 등을 위해)
          if (onSyncUpdateCallbackRef.current) {
            onSyncUpdateCallbackRef.current(masterState);
          }
        }
        // 이전 방식들은 모두 제거 - 마스터 클라이언트만 사용
      } catch (e) {
        console.error('메시지 파싱 오류:', e);
      }
    };

    // 소켓 인스턴스 저장
    setSocket(socketInstance);
  }, [roomId]); // roomId만 의존성으로 설정

  // 웹소켓 연결 설정
  useEffect(() => {
    connectWebSocket();
    
    // 정리 함수
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close(1000); // 정상 종료
      }
    };
  }, [connectWebSocket]); // connectWebSocket이 변경될 때마다 다시 연결

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
    console.log('▶️ 사용자가 재생 버튼 클릭');
    sendMessage('play');
  }, [sendMessage]);

  // 일시정지
  const pauseTrack = useCallback(() => {
    console.log('⏸️ 사용자가 일시정지 버튼 클릭');
    sendMessage('pause');
  }, [sendMessage]);

  // 재생 위치 변경
  const seekTrack = useCallback(async (position: number, trackIndex?: number): Promise<void> => {
    if (trackIndex !== undefined) {
      sendMessage('seek', { position, current_track: trackIndex });
    } else {
      sendMessage('seek', { position });
    }
    
    // 서버 응답을 기다리는 로직을 추가할 수 있음
    // 현재는 단순히 메시지 전송 후 Promise 반환
    return Promise.resolve();
  }, [sendMessage]);

  // 다음 트랙
  const nextTrack = useCallback(() => {
    sendMessage('next_track');
  }, [sendMessage]);

  // 이전 트랙
  const prevTrack = useCallback(() => {
    sendMessage('prev_track');
  }, [sendMessage]);

  // 동기화 요청 (필요시)
  const requestSync = useCallback(() => {
    sendMessage('sync_request');
  }, [sendMessage]);

  // 동기화 업데이트 콜백 등록 함수 (마스터 클라이언트 동기화용)
  const setOnSyncUpdate = useCallback((callback: (state: AppState) => void) => {
    onSyncUpdateCallbackRef.current = callback;
  }, []);

  // 현재 위치 계산 (클라이언트 사이드에서 실시간 계산)
  const getCurrentPosition = useCallback(() => {
    if (!state.playing || !state.position || !state.last_update_time) {
      return state.position || 0;
    }
    
    const now = Date.now() / 1000; // 초 단위로 변환
    const elapsed = now - state.last_update_time;
    return (state.position || 0) + elapsed;
  }, [state.playing, state.position, state.last_update_time]);

  return {
    state,
    isConnected,
    lastSyncTime,
    addTrack,
    playTrack,
    pauseTrack,
    seekTrack,
    nextTrack,
    prevTrack,
    requestSync,
    setOnSyncUpdate,
    getCurrentPosition
  };
};