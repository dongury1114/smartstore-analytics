export const API_CONFIG = {
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", // 개발 환경 기본값
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
} as const;

export const getApiUrl = () => API_CONFIG.baseURL;
