import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (data: { name: string; description?: string }) => void;
  loading?: boolean;
}

export default function CreateRoomModal({ 
  isOpen, 
  onClose, 
  onCreateRoom,
  loading = false
}: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('방 이름을 입력해주세요.');
      return;
    }
    
    onCreateRoom({ name, description });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div 
        className="bg-gray-900 rounded-2xl w-full max-w-md p-6 relative"
        style={{
          boxShadow: '0 0 20px rgba(163, 81, 244, 0.15)'
        }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">새 방 만들기</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-300 mb-1">
              방 이름 <span className="text-pink-500">*</span>
            </label>
            <input
              id="roomName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="방 이름을 입력하세요"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={50}
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="roomDescription" className="block text-sm font-medium text-gray-300 mb-1">
              방 설명 <span className="text-gray-500">(선택사항)</span>
            </label>
            <textarea
              id="roomDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="방에 대한 설명을 입력하세요"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>
          
          {error && (
            <div className="mb-4 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>생성 중...</span>
                </div>
              ) : (
                '방 만들기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 