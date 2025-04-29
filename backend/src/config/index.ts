import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    naverCookie: process.env.NAVER_COOKIE,
    nodeEnv: process.env.NODE_ENV || "development",
} as const;
