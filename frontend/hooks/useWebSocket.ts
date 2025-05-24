import { useState, useEffect, useCallback, useRef } from 'react';

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

export const useWebSocket = () => {
  const [state, setState] = useState<AppState>(initialState);  // 앱 상태
  const [socket, setSocket] = useState<WebSocket | null>(null);  // 웹소켓 연결
  const [isConnected, setIsConnected] = useState<boolean>(false);  // 연결 상태
  
  // 🎯 useRef로 최신 콜백 참조 (무한루프 방지)
  const onSeekCallbackRef = useRef<((position: number) => void) | null>(null);
  const onPositionRequestCallbackRef = useRef<(() => void) | null>(null);

  // 웹소켓 연결 설정
  useEffect(() => {
    const socketInstance = new WebSocket(`ws://${API_BASE_URL}/ws`);

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
  }, []); // 🎯 의존성 배열에서 콜백들 제거

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
    setOnSeek,  // 새로운 함수 추가
    setOnPositionRequest  // 새로운 함수 추가
  };
};