# 네이버 스토어 판매량 분석기

이 프로젝트는 네이버 스토어의 판매량을 분석하는 웹 애플리케이션입니다. 프론트엔드와 백엔드가 분리된 구조로 구현되어 있습니다.

## 주요 기능

- 네이버 스토어 URL을 통한 판매량 데이터 수집
- 실시간 판매량 분석 (오늘/주간/반년)
- 다중 스토어 동시 분석
- 판매량 데이터 시각화

## 기술 스택

### 프론트엔드
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios

### 백엔드
- Express.js
- TypeScript
- Playwright (웹 스크래핑)
- Axios

## 프로젝트 구조

```
naver-sales-tracker/
├── frontend/          # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/      # Next.js 앱 라우터
│   │   ├── components/ # UI 컴포넌트
│   │   ├── services/  # API 서비스
│   │   ├── types/    # TypeScript 타입
│   │   └── utils/    # 유틸리티 함수
│   └── public/       # 정적 파일
└── backend/          # Express.js 백엔드
    ├── src/
    │   ├── controllers/ # 컨트롤러
    │   ├── services/   # 비즈니스 로직
    │   ├── routes/    # API 라우트
    │   ├── types/     # TypeScript 타입
    │   └── utils/     # 유틸리티 함수
    └── dist/         # 빌드 결과물
```

## 시작하기

### 필수 조건
- Node.js 18 이상
- npm 또는 yarn
- 네이버 스토어 쿠키

### 백엔드 실행

```bash
cd backend
npm install
npm run dev
```

### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

## 환경 변수 설정

### 백엔드 (.env)
```
PORT=3001
NAVER_COOKIE=your_naver_cookie_here
NODE_ENV=development
```

### 프론트엔드 (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API 엔드포인트

### 판매 데이터 조회
- `POST /api/sales`
  - 요청: `{ storeUrl: string, storeName: string }`
  - 응답: `{ storeUrl: string, storeName: string, products: Product[] }`

## 개발 가이드

### 코드 스타일
- ESLint와 Prettier를 사용한 코드 포맷팅
- TypeScript strict 모드 사용
- 컴포넌트는 함수형 컴포넌트 사용

### 커밋 메시지
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 수정
- style: 코드 포맷팅
- refactor: 코드 리팩토링
- test: 테스트 코드
- chore: 빌드 프로세스 수정

## 라이선스

MIT License 