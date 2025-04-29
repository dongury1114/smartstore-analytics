# 네이버 스토어 판매량 분석기

이 프로젝트는 네이버 스토어의 판매량을 분석하는 웹 애플리케이션입니다.

## 프로젝트 구조

- `frontend/`: Next.js 기반의 프론트엔드 애플리케이션
- `backend/`: Express.js 기반의 백엔드 서버

## 시작하기

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
```

### 프론트엔드 (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 기술 스택

### 프론트엔드
- Next.js
- React
- TypeScript
- Tailwind CSS

### 백엔드
- Express.js
- TypeScript
- Playwright
- Axios 