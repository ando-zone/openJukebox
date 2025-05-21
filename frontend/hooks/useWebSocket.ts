import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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
  position: number;
}

// 초기 상태
const initialState: AppState = {
  playlist: [],
  current_track: null,
  playing: false,
  position: 0
};

// API 기본 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useWebSocket = () => {
  // 앱 상태
  const [state, setState] = useState<AppState>(initialState);
  // 웹소켓 연결
  const [socket, setSocket] = useState<Socket | null>(null);
  // 연결 상태
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // 웹소켓 연결 설정
  useEffect(() => {
    // 웹소켓 연결 생성
    const socketInstance = io(`${API_BASE_URL}/ws`, {
      transports: ['websocket'],
      autoConnect: true
    });

    // 연결 이벤트
    socketInstance.on('connect', () => {
      console.log('웹소켓 연결됨');
      setIsConnected(true);
    });

    // 연결 종료 이벤트
    socketInstance.on('disconnect', () => {
      console.log('웹소켓 연결 종료');
      setIsConnected(false);
    });

    // 상태 업데이트 이벤트
    socketInstance.on('state_update', (data: any) => {
      console.log('상태 업데이트 수신:', data);
      if (data && data.data) {
        setState(data.data);
      }
    });

    // 소켓 인스턴스 저장
    setSocket(socketInstance);

    // 정리 함수
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // 트랙 추가
  const addTrack = useCallback((track: Track) => {
    if (socket) {
      socket.emit('add_track', { type: 'add_track', track });
    }
  }, [socket]);

  // 재생 시작
  const playTrack = useCallback(() => {
    if (socket) {
      socket.emit('play', { type: 'play' });
    }
  }, [socket]);

  // 일시정지
  const pauseTrack = useCallback(() => {
    if (socket) {
      socket.emit('pause', { type: 'pause' });
    }
  }, [socket]);

  // 재생 위치 변경
  const seekTrack = useCallback((position: number, trackIndex?: number) => {
    if (socket) {
      if (trackIndex !== undefined) {
        socket.emit('seek', { type: 'seek', position, current_track: trackIndex });
      } else {
        socket.emit('seek', { type: 'seek', position });
      }
    }
  }, [socket]);

  // 다음 트랙
  const nextTrack = useCallback(() => {
    if (socket) {
      socket.emit('next_track', { type: 'next_track' });
    }
  }, [socket]);

  // 이전 트랙
  const prevTrack = useCallback(() => {
    if (socket) {
      socket.emit('prev_track', { type: 'prev_track' });
    }
  }, [socket]);

  return {
    state,
    isConnected,
    addTrack,
    playTrack,
    pauseTrack,
    seekTrack,
    nextTrack,
    prevTrack
  };
}; 