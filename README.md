## **아키텍처 개요**

### **백엔드 (FastAPI)**

- **WebSocket 서버**: 실시간 상태 동기화를 위한 핵심 구성 요소
- **YouTube Data API 연동**: 검색 및 동영상 정보 조회 기능 제공
- **상태 관리**: 현재 재생 중인 곡, 플레이리스트, 재생 위치 등 관리

### **프론트엔드 (Next.js)**

- **UI 컴포넌트**: 검색, 플레이리스트, 유튜브 플레이어
- **WebSocket 클라이언트**: 백엔드와 실시간 통신 처리
- **상태 동기화**: 모든 사용자 간의 재생 상태 동기화

## **중요 구현 요소**

### **1. WebSocket 연결**

모든 사용자가 동일한 재생 상태를 공유하기 위해 WebSocket을 사용하여 실시간 양방향 통신을 구현했습니다.

### **2. 상태 동기화 메커니즘**

- 새 사용자 연결 시 현재 상태 전송
- 상태 변경(재생/일시정지/탐색) 시 모든 클라이언트에 브로드캐스트
- 클라이언트에서 주기적으로 재생 위치 업데이트

### **3. YouTube API 활용**

- 검색 기능: 사용자가 트랙 검색 가능
- 동영상 정보 조회: 플레이리스트 표시 및 재생에 필요한 정보 제공

## **디렉토리 구조**

openJukebox/
├── backend/
│   ├── app/
│   │   ├── api/            # API 엔드포인트
│   │   ├── services/       # 서비스 로직(YouTube API)
│   │   └── websockets/     # WebSocket 처리
│   ├── config.py           # 환경 설정
│   ├── main.py             # FastAPI 앱 진입점
│   └── requirements.txt    # 의존성 패키지
│
└── frontend/
    ├── app/                # Next.js 페이지
    ├── components/         # React 컴포넌트
    │   ├── Player/         # 유튜브 플레이어
    │   ├── Playlist/       # 플레이리스트 뷰
    │   └── Search/         # 검색 컴포넌트
    ├── hooks/              # 커스텀 React 훅
    └── package.json        # 의존성 패키지