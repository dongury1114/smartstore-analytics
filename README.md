# 네이버 스토어 판매량 분석기 (Naver Store Analytics)

네이버 스토어의 상품 판매량을 분석하고 모니터링하는 웹 애플리케이션입니다.

## 주요 기능

- 🔐 사용자 인증 (로그인/로그아웃)
- 📊 스토어별 판매량 분석
- 📈 일간/주간/반년 판매량 추적
- 🔍 상품별 상세 판매 정보 조회
- 📱 반응형 디자인

## 기술 스택

- **프론트엔드**
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - NextAuth.js

- **백엔드**
  - MongoDB Atlas
  - Mongoose
  - JWT 인증

## 시작하기

### 필수 조건

- Node.js 18.0.0 이상
- MongoDB Atlas 계정
- npm 또는 yarn

### 설치

1. 저장소 클론
```bash
git clone https://github.com/your-username/naver-store-analytics.git
cd naver-store-analytics
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 변수들을 설정합니다:
```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. 개발 서버 실행
```bash
npm run dev
```

5. 브라우저에서 확인
```
http://localhost:3000
```

## 프로젝트 구조

```
src/
├── app/              # Next.js 앱 라우터
├── components/       # 재사용 가능한 컴포넌트
│   ├── common/      # 공통 컴포넌트
│   └── layout/      # 레이아웃 컴포넌트
├── features/        # 기능별 모듈
│   └── auth/        # 인증 관련 기능
├── lib/            # 유틸리티 함수
├── models/         # MongoDB 모델
└── types/          # TypeScript 타입 정의
```

## 보안

- 비밀번호는 bcrypt로 해싱되어 저장됩니다.
- JWT 토큰을 사용한 안전한 인증
- 환경 변수를 통한 민감 정보 보호

## 라이선스

MIT License