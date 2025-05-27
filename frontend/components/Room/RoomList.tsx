import { useState } from 'react';
import { Users, PlusCircle, Clock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Room } from '@/types/room';

interface RoomListProps {
  rooms: Room[];
  loading: boolean;
  onCreateRoom: () => void;
}

export default function RoomList({ rooms, loading, onCreateRoom }: RoomListProps) {
  const router = useRouter();

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin w-12 h-12 mx-auto mb-4 border-4 border-t-purple-500 border-opacity-50 rounded-full"></div>
        <p className="text-gray-300">방 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">현재 방 목록</h2>
        <button 
          onClick={onCreateRoom}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-5 h-5" />
          <span>방 만들기</span>
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <Info className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-medium text-white mb-2">방이 없습니다</h3>
          <p className="text-gray-400 mb-6">새로운 방을 만들어 음악을 공유해보세요!</p>
          <button
            onClick={onCreateRoom}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-5 h-5" />
            <span>방 만들기</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div 
              key={room.id} 
              className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => handleJoinRoom(room.id)}
            >
              <h3 className="text-xl font-medium text-white mb-2 truncate">{room.name}</h3>
              {room.description && (
                <p className="text-gray-400 mb-4 text-sm line-clamp-2">{room.description}</p>
              )}
              <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{room.participants}명</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(room.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 