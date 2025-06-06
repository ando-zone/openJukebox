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
  position?: number;  // 마스터 클라이언트로부터 받는 정확한 위치
  last_update_time?: number;  // 마지막 업데이트 시간
  volume?: number;
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
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);  // 마지막 동기화 시간
  
  // 콜백 참조 (무한루프 방지)
  const onSeekCallbackRef = useRef<((position: number) => void) | null>(null);
  const onSyncUpdateCallbackRef = useRef<((state: AppState) => void) | null>(null);
  
  // 재연결 관련 상태
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // 웹소켓 연결 함수 (의존성 최소화)
  const connectWebSocket = useCallback(() => {
    if (!roomId) return;
    
    console.log(`웹소켓 연결 시도... (방: ${roomId})`);
    
    // 룸 ID를 포함한 WebSocket URL
    const socketInstance = new WebSocket(`ws://${API_BASE_URL}/ws${roomId ? `?room_id=${roomId}` : ''}`);

    // 하트비트 전송 함수 (로컬 함수로 정의)
    const sendHeartbeat = () => {
      if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
        socketInstance.send(JSON.stringify({ type: 'ping' }));
      }
    };

    // 연결 이벤트
    socketInstance.onopen = () => {
      console.log(`웹소켓 연결됨 (방: ${roomId})`);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // 재연결 시도 횟수 리셋
      
      // 하트비트 시작 (30초마다)
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
    };

    // 연결 종료 이벤트
    socketInstance.onclose = (event) => {
      console.log('웹소켓 연결 종료', event.code, event.reason);
      setIsConnected(false);
      
      // 하트비트 정리
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
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
        
        // Pong 응답 처리
        if (data.type === 'pong') {
          console.log('하트비트 응답 수신');
          return;
        }
        
        if (data.type === 'state_update' && data.data) {
          // 기본 상태 업데이트 (연결 시 또는 수동 업데이트)
          setState(data.data);
          setLastSyncTime(Date.now());
        } else if (data.type === 'master_sync' && data.data) {
          // 마스터 클라이언트로부터의 동기화 업데이트
          const masterState = data.data;
          setState(masterState);
          setLastSyncTime(data.timestamp || Date.now());
          
          // 동기화 콜백 호출 (위치 업데이트 등을 위해)
          if (onSyncUpdateCallbackRef.current) {
            onSyncUpdateCallbackRef.current(masterState);
          }
        } else if (data.type === 'seek_update' && data.data) {
          // 개별 seek 이벤트 처리 (하위 호환성)
          if (onSeekCallbackRef.current && data.data.position !== undefined) {
            onSeekCallbackRef.current(data.data.position);
          }
        }
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
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
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

  // 동기화 요청 (필요시)
  const requestSync = useCallback(() => {
    sendMessage('sync_request');
  }, [sendMessage]);

  // seek 콜백 등록 함수 (하위 호환성)
  const setOnSeek = useCallback((callback: (position: number) => void) => {
    onSeekCallbackRef.current = callback;
  }, []);

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
    setOnSeek,
    setOnSyncUpdate,
    getCurrentPosition
  };
};