'use client'

import { useState } from 'react'
import { Music, Users, Headphones } from 'lucide-react'
import { useRooms } from '@/hooks/useWebSocket'
import RoomList from '@/components/Room/RoomList'
import CreateRoomModal from '@/components/Room/CreateRoomModal'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  
  const {
    rooms,
    loading,
    error,
    createRoom,
  } = useRooms();

  const handleCreateRoom = async (data: { name: string; description?: string }) => {
    try {
      setIsCreating(true);
      const newRoom = await createRoom(data);
      setCreateModalOpen(false);
      router.push(`/room/${newRoom.id}`);
    } catch (err) {
      console.error('방 생성 에러:', err);
      // 개발 편의를 위한 임시 로직 - 실제로는 오류 처리 필요
      setCreateModalOpen(false);
      router.push(`/room/1`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 배경 장식 요소들 */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #9333ea, #ec4899)',
            filter: 'blur(60px)'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #3b82f6, #06b6d4)',
            filter: 'blur(60px)'
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* 헤더 */}
        <header className="text-center mb-12 fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-2xl opacity-75"
                style={{
                  background: 'linear-gradient(135deg, #9333ea, #ec4899)',
                  filter: 'blur(8px)'
                }}
              />
              <div 
                className="relative p-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)'
                }}
              >
                <Music className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
              OpenJukebox
            </h1>
          </div>
          
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-md mx-auto">
            모두가 함께하는 음악 경험
          </p>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="max-w-5xl mx-auto">
          <RoomList 
            rooms={rooms} 
            loading={loading} 
            onCreateRoom={() => setCreateModalOpen(true)} 
          />
        </div>

        {/* 푸터 */}
        <footer className="text-center mt-16 pt-8 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            OpenJukebox - 모두가 함께하는 음악 경험
          </p>
        </footer>
      </div>

      {/* 방 생성 모달 */}
      <CreateRoomModal 
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        loading={isCreating}
      />
    </div>
  )
} 